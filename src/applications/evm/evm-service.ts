import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IWbsEvmRepository, WbsEvmData } from './iwbs-evm-repository';
import { EvmMetrics, EvmCalculationMode } from '@/domains/evm/evm-metrics';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { ProgressMeasurementMethod } from '@prisma/client';
import type { EvmForecastMethod } from '@/types/evm-forecast-method';

@injectable()
export class EvmService {
  constructor(
    @inject(SYMBOL.IWbsEvmRepository)
    private wbsEvmRepository: IWbsEvmRepository
  ) { }

  /**
   * 現在のEVMメトリクスを計算
   * @param wbsId WBS ID
   * @param evaluationDate 評価日
   * @param calculationMode 計算モード
   * @param progressMethod 進捗率測定方法
   * @returns EVMメトリクス
   */
  async calculateCurrentEvmMetrics(
    wbsId: number,
    evaluationDate: Date = new Date(),
    calculationMode: EvmCalculationMode = 'hours',
    progressMethod?: ProgressMeasurementMethod,
    forecastMethod?: EvmForecastMethod
  ): Promise<EvmMetrics> {
    const wbsData = await this.wbsEvmRepository.getWbsEvmData(wbsId, evaluationDate);

    const method =
      progressMethod ?? wbsData.settings?.progressMeasurementMethod ?? 'SELF_REPORTED';
    const fMethod =
      forecastMethod ?? wbsData.settings?.evmForecastMethod ?? 'CPI_ONLY';

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

    return this.computeMetricsFromData(wbsData, evaluationDate, ac, calculationMode, method, fMethod, false, evaluationDate);
  }

  /**
   * EVM時系列データを取得
   * WBSデータと作業記録を1回だけ取得し、各日付のメトリクスをメモリ上で計算する。
   */
  async getEvmTimeSeries(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'weekly',
    calculationMode: EvmCalculationMode = 'hours',
    progressMethod?: ProgressMeasurementMethod,
    includePrediction: boolean = false,
    forecastMethod?: EvmForecastMethod
  ): Promise<EvmMetrics[]> {
    const dates = this.generateDateRange(startDate, endDate, interval);
    const now = new Date();

    // (1) WBSデータを1回だけ取得（日付に依存しない）
    const wbsData = await this.wbsEvmRepository.getWbsEvmData(wbsId, now);
    const method =
      progressMethod ?? wbsData.settings?.progressMeasurementMethod ?? 'SELF_REPORTED';
    const fMethod =
      forecastMethod ?? wbsData.settings?.evmForecastMethod ?? 'CPI_ONLY';

    // (2) 全期間のWorkRecordsを1回だけ取得
    const taskStartDate = wbsData.tasks[0]?.plannedStartDate || new Date();
    const actualCostMap = await this.wbsEvmRepository.getActualCostByDate(
      wbsId,
      taskStartDate,
      endDate,
      calculationMode
    );

    // (3) 累積ACをソート済み配列から計算するヘルパー
    const sortedCostEntries = Array.from(actualCostMap.entries())
      .sort(([a], [b]) => a.localeCompare(b));
    const computeCumulativeAc = (evalDate: Date): number => {
      const evalKey = evalDate.toISOString().split('T')[0];
      let cumulative = 0;
      for (const [dateKey, cost] of sortedCostEntries) {
        if (dateKey <= evalKey) cumulative += cost;
        else break;
      }
      return cumulative;
    };

    // (4) 予測モード用の現在メトリクスを計算（DBアクセスなし）
    let currentMetrics: EvmMetrics | null = null;
    if (includePrediction) {
      currentMetrics = this.computeMetricsFromData(
        wbsData, now, computeCumulativeAc(now), calculationMode, method, fMethod, false, now
      );
    }

    // (5) 各日付のメトリクスをインメモリで計算
    return dates.map((date) => {
      if (includePrediction && date > now && currentMetrics) {
        const baseMetric = this.computeMetricsFromData(
          wbsData, date, computeCumulativeAc(date), calculationMode, method, fMethod, false, now
        );

        const spi = currentMetrics.spi;
        const pvIncrement = Math.max(0, baseMetric.pv - currentMetrics.pv);
        const predictedEvIncrement = pvIncrement * spi;
        const predictedEv = Math.min(
          currentMetrics.bac,
          currentMetrics.ev + predictedEvIncrement
        );

        const cpi = currentMetrics.cpi;
        const effectiveCpi = cpi === 0 ? 1 : cpi;
        const evIncrement = Math.max(0, predictedEv - currentMetrics.ev);
        const predictedAc = currentMetrics.ac + (evIncrement / effectiveCpi);

        return EvmMetrics.create({
          date,
          pv_base: baseMetric.pv_base,
          pv: baseMetric.pv,
          ev: predictedEv,
          ac: predictedAc,
          bac: baseMetric.bac,
          calculationMode,
          progressMethod: method,
          forecastMethod: fMethod,
          isPredicted: true,
        });
      }

      return this.computeMetricsFromData(
        wbsData, date, computeCumulativeAc(date), calculationMode, method, fMethod, false, now
      );
    });
  }

  /**
   * 事前取得済みデータからEVMメトリクスを計算する（DBアクセスなし）
   */
  private computeMetricsFromData(
    wbsData: WbsEvmData,
    evaluationDate: Date,
    ac: number,
    calculationMode: EvmCalculationMode,
    progressMethod: ProgressMeasurementMethod,
    forecastMethod: EvmForecastMethod,
    isPredicted: boolean = false,
    referenceDate: Date = evaluationDate,
  ): EvmMetrics {
    const pv_base = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getPlannedValueAtDate('BASE', evaluationDate, calculationMode, progressMethod);
    }, 0);

    const pv = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getPlannedValueAtDate('YOTEI', evaluationDate, calculationMode, progressMethod);
    }, 0);

    const ev = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getEarnedValue(evaluationDate, calculationMode, progressMethod, referenceDate);
    }, 0);

    const bac =
      calculationMode === 'cost'
        ? wbsData.tasks.reduce(
          (sum, task) => sum + task.baseManHours * task.costPerHour,
          0
        ) + wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0)
        : wbsData.totalBaseManHours +
        wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0);

    return EvmMetrics.create({
      date: evaluationDate,
      pv_base,
      pv,
      ev,
      ac,
      bac,
      calculationMode,
      progressMethod,
      forecastMethod,
      isPredicted,
    });
  }

  async getTaskEvmDetails(wbsId: number): Promise<TaskEvmData[]> {
    return this.wbsEvmRepository.getTasksEvmData(wbsId);
  }

  // ヘルスステータス判定
  getHealthStatus(metrics: EvmMetrics): 'healthy' | 'warning' | 'critical' {
    return metrics.healthStatus;
  }

  /**
   * 日付範囲を生成
   * @param startDate 開始日
   * @param endDate 終了日
   * @param interval 間隔
   * @returns 日付範囲
   */
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
