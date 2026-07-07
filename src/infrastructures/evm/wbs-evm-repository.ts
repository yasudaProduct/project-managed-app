import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import prisma from '@/lib/prisma/prisma';
import {
  IWbsEvmRepository,
  WbsEvmData,
  BufferData,
  ProjectSettingsData,
  TaskProgressSnapshotRecord,
  EditableProgressSnapshot,
} from '@/applications/evm/iwbs-evm-repository';
import type { IWbsQueryRepository } from '@/applications/wbs/query/iwbs-query-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { EvmCalculationMode } from '@/domains/evm/evm-metrics';
import { DEFAULT_COST_PER_HOUR } from '@/domains/evm/evm-constants';
import { TaskStatus } from '@/types/wbs';

@injectable()
export class WbsEvmRepository implements IWbsEvmRepository {
  constructor(
    @inject(SYMBOL.IWbsQueryRepository)
    private wbsQueryRepository: IWbsQueryRepository
  ) { }

  async getWbsEvmData(wbsId: number): Promise<WbsEvmData> {
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
      // 基準（KIJUN）未設定タスク（画面からの作成等）は予定をベースラインとして扱う。
      // 基準0のままだとBAC・PV_BASEから漏れ、EV > BACとなってEAC/VAC/完了率が破綻するため。
      const baseManHours = task.kijunKosu ?? task.yoteiKosu ?? 0;
      const plannedManHours = task.yoteiKosu ?? task.kijunKosu ?? 0;
      const actualManHours = task.jissekiKosu ?? 0;

      const plannedStartDate = task.yoteiStart ?? task.kijunStart ?? new Date();
      const plannedEndDate = task.yoteiEnd ?? task.kijunEnd ?? new Date();
      const baseStartDate = task.kijunStart ?? plannedStartDate;
      const baseEndDate = task.kijunEnd ?? plannedEndDate;

      // WbsAssigneeからcostPerHourを取得
      // task.assignee.idはユーザーIDなので、WbsAssigneeから検索
      let costPerHour = DEFAULT_COST_PER_HOUR;
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
        task.no, // taskNo
        task.name, // taskName
        baseStartDate,
        baseEndDate,
        plannedStartDate,
        plannedEndDate,
        task.jissekiStart ?? null,
        task.jissekiEnd ?? null,
        baseManHours,
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

    const totalBaseManHours = tasks.reduce(
      (sum, task) => sum + task.baseManHours,
      0
    );

    return {
      wbsId: wbs.id,
      projectId: wbs.projectId,
      projectName: wbs.project.name,
      totalPlannedManHours,
      totalBaseManHours,
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
      evmForecastMethod: settings.evmForecastMethod,
    };
  }

  async getTasksEvmData(wbsId: number): Promise<TaskEvmData[]> {
    const wbsData = await this.getWbsEvmData(wbsId);
    return wbsData.tasks;
  }

  async getActualCostByDate(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    calculationMode: EvmCalculationMode = 'hours'
  ): Promise<Map<string, number>> {
    const workRecords = await prisma.workRecord.findMany({
      where: {
        // AC（実績コスト）はworkRecordという不変事実の集計。タスクがsoft-delete
        // されても実績は消えないため、isDeletedで絞らずWBS配下の実績を全て対象にする。
        // タスクに紐付かない実績（Geppo未マッチ、全量置換同期によるtaskIdのSetNull後）も
        // wbsId直接紐付けで拾い、ACから消えないようにする。
        OR: [
          { task: { wbsId } },
          { wbsId },
        ],
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // コスト単価は「実績を記録したユーザー」のWBS単価を使う（不変な実績コストの基準）。
    // タスクの現担当者に依存させると、担当者変更/クリアで過去ACが遡及して変わるため。
    let rateByUserId = new Map<string, number>();
    if (calculationMode === 'cost') {
      const assignees = await prisma.wbsAssignee.findMany({ where: { wbsId } });
      rateByUserId = new Map(assignees.map((a) => [a.assigneeId, a.costPerHour]));
    }

    const costMap = new Map<string, number>();

    workRecords.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      const currentCost = costMap.get(dateKey) || 0;

      // 計算モードに応じて工数または金額を加算
      const cost =
        calculationMode === 'cost'
          ? Number(record.hours_worked) * (rateByUserId.get(record.userId) ?? DEFAULT_COST_PER_HOUR)
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

  async getProgressSnapshots(
    wbsId: number,
    toDate: Date
  ): Promise<TaskProgressSnapshotRecord[]> {
    const rows = await prisma.taskProgressSnapshot.findMany({
      where: { wbsId, snapshotAt: { lte: toDate } },
      orderBy: [{ taskId: 'asc' }, { snapshotAt: 'asc' }],
    });

    return rows.map((r) => ({
      taskId: r.taskId,
      taskNo: r.taskNo,
      snapshotAt: r.snapshotAt,
      progressRate: r.progressRate !== null ? Number(r.progressRate) : null,
      status: r.status,
      plannedManHours: Number(r.plannedManHours),
      baseManHours: Number(r.baseManHours),
      costPerHour: Number(r.costPerHour),
      plannedStart: r.plannedStart,
      plannedEnd: r.plannedEnd,
      baseStart: r.baseStart,
      baseEnd: r.baseEnd,
      actualStart: r.actualStart,
      actualEnd: r.actualEnd,
      isRemoved: r.isRemoved,
    }));
  }

  async getEditableProgressSnapshots(
    wbsId: number
  ): Promise<EditableProgressSnapshot[]> {
    // 編集対象は有効タスクのスナップショットのみ（tombstone は除外）。
    const rows = await prisma.taskProgressSnapshot.findMany({
      where: { wbsId, isRemoved: false },
      orderBy: [{ taskNo: 'asc' }, { snapshotAt: 'asc' }],
    });

    // タスク名は WbsTask から taskId → name で解決（snapshot.taskId は wbsTask.id を参照）。
    const tasks = await prisma.wbsTask.findMany({
      where: { wbsId },
      select: { id: true, name: true },
    });
    const nameByTaskId = new Map(tasks.map((t) => [t.id, t.name]));

    return rows.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      taskNo: r.taskNo,
      taskName: nameByTaskId.get(r.taskId) ?? r.taskNo,
      snapshotAt: r.snapshotAt,
      progressRate: r.progressRate !== null ? Number(r.progressRate) : null,
      status: r.status,
      syncLogId: r.syncLogId,
    }));
  }

  async updateProgressSnapshot(
    id: number,
    progressRate: number | null,
    status: TaskStatus
  ): Promise<void> {
    // 訂正対象は progressRate / status のみ。他カラム（工数・単価・日付・isRemoved）には触れない。
    await prisma.taskProgressSnapshot.update({
      where: { id },
      data: { progressRate, status },
    });
  }
}
