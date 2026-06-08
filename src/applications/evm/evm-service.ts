import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IWbsEvmRepository, WbsEvmData, TaskProgressSnapshotRecord } from './iwbs-evm-repository';
import { EvmMetrics, EvmCalculationMode } from '@/domains/evm/evm-metrics';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { ProgressMeasurementMethod } from '@prisma/client';
import type { EvmForecastMethod } from '@/types/evm-forecast-method';

/**
 * EVM表示に適した日付範囲
 */
export type EvmDateRange = {
  taskMinStartDate: Date | null;
  taskMaxEndDate: Date | null;
  recommendedStartDate: Date;
  recommendedEndDate: Date;
};

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
    const now = new Date();

    // (1) WBSデータを1回だけ取得（日付に依存しない）
    const wbsData = await this.wbsEvmRepository.getWbsEvmData(wbsId, now);
    const method =
      progressMethod ?? wbsData.settings?.progressMeasurementMethod ?? 'SELF_REPORTED';
    const fMethod =
      forecastMethod ?? wbsData.settings?.evmForecastMethod ?? 'CPI_ONLY';

    // (2) 全期間のWorkRecordsを1回だけ取得し、累積ACヘルパーを構築
    const computeCumulativeAc = await this.buildCumulativeAcFn(
      wbsId,
      wbsData,
      endDate,
      now,
      calculationMode
    );

    // (3) 進捗スナップショット履歴を1回取得し、評価日ごとのas-ofメトリクス関数を構築
    const snapToDate = endDate.getTime() > now.getTime() ? endDate : now;
    const snapshots = await this.wbsEvmRepository.getProgressSnapshots(wbsId, snapToDate);
    const computeHistorical = this.buildAsOfMetricsFn(
      wbsData, snapshots, now, calculationMode, method, fMethod
    );

    // (4) 各日付のメトリクスをインメモリで計算
    const dates = this.generateDateRange(startDate, endDate, interval);
    return this.computeTimeSeries(
      wbsData, dates, computeCumulativeAc, computeHistorical, now, calculationMode, method, fMethod, includePrediction
    );
  }

  /**
   * ダッシュボード表示に必要なEVMデータを1回のリクエストでまとめて取得する。
   * WBSデータ（重いクエリ）と作業記録の取得を1回ずつに集約し、
   * 現在メトリクス・時系列・タスク別詳細・日付範囲をすべて計算して返す。
   */
  async getEvmDashboardData(
    wbsId: number,
    options: {
      calculationMode?: EvmCalculationMode;
      progressMethod?: ProgressMeasurementMethod;
      forecastMethod?: EvmForecastMethod;
      interval?: 'daily' | 'weekly' | 'monthly';
      periodMode?: 'project' | 'recent3months' | 'recent1month' | 'custom';
      showPrediction?: boolean;
    } = {}
  ): Promise<{
    currentMetrics: EvmMetrics;
    timeSeries: EvmMetrics[];
    taskDetails: TaskEvmData[];
    dateRange: EvmDateRange;
  }> {
    const {
      calculationMode = 'hours',
      progressMethod,
      forecastMethod,
      interval = 'weekly',
      periodMode = 'project',
      showPrediction = false,
    } = options;

    const now = new Date();

    // (1) WBSデータを1回だけ取得（最重量クエリを1回に集約）
    const wbsData = await this.wbsEvmRepository.getWbsEvmData(wbsId, now);
    const method =
      progressMethod ?? wbsData.settings?.progressMeasurementMethod ?? 'SELF_REPORTED';
    const fMethod =
      forecastMethod ?? wbsData.settings?.evmForecastMethod ?? 'CPI_ONLY';

    // (2) 日付範囲を算出し、表示期間モードから時系列の開始/終了日を決定
    const dateRange = this.computeDateRange(wbsData, now);
    const { startDate, endDate } = this.resolveDateRange(dateRange, periodMode, now);

    // (3) 全期間のWorkRecordsを1回だけ取得し、累積ACヘルパーを構築
    //     現在メトリクス(now)と時系列(endDate)の両方を賄えるよう範囲を広げて取得する
    const costRangeEnd = endDate.getTime() > now.getTime() ? endDate : now;
    const computeCumulativeAc = await this.buildCumulativeAcFn(
      wbsId,
      wbsData,
      costRangeEnd,
      now,
      calculationMode
    );

    // (4) 現在メトリクス（カードはライブ値が正）
    const currentMetrics = this.computeMetricsFromData(
      wbsData, now, computeCumulativeAc(now), calculationMode, method, fMethod, false, now
    );

    // (5) 進捗スナップショット履歴を1回取得し、as-ofメトリクス関数を構築
    const snapshots = await this.wbsEvmRepository.getProgressSnapshots(wbsId, costRangeEnd);
    const computeHistorical = this.buildAsOfMetricsFn(
      wbsData, snapshots, now, calculationMode, method, fMethod
    );

    // (6) 時系列メトリクス
    const dates = this.generateDateRange(startDate, endDate, interval);
    const timeSeries = this.computeTimeSeries(
      wbsData, dates, computeCumulativeAc, computeHistorical, now, calculationMode, method, fMethod, showPrediction
    );

    return {
      currentMetrics,
      timeSeries,
      taskDetails: wbsData.tasks,
      dateRange,
    };
  }

  /**
   * 全期間のWorkRecordを1回だけ取得し、評価日時点の累積ACを返すクロージャを構築する。
   */
  private async buildCumulativeAcFn(
    wbsId: number,
    wbsData: WbsEvmData,
    endDate: Date,
    now: Date,
    calculationMode: EvmCalculationMode
  ): Promise<(evalDate: Date) => number> {
    const taskStartDate = wbsData.tasks[0]?.plannedStartDate || now;
    const actualCostMap = await this.wbsEvmRepository.getActualCostByDate(
      wbsId,
      taskStartDate,
      endDate,
      calculationMode
    );

    const sortedCostEntries = Array.from(actualCostMap.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    return (evalDate: Date): number => {
      const evalKey = evalDate.toISOString().split('T')[0];
      let cumulative = 0;
      for (const [dateKey, cost] of sortedCostEntries) {
        if (dateKey <= evalKey) cumulative += cost;
        else break;
      }
      return cumulative;
    };
  }

  /**
   * 事前取得済みのWBSデータ・累積ACから、各日付の時系列メトリクスを計算する（DBアクセスなし）。
   */
  private computeTimeSeries(
    wbsData: WbsEvmData,
    dates: Date[],
    computeCumulativeAc: (evalDate: Date) => number,
    computeHistorical: (evalDate: Date, ac: number) => EvmMetrics,
    now: Date,
    calculationMode: EvmCalculationMode,
    method: ProgressMeasurementMethod,
    fMethod: EvmForecastMethod,
    includePrediction: boolean
  ): EvmMetrics[] {
    // 予測モード用の現在メトリクスを計算（DBアクセスなし）
    let currentMetrics: EvmMetrics | null = null;
    if (includePrediction) {
      currentMetrics = this.computeMetricsFromData(
        wbsData, now, computeCumulativeAc(now), calculationMode, method, fMethod, false, now
      );
    }

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

      // 非予測（過去〜現在）はas-ofメトリクス（スナップショット優先・無ければ提案Cフォールバック）
      return computeHistorical(date, computeCumulativeAc(date));
    });
  }

  /**
   * WBSタスクの計画/実績日からEVM表示に適した日付範囲を算出する。
   */
  private computeDateRange(wbsData: WbsEvmData, now: Date): EvmDateRange {
    const tasks = wbsData.tasks;

    if (tasks.length === 0) {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return {
        taskMinStartDate: null,
        taskMaxEndDate: null,
        recommendedStartDate: threeMonthsAgo,
        recommendedEndDate: now,
      };
    }

    const startTimes: number[] = [];
    const endTimes: number[] = [];
    for (const t of tasks) {
      if (!isNaN(t.plannedStartDate.getTime())) startTimes.push(t.plannedStartDate.getTime());
      if (!isNaN(t.plannedEndDate.getTime())) endTimes.push(t.plannedEndDate.getTime());
      if (t.actualStartDate && !isNaN(t.actualStartDate.getTime())) startTimes.push(t.actualStartDate.getTime());
      if (t.actualEndDate && !isNaN(t.actualEndDate.getTime())) endTimes.push(t.actualEndDate.getTime());
    }

    const minStartDate = startTimes.length > 0 ? new Date(Math.min(...startTimes)) : null;
    const maxEndDate = endTimes.length > 0 ? new Date(Math.max(...endTimes)) : null;

    return {
      taskMinStartDate: minStartDate,
      taskMaxEndDate: maxEndDate,
      recommendedStartDate: minStartDate ?? now,
      recommendedEndDate: maxEndDate ?? now,
    };
  }

  /**
   * 表示期間モードに応じて時系列の開始/終了日を決定する。
   */
  private resolveDateRange(
    range: EvmDateRange,
    periodMode: 'project' | 'recent3months' | 'recent1month' | 'custom',
    now: Date
  ): { startDate: Date; endDate: Date } {
    switch (periodMode) {
      case 'project':
        return {
          startDate: range.recommendedStartDate,
          endDate: range.recommendedEndDate,
        };
      case 'recent3months': {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        return { startDate: start, endDate: now };
      }
      case 'recent1month': {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        return { startDate: start, endDate: now };
      }
      case 'custom':
      default:
        return { startDate: now, endDate: now };
    }
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

  /**
   * 進捗スナップショット履歴から、評価日ごとの過去メトリクス（PV/基準PV/EV/BAC）を
   * as-of再構築するクロージャを構築する。
   * @description
   * - 各タスクについて「評価日の終了時刻（翌日00:00未満）までの最新スナップショット」をas-of解決し、
   *   確定進捗を直接使用（提案Cの按分は通さない）。tombstone(isRemoved)は寄与0。
   * - スナップショットが無い区間（最初のsnapshotより前）は、ライブタスクで提案Cにフォールバックする。
   * - スナップショットが空なら全タスク・全評価日がフォールバックとなり、結果は現行（computeMetricsFromData）と一致する。
   */
  private buildAsOfMetricsFn(
    wbsData: WbsEvmData,
    snapshots: TaskProgressSnapshotRecord[],
    now: Date,
    calculationMode: EvmCalculationMode,
    method: ProgressMeasurementMethod,
    fMethod: EvmForecastMethod
  ): (evalDate: Date, ac: number) => EvmMetrics {
    // taskId別のスナップショット配列（snapshotAt昇順。取得時点でソート済み）
    const snapshotsByTask = new Map<number, TaskProgressSnapshotRecord[]>();
    for (const s of snapshots) {
      const arr = snapshotsByTask.get(s.taskId);
      if (arr) arr.push(s);
      else snapshotsByTask.set(s.taskId, [s]);
    }

    // ライブタスク（フォールバック用）
    const liveById = new Map<number, TaskEvmData>();
    for (const t of wbsData.tasks) liveById.set(t.taskId, t);

    const allTaskIds = new Set<number>([...liveById.keys(), ...snapshotsByTask.keys()]);
    const bufferTotal = wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0);

    return (evalDate: Date, ac: number): EvmMetrics => {
      // 評価日 d の終了時刻 = 翌日00:00（ローカル）。これ未満の最新スナップショットを d に反映。
      const cutoffMs = new Date(
        evalDate.getFullYear(),
        evalDate.getMonth(),
        evalDate.getDate() + 1
      ).getTime();

      let pv = 0;
      let pv_base = 0;
      let ev = 0;
      let bac = 0;

      for (const taskId of allTaskIds) {
        const snaps = snapshotsByTask.get(taskId);
        const asOf = snaps ? this.asOfSnapshot(snaps, cutoffMs) : undefined;

        if (asOf) {
          if (asOf.isRemoved) continue; // tombstone以降は寄与0
          const t = this.taskFromSnapshot(asOf);
          if (asOf.plannedStart && asOf.plannedEnd) {
            pv += t.getPlannedValueAtDate('YOTEI', evalDate, calculationMode, method);
          }
          if (asOf.baseStart && asOf.baseEnd) {
            pv_base += t.getPlannedValueAtDate('BASE', evalDate, calculationMode, method);
          }
          ev += t.getEarnedValueDirect(calculationMode, method);
          bac +=
            calculationMode === 'cost'
              ? asOf.baseManHours * asOf.costPerHour
              : asOf.baseManHours;
        } else {
          // スナップショット未蓄積区間：ライブタスクで提案Cフォールバック（現行と同一）
          const live = liveById.get(taskId);
          if (!live) continue;
          pv_base += live.getPlannedValueAtDate('BASE', evalDate, calculationMode, method);
          pv += live.getPlannedValueAtDate('YOTEI', evalDate, calculationMode, method);
          ev += live.getEarnedValue(evalDate, calculationMode, method, now);
          bac +=
            calculationMode === 'cost'
              ? live.baseManHours * live.costPerHour
              : live.baseManHours;
        }
      }

      return EvmMetrics.create({
        date: evalDate,
        pv_base,
        pv,
        ev,
        ac,
        bac: bac + bufferTotal,
        calculationMode,
        progressMethod: method,
        forecastMethod: fMethod,
        isPredicted: false,
      });
    };
  }

  /** snapshotAt < cutoffMs の最新スナップショット（昇順配列を線形走査） */
  private asOfSnapshot(
    snaps: TaskProgressSnapshotRecord[],
    cutoffMs: number
  ): TaskProgressSnapshotRecord | undefined {
    let result: TaskProgressSnapshotRecord | undefined;
    for (const s of snaps) {
      if (s.snapshotAt.getTime() < cutoffMs) result = s;
      else break;
    }
    return result;
  }

  /** スナップショットレコードから TaskEvmData を構築（期間null時はEPOCH placeholder。PVは呼び出し側でnullガード） */
  private taskFromSnapshot(s: TaskProgressSnapshotRecord): TaskEvmData {
    const EPOCH = new Date(0);
    return new TaskEvmData(
      s.taskId,
      s.taskNo,
      s.taskNo,
      s.baseStart ?? EPOCH,
      s.baseEnd ?? EPOCH,
      s.plannedStart ?? EPOCH,
      s.plannedEnd ?? EPOCH,
      s.actualStart,
      s.actualEnd,
      s.baseManHours,
      s.plannedManHours,
      0,
      s.status,
      s.progressRate ?? 0,
      s.costPerHour,
      s.progressRate
    );
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
