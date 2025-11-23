import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IWbsEvmRepository } from './iwbs-evm-repository';
import { EvmMetrics, EvmCalculationMode } from '@/domains/evm/evm-metrics';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { ProgressMeasurementMethod } from '@prisma/client';

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
    progressMethod?: ProgressMeasurementMethod
  ): Promise<EvmMetrics> {
    const wbsData = await this.wbsEvmRepository.getWbsEvmData(wbsId, evaluationDate);

    // プロジェクト設定から進捗率測定方法を取得（引数で指定されていなければ）
    const method =
      progressMethod ?? wbsData.settings?.progressMeasurementMethod ?? 'SELF_REPORTED';

    // PV_BASE計算: 基準計画価値（WBS全体の計画工数合計）
    const pv_base = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getPlannedValueAtDate('BASE', evaluationDate, calculationMode, method);
    }, 0);

    // PV計算: 評価日までの計画値
    const pv = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getPlannedValueAtDate('YOTEI', evaluationDate, calculationMode, method);
    }, 0);

    // EV計算: 完了した作業の出来高
    const ev = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getEarnedValue(evaluationDate, calculationMode, method);
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
      pv_base: pv_base,
      pv,
      ev,
      ac,
      bac,
      calculationMode,
      progressMethod: method,
    });
  }

  /**
   * EVM時系列データを取得
   * @param wbsId WBS ID
   * @param startDate 開始日
   * @param endDate 終了日
   * @param interval 間隔
   * @param calculationMode 計算モード
   * @param progressMethod 進捗率測定方法
   * @returns EVM時系列データ
   */
  async getEvmTimeSeries(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'weekly',
    calculationMode: EvmCalculationMode = 'hours',
    progressMethod?: ProgressMeasurementMethod,
    includePrediction: boolean = false
  ): Promise<EvmMetrics[]> {
    const dates = this.generateDateRange(startDate, endDate, interval);
    const metrics: EvmMetrics[] = [];
    const now = new Date();

    // 予測計算用の現在時点メトリクスを取得
    let currentMetrics: EvmMetrics | null = null;
    if (includePrediction) {
      currentMetrics = await this.calculateCurrentEvmMetrics(
        wbsId,
        now,
        calculationMode,
        progressMethod
      );
    }

    const metricPromises = dates.map(async (date) => {
      // 未来日付かつ予測モード有効の場合
      if (includePrediction && date > now && currentMetrics) {
        // ベースとなるメトリクス（PV計算用）
        const baseMetric = await this.calculateCurrentEvmMetrics(
          wbsId,
          date,
          calculationMode,
          progressMethod
        );

        // 予測EV: 現在EV + (将来PV - 現在PV) * SPI
        // SPIが極端な値にならないようガード（例: 0の場合は0、大きすぎる場合はキャップするなど検討可だが一旦そのまま）
        const spi = currentMetrics!.spi;
        const pvIncrement = Math.max(0, baseMetric.pv - currentMetrics!.pv);
        const predictedEvIncrement = pvIncrement * spi;
        const predictedEv = Math.min(
          currentMetrics!.bac, // BACを超えない
          currentMetrics!.ev + predictedEvIncrement
        );

        // 予測AC: 現在AC + (予測EV増加分) / CPI
        const cpi = currentMetrics!.cpi;
        // CPIが0の場合は1（計画通り）と仮定して計算
        const effectiveCpi = cpi === 0 ? 1 : cpi;
        const evIncrement = Math.max(0, predictedEv - currentMetrics!.ev);
        const predictedAc = currentMetrics!.ac + (evIncrement / effectiveCpi);

        return EvmMetrics.create({
          date: date,
          pv_base: baseMetric.pv_base,
          pv: baseMetric.pv,
          ev: predictedEv,
          ac: predictedAc,
          bac: baseMetric.bac,
          calculationMode,
          progressMethod: baseMetric.progressMethod,
          isPredicted: true,
        });
      }

      return this.calculateCurrentEvmMetrics(
        wbsId,
        date,
        calculationMode,
        progressMethod
      );
    });

    const resolvedMetrics = await Promise.all(metricPromises);
    metrics.push(...resolvedMetrics);

    return metrics;
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
