import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import prisma from '@/lib/prisma/prisma';
import {
  IWbsEvmRepository,
  WbsEvmData,
  BufferData,
  ProjectSettingsData,
} from '@/applications/evm/iwbs-evm-repository';
import type { IWbsQueryRepository } from '@/applications/wbs/query/wbs-query-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { EvmMetrics, EvmCalculationMode } from '@/domains/evm/evm-metrics';
import { TaskStatus } from '@prisma/client';

@injectable()
export class WbsEvmRepository implements IWbsEvmRepository {
  constructor(
    @inject(SYMBOL.IWbsQueryRepository)
    private wbsQueryRepository: IWbsQueryRepository
  ) { }

  async getWbsEvmData(wbsId: number, evaluationDate: Date): Promise<WbsEvmData> {
    // WbsQueryRepositoryを活用してタスクデータを取得
    const wbsTasksData = await this.wbsQueryRepository.getWbsTasks(wbsId);

    // WBS基本情報の取得
    const wbs = await prisma.wbs.findUnique({
      where: { id: wbsId },
      include: {
        project: true,
        assignees: true, // costPerHour取得のため
      },
    });

    if (!wbs) {
      throw new Error(`WBS not found: ${wbsId}`);
    }

    // TaskEvmDataに変換
    const tasks = wbsTasksData.map((task) => {
      const plannedManHours = task.yoteiKosu ?? task.kijunKosu ?? 0;
      const actualManHours = task.jissekiKosu ?? 0;

      // WbsAssigneeからcostPerHourを取得
      // task.assignee.idはユーザーIDなので、WbsAssigneeから検索
      let costPerHour = 5000; // デフォルト値
      if (task.assignee?.id) {
        const wbsAssignee = wbs.assignees.find(
          (a) => a.assigneeId === task.assignee?.id
        );
        if (wbsAssignee) {
          costPerHour = wbsAssignee.costPerHour;
        }
      }

      return new TaskEvmData(
        Number(task.id),
        task.name, // taskNo
        task.name, // taskName
        task.yoteiStart ?? task.kijunStart ?? new Date(),
        task.yoteiEnd ?? task.kijunEnd ?? new Date(),
        task.jissekiStart ?? null,
        task.jissekiEnd ?? null,
        plannedManHours,
        actualManHours,
        task.status as TaskStatus,
        task.progressRate ?? 0,
        costPerHour,
        task.progressRate // 自己申告進捗率
      );
    });

    // バッファ情報の取得
    const buffers = await this.getBuffers(wbsId);

    // プロジェクト設定の取得
    const settings = await this.getProjectSettings(wbs.projectId);

    const totalPlannedManHours = tasks.reduce(
      (sum, task) => sum + task.plannedManHours,
      0
    );

    return {
      wbsId: wbs.id,
      projectId: wbs.projectId,
      projectName: wbs.project.name,
      totalPlannedManHours,
      tasks,
      buffers,
      settings,
    };
  }

  async getBuffers(wbsId: number): Promise<BufferData[]> {
    const buffers = await prisma.wbsBuffer.findMany({
      where: { wbsId },
    });

    return buffers.map((buffer) => ({
      id: buffer.id,
      name: buffer.name,
      bufferHours: buffer.buffer,
      bufferType: buffer.bufferType,
    }));
  }

  async getProjectSettings(projectId: string): Promise<ProjectSettingsData | null> {
    const settings = await prisma.projectSettings.findUnique({
      where: { projectId },
    });

    if (!settings) return null;

    return {
      projectId: settings.projectId,
      progressMeasurementMethod: settings.progressMeasurementMethod,
      forecastCalculationMethod: settings.forecastCalculationMethod,
    };
  }

  async getTasksEvmData(wbsId: number): Promise<TaskEvmData[]> {
    const wbsData = await this.getWbsEvmData(wbsId, new Date());
    return wbsData.tasks;
  }

  async getEvmHistory(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): Promise<EvmMetrics[]> {
    const dates = this.generateDateRange(startDate, endDate, interval);
    const metrics: EvmMetrics[] = [];

    for (const date of dates) {
      const wbsData = await this.getWbsEvmData(wbsId, date);

      // 各日付でのPV, EV, AC計算（基本計算のみ、詳細はEvmServiceで行う）
      const pv = wbsData.tasks.reduce(
        (sum, task) => sum + task.getPlannedValueAtDate(date, 'hours'),
        0
      );

      const ev = wbsData.tasks.reduce(
        (sum, task) => sum + task.earnedValue,
        0
      );

      const actualCostMap = await this.getActualCostByDate(
        wbsId,
        wbsData.tasks[0]?.plannedStartDate || startDate,
        date,
        'hours'
      );
      const ac = Array.from(actualCostMap.values()).reduce(
        (sum, cost) => sum + cost,
        0
      );

      const bac =
        wbsData.totalPlannedManHours +
        wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0);

      metrics.push(
        EvmMetrics.create({
          date,
          pv,
          ev,
          ac,
          bac,
        })
      );
    }

    return metrics;
  }

  async getActualCostByDate(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    calculationMode: EvmCalculationMode = 'hours'
  ): Promise<Map<string, number>> {
    const workRecords = await prisma.workRecord.findMany({
      where: {
        task: {
          wbsId: wbsId,
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        task: {
          include: {
            assignee: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const costMap = new Map<string, number>();

    workRecords.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      const currentCost = costMap.get(dateKey) || 0;

      // 計算モードに応じて工数または金額を加算
      const cost =
        calculationMode === 'cost'
          ? Number(record.hours_worked) *
          (record.task.assignee?.costPerHour || 5000)
          : Number(record.hours_worked);

      costMap.set(dateKey, currentCost + cost);
    });

    return costMap;
  }

  private generateDateRange(
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));

      switch (interval) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return dates;
  }
}
