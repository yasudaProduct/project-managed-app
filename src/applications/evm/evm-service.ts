import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { IWbsEvmRepository } from './iwbs-evm-repository';
import { EvmMetrics, EvmCalculationMode } from '@/domains/evm/evm-metrics';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { ProgressMeasurementMethod } from '@prisma/client';

@injectable()
export class EvmService {
  constructor(
    @inject(SYMBOL.IWbsEvmRepository)
    private wbsEvmRepository: IWbsEvmRepository
  ) {}

  async calculateCurrentEvmMetrics(
    wbsId: number,
    evaluationDate: Date = new Date(),
    calculationMode: EvmCalculationMode = 'hours',
    progressMethod?: ProgressMeasurementMethod
  ): Promise<EvmMetrics> {
    const wbsData = await this.wbsEvmRepository.getWbsEvmData(wbsId, evaluationDate);

    // プロジェクト設定から進捗率測定方法を取得（引数で指定されていなければ）
    const method =
      progressMethod ?? wbsData.settings?.progressMeasurementMethod ?? 'SELF_REPORTED';

    // PV計算: 評価日までの計画値
    const pv = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getPlannedValueAtDate(evaluationDate, calculationMode);
    }, 0);

    // EV計算: 完了した作業の出来高
    const ev = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getEarnedValue(calculationMode, method);
    }, 0);

    // AC計算: 実際の投入コスト
    const actualCostMap = await this.wbsEvmRepository.getActualCostByDate(
      wbsId,
      wbsData.tasks[0]?.plannedStartDate || new Date(),
      evaluationDate,
      calculationMode
    );

    const ac = Array.from(actualCostMap.values()).reduce(
      (sum, cost) => sum + cost,
      0
    );

    // BAC計算: 完了時の予算
    const bac =
      calculationMode === 'cost'
        ? wbsData.tasks.reduce(
            (sum, task) => sum + task.plannedManHours * task.costPerHour,
            0
          ) + wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0)
        : wbsData.totalPlannedManHours +
          wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0);

    return EvmMetrics.create({
      date: evaluationDate,
      pv,
      ev,
      ac,
      bac,
      calculationMode,
      progressMethod: method,
    });
  }

  async getEvmTimeSeries(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'weekly',
    calculationMode: EvmCalculationMode = 'hours',
    progressMethod?: ProgressMeasurementMethod
  ): Promise<EvmMetrics[]> {
    // 第1フェーズ：推測ベースの履歴計算
    // 各日付でcalculateCurrentEvmMetricsを呼び出す
    const dates = this.generateDateRange(startDate, endDate, interval);
    const metrics: EvmMetrics[] = [];

    for (const date of dates) {
      const metric = await this.calculateCurrentEvmMetrics(
        wbsId,
        date,
        calculationMode,
        progressMethod
      );
      metrics.push(metric);
    }

    return metrics;
  }

  async getTaskEvmDetails(wbsId: number): Promise<TaskEvmData[]> {
    return this.wbsEvmRepository.getTasksEvmData(wbsId);
  }

  // ヘルスステータス判定
  getHealthStatus(metrics: EvmMetrics): 'healthy' | 'warning' | 'critical' {
    return metrics.healthStatus;
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
