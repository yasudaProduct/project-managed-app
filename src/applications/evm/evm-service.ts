import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IWbsEvmRepository, WbsEvmData, TaskProgressSnapshotRecord, EditableProgressSnapshot, ProjectSettingsData } from './iwbs-evm-repository';
import { EvmMetrics, type EvmHealthStatus } from '@/domains/evm/evm-metrics';
import { TaskEvmData, type BusinessDayCounter } from '@/domains/evm/task-evm-data';
import { DEFAULT_COST_PER_HOUR } from '@/domains/evm/evm-constants';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { utcNextDayStartMs, addUtcMonthsClamped } from '@/utils/date-util';
import type { ProgressMeasurementMethod } from '@/types/progress-measurement';
import { TASK_STATUSES, type TaskStatus } from '@/types/wbs';
import type { EvmForecastMethod } from '@/types/evm-forecast-method';
import type { EvmCalculationMode } from '@/types/evm';
import {
  serializeEvmDashboardData,
  type EvmDashboardData,
} from '@/applications/evm/evm-dashboard-dto';

/**
 * EVM表示に適した日付範囲
 */
export type EvmDateRange = {
  taskMinStartDate: Date | null;
  taskMaxEndDate: Date | null;
  recommendedStartDate: Date;
  recommendedEndDate: Date;
};

/**
 * スケジュール予測（Earned Schedule）の状態
 * - ok: 予測完了日を算出できた
 * - no_plan: 計画（タスク/総PV）が存在しない
 * - not_started: プロジェクト開始前（経過時間なし）
 * - no_progress: 出来高ゼロで予測不能
 * - completed_scope: 全量完了済み（EV >= 総PV）
 */
export type ScheduleForecastStatus =
  | 'ok'
  | 'no_plan'
  | 'not_started'
  | 'no_progress'
  | 'completed_scope';

export type ScheduleForecast = {
  status: ScheduleForecastStatus;
  forecastCompletionDate: Date | null;
  plannedEndDate: Date | null;
  /** 計画終了日に対する遅延日数（負値は前倒し） */
  delayDays: number | null;
  /** 時間ベースのスケジュール効率（ES / 実経過日数） */
  spiT: number | null;
};

type EvmDashboardOptions = {
  calculationMode?: EvmCalculationMode;
  progressMethod?: ProgressMeasurementMethod;
  forecastMethod?: EvmForecastMethod;
  interval?: 'daily' | 'weekly' | 'monthly';
  periodMode?: 'project' | 'recent3months' | 'recent1month' | 'custom';
  showPrediction?: boolean;
};

export interface IEvmService {
  getEditableProgressSnapshots(wbsId: number): Promise<EditableProgressSnapshot[]>;
  updateProgressSnapshot(id: number, progressRate: number | null, status: TaskStatus): Promise<void>;
  calculateCurrentEvmMetrics(
    wbsId: number,
    evaluationDate?: Date,
    calculationMode?: EvmCalculationMode,
    progressMethod?: ProgressMeasurementMethod,
    forecastMethod?: EvmForecastMethod
  ): Promise<EvmMetrics>;
  getEvmTimeSeries(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval?: 'daily' | 'weekly' | 'monthly',
    calculationMode?: EvmCalculationMode,
    progressMethod?: ProgressMeasurementMethod,
    includePrediction?: boolean,
    forecastMethod?: EvmForecastMethod
  ): Promise<EvmMetrics[]>;
  getEvmDashboardData(
    wbsId: number,
    options?: EvmDashboardOptions
  ): Promise<{
    currentMetrics: EvmMetrics;
    timeSeries: EvmMetrics[];
    taskDetails: TaskEvmData[];
    dateRange: EvmDateRange;
    scheduleForecast: ScheduleForecast;
  }>;
  getEvmDashboardDataSerialized(
    wbsId: number,
    options?: EvmDashboardOptions
  ): Promise<EvmDashboardData>;
  getTaskEvmDetails(wbsId: number): Promise<TaskEvmData[]>;
  getHealthStatus(metrics: EvmMetrics): EvmHealthStatus;
}

@injectable()
export class EvmService implements IEvmService {
  constructor(
    @inject(SYMBOL.IWbsEvmRepository)
    private wbsEvmRepository: IWbsEvmRepository
  ) { }

  /**
   * 進捗スナップショット訂正画面用：編集対象スナップショット一覧を取得
   * @param wbsId WBS ID
   * @returns id 付きの編集レコード（isRemoved=false、taskNo/snapshotAt 昇順）
   */
  async getEditableProgressSnapshots(
    wbsId: number
  ): Promise<EditableProgressSnapshot[]> {
    return this.wbsEvmRepository.getEditableProgressSnapshots(wbsId);
  }

  /**
   * 進捗スナップショット訂正画面用：1件の progressRate / status を手動補正する
   * @param id スナップショット行 ID
   * @param progressRate 進捗率（0〜100 または null）。範囲外は例外
   * @param status タスクステータス
   */
  async updateProgressSnapshot(
    id: number,
    progressRate: number | null,
    status: TaskStatus
  ): Promise<void> {
    if (progressRate !== null) {
      if (!Number.isFinite(progressRate) || progressRate < 0 || progressRate > 100) {
        throw new Error('進捗率は0〜100の範囲で指定してください。');
      }
    }
    if (!TASK_STATUSES.includes(status)) {
      throw new Error(`不正なステータスです: ${status}`);
    }
    await this.wbsEvmRepository.updateProgressSnapshot(id, progressRate, status);
  }

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
    // 下限はアクティブタスク開始で切らない（soft-delete済みタスクの早期実績も含めるため）
    const actualCostMap = await this.wbsEvmRepository.getActualCostByDate(
      wbsId,
      new Date(0),
      evaluationDate,
      calculationMode
    );
    const ac = Array.from(actualCostMap.values()).reduce(
      (sum, cost) => sum + cost,
      0
    );

    const businessDayCounter = await this.buildBusinessDayCounter(wbsData);

    return this.computeMetricsFromData(wbsData, evaluationDate, ac, calculationMode, method, fMethod, false, evaluationDate, businessDayCounter);
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
      endDate,
      calculationMode
    );

    // (3) 進捗スナップショット履歴を1回取得し、評価日ごとのas-ofメトリクス関数を構築
    const snapToDate = endDate.getTime() > now.getTime() ? endDate : now;
    const snapshots = await this.wbsEvmRepository.getProgressSnapshots(wbsId, snapToDate);
    const businessDayCounter = await this.buildBusinessDayCounter(wbsData);
    const computeHistorical = this.buildAsOfMetricsFn(
      wbsData, snapshots, now, calculationMode, method, fMethod, businessDayCounter
    );

    // (4) 各日付のメトリクスをインメモリで計算
    const dates = this.generateDateRange(startDate, endDate, interval);
    return this.computeTimeSeries(
      wbsData, dates, computeCumulativeAc, computeHistorical, now, calculationMode, method, fMethod, includePrediction, businessDayCounter
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
    scheduleForecast: ScheduleForecast;
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
      costRangeEnd,
      calculationMode
    );

    // (4) 現在メトリクス（カードはライブ値が正）
    const businessDayCounter = await this.buildBusinessDayCounter(wbsData);
    const currentMetrics = this.computeMetricsFromData(
      wbsData, now, computeCumulativeAc(now), calculationMode, method, fMethod, false, now, businessDayCounter
    );

    // (5) 進捗スナップショット履歴を1回取得し、as-ofメトリクス関数を構築
    const snapshots = await this.wbsEvmRepository.getProgressSnapshots(wbsId, costRangeEnd);
    const computeHistorical = this.buildAsOfMetricsFn(
      wbsData, snapshots, now, calculationMode, method, fMethod, businessDayCounter
    );

    // (6) 時系列メトリクス
    const dates = this.generateDateRange(startDate, endDate, interval);
    let timeSeries = this.computeTimeSeries(
      wbsData, dates, computeCumulativeAc, computeHistorical, now, calculationMode, method, fMethod, showPrediction, businessDayCounter
    );

    // (7) スケジュール予測（Earned Schedule）と予測線のBAC到達延長
    const scheduleForecast = this.computeScheduleForecast(
      wbsData, currentMetrics.ev, dateRange, now, calculationMode, method, businessDayCounter
    );
    if (
      showPrediction &&
      periodMode === 'project' &&
      scheduleForecast.status === 'ok' &&
      scheduleForecast.forecastCompletionDate &&
      scheduleForecast.forecastCompletionDate.getTime() > endDate.getTime() &&
      timeSeries.length > 0
    ) {
      timeSeries = timeSeries.concat(
        this.buildForecastExtension(
          wbsData,
          timeSeries[timeSeries.length - 1],
          currentMetrics,
          endDate,
          scheduleForecast.forecastCompletionDate,
          startDate,
          interval,
          calculationMode,
          method,
          fMethod,
          businessDayCounter
        )
      );
    }

    return {
      currentMetrics,
      timeSeries,
      taskDetails: wbsData.tasks,
      dateRange,
      scheduleForecast,
    };
  }

  async getEvmDashboardDataSerialized(
    wbsId: number,
    options: {
      calculationMode?: EvmCalculationMode;
      progressMethod?: ProgressMeasurementMethod;
      forecastMethod?: EvmForecastMethod;
      interval?: 'daily' | 'weekly' | 'monthly';
      periodMode?: 'project' | 'recent3months' | 'recent1month' | 'custom';
      showPrediction?: boolean;
    } = {}
  ): Promise<EvmDashboardData> {
    const result = await this.getEvmDashboardData(wbsId, options);
    return serializeEvmDashboardData(result);
  }

  /**
   * 全期間のWorkRecordを1回だけ取得し、評価日時点の累積ACを返すクロージャを構築する。
   */
  private async buildCumulativeAcFn(
    wbsId: number,
    endDate: Date,
    calculationMode: EvmCalculationMode
  ): Promise<(evalDate: Date) => number> {
    // 下限はアクティブタスク開始で切らない（soft-delete済みタスクの早期実績も累積ACに含めるため）
    const actualCostMap = await this.wbsEvmRepository.getActualCostByDate(
      wbsId,
      new Date(0),
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
    includePrediction: boolean,
    businessDayCounter?: BusinessDayCounter
  ): EvmMetrics[] {
    // 予測モード用の現在メトリクスを計算（DBアクセスなし）
    let currentMetrics: EvmMetrics | null = null;
    if (includePrediction) {
      currentMetrics = this.computeMetricsFromData(
        wbsData, now, computeCumulativeAc(now), calculationMode, method, fMethod, false, now, businessDayCounter
      );
    }

    return dates.map((date) => {
      if (includePrediction && date > now && currentMetrics) {
        const baseMetric = this.computeMetricsFromData(
          wbsData, date, computeCumulativeAc(date), calculationMode, method, fMethod, false, now, businessDayCounter
        );

        // SPI/CPI未定義（開始前・実績未投入）は「計画通り＝1」とみなして予測する
        const spi = currentMetrics.spi ?? 1;
        const pvIncrement = Math.max(0, baseMetric.pv - currentMetrics.pv);
        const predictedEvIncrement = pvIncrement * spi;
        const predictedEv = Math.min(
          currentMetrics.bac,
          currentMetrics.ev + predictedEvIncrement
        );

        const cpi = currentMetrics.cpi;
        const effectiveCpi = cpi === null || cpi === 0 ? 1 : cpi;
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
          ...this.resolveThresholds(wbsData.settings),
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
    businessDayCounter?: BusinessDayCounter,
  ): EvmMetrics {
    const pv_base = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getPlannedValueAtDate('BASE', evaluationDate, calculationMode, progressMethod, businessDayCounter);
    }, 0);

    const pv = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getPlannedValueAtDate('YOTEI', evaluationDate, calculationMode, progressMethod, businessDayCounter);
    }, 0);

    const ev = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getEarnedValue(evaluationDate, calculationMode, progressMethod, referenceDate);
    }, 0);

    const taskBac =
      calculationMode === 'cost'
        ? wbsData.tasks.reduce(
          (sum, task) => sum + task.baseManHours * task.costPerHour,
          0
        )
        : wbsData.totalBaseManHours;
    const bac = taskBac + this.bufferBacContribution(wbsData, calculationMode);

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
      ...this.resolveThresholds(wbsData.settings),
    });
  }

  /**
   * ヘルス判定しきい値をプロジェクト設定から解決する（未設定はデフォルト 0.9 / 0.8）。
   */
  private resolveThresholds(settings: ProjectSettingsData | null | undefined): {
    healthyThreshold: number;
    warningThreshold: number;
  } {
    return {
      healthyThreshold: (settings?.evmHealthyThresholdPct ?? 90) / 100,
      warningThreshold: (settings?.evmWarningThresholdPct ?? 80) / 100,
    };
  }

  /**
   * バッファのBAC寄与を算出する。
   * 工数モードは時間のまま加算。金額モードは設定（evmBufferCostMethod）に応じて
   * WBS平均単価/デフォルト単価で金額換算、またはBACから除外する。
   */
  private bufferBacContribution(
    wbsData: WbsEvmData,
    calculationMode: EvmCalculationMode
  ): number {
    const totalHours = wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0);
    if (calculationMode !== 'cost') return totalHours;

    const method = wbsData.settings?.evmBufferCostMethod ?? 'AVERAGE_RATE';
    switch (method) {
      case 'EXCLUDE':
        return 0;
      case 'DEFAULT_RATE':
        return totalHours * DEFAULT_COST_PER_HOUR;
      case 'AVERAGE_RATE':
      default:
        return totalHours * (wbsData.averageCostPerHour ?? DEFAULT_COST_PER_HOUR);
    }
  }

  /**
   * 営業日ベースPV按分用のカウンタ関数を構築する。
   * 設定がBUSINESS_DAYS以外ならundefined（暦日按分のまま）。
   * タスクの基準/予定期間全体を1回走査して累積営業日インデックスを作り、
   * (start, end] の営業日数をO(1)で返すクロージャにする。
   * 休日判定はCompanyCalendar（土日＋日本の祝日＋会社休日）を再利用する。
   */
  private async buildBusinessDayCounter(
    wbsData: WbsEvmData
  ): Promise<BusinessDayCounter | undefined> {
    if (wbsData.settings?.evmPvDistribution !== 'BUSINESS_DAYS') return undefined;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const t of wbsData.tasks) {
      for (const d of [t.baseStartDate, t.plannedStartDate]) {
        if (d && !isNaN(d.getTime())) minMs = Math.min(minMs, d.getTime());
      }
      for (const d of [t.baseEndDate, t.plannedEndDate]) {
        if (d && !isNaN(d.getTime())) maxMs = Math.max(maxMs, d.getTime());
      }
    }
    if (!isFinite(minMs) || !isFinite(maxMs)) return undefined;

    const holidays = await this.wbsEvmRepository.getCompanyHolidays(
      new Date(minMs),
      new Date(maxMs)
    );
    const calendar = new CompanyCalendar(
      7.5, // 稼働時間はisCompanyHoliday判定に影響しないためダミー値
      holidays.map((date) => ({ date, name: '', type: 'COMPANY' as const }))
    );

    const startDay = Math.floor(minMs / MS_PER_DAY);
    const endDay = Math.floor(maxMs / MS_PER_DAY);
    const cumulative: number[] = new Array(endDay - startDay + 1);
    let count = 0;
    for (let day = startDay; day <= endDay; day++) {
      if (!calendar.isCompanyHoliday(new Date(day * MS_PER_DAY))) count++;
      cumulative[day - startDay] = count;
    }

    const cumAt = (ms: number): number => {
      const day = Math.floor(ms / MS_PER_DAY);
      if (day < startDay) return 0;
      if (day > endDay) return cumulative[cumulative.length - 1];
      return cumulative[day - startDay];
    };

    return (start: Date, end: Date) =>
      Math.max(0, cumAt(end.getTime()) - cumAt(start.getTime()));
  }

  /**
   * Earned Schedule法によるスケジュール予測。
   * ES = PV曲線（単調非減少）上で現在EVと同額に達する経過日数（日単位2分探索＋線形補間）。
   * SPIt = ES / 実経過日数。予測完了日 = 開始日 + 計画総日数 / SPIt。
   * 過去日への完了予測は現在日にクランプする。
   */
  private computeScheduleForecast(
    wbsData: WbsEvmData,
    currentEv: number,
    dateRange: EvmDateRange,
    now: Date,
    calculationMode: EvmCalculationMode,
    method: ProgressMeasurementMethod,
    businessDayCounter?: BusinessDayCounter
  ): ScheduleForecast {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const none: Omit<ScheduleForecast, 'status'> = {
      forecastCompletionDate: null,
      plannedEndDate: null,
      delayDays: null,
      spiT: null,
    };

    const start = dateRange.taskMinStartDate;
    const end = dateRange.taskMaxEndDate;
    if (!start || !end || end.getTime() <= start.getTime()) {
      return { status: 'no_plan', ...none };
    }

    const pvAt = (d: Date): number =>
      wbsData.tasks.reduce(
        (sum, task) =>
          sum + task.getPlannedValueAtDate('YOTEI', d, calculationMode, method, businessDayCounter),
        0
      );

    // 計画終了日以降の評価で総PV（全タスク全額）
    const totalPv = pvAt(new Date(end.getTime() + MS_PER_DAY));
    if (totalPv <= 0) {
      return { status: 'no_plan', ...none };
    }

    const atDays = (now.getTime() - start.getTime()) / MS_PER_DAY;
    if (atDays <= 0) {
      return { status: 'not_started', ...none, plannedEndDate: end };
    }

    if (currentEv >= totalPv) {
      return {
        status: 'completed_scope',
        forecastCompletionDate: now,
        plannedEndDate: end,
        delayDays: Math.ceil((now.getTime() - end.getTime()) / MS_PER_DAY),
        spiT: null,
      };
    }

    if (currentEv <= 0) {
      return { status: 'no_progress', ...none, plannedEndDate: end };
    }

    // ES: PV(start + d日) >= currentEv となる最小の日数dを2分探索
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
    let lo = 0;
    let hi = totalDays;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const pvMid = pvAt(new Date(start.getTime() + mid * MS_PER_DAY));
      if (pvMid >= currentEv) hi = mid;
      else lo = mid + 1;
    }
    // 隣接日間を線形補間してESを小数日で求める
    let es: number;
    if (lo === 0) {
      es = 0;
    } else {
      const pvHi = pvAt(new Date(start.getTime() + lo * MS_PER_DAY));
      const pvLo = pvAt(new Date(start.getTime() + (lo - 1) * MS_PER_DAY));
      const frac = pvHi > pvLo ? (currentEv - pvLo) / (pvHi - pvLo) : 0;
      es = lo - 1 + frac;
    }

    const spiT = es / atDays;
    if (spiT <= 0) {
      return { status: 'no_progress', ...none, plannedEndDate: end };
    }

    const plannedDurationDays = (end.getTime() - start.getTime()) / MS_PER_DAY;
    const forecastMs = start.getTime() + (plannedDurationDays / spiT) * MS_PER_DAY;
    // 過去日への完了予測は出さない（現在日にクランプ）
    const forecast = new Date(Math.max(forecastMs, now.getTime()));

    return {
      status: 'ok',
      forecastCompletionDate: forecast,
      plannedEndDate: end,
      delayDays: Math.ceil((forecast.getTime() - end.getTime()) / MS_PER_DAY),
      spiT,
    };
  }

  /**
   * 予測線をプロジェクト計画終了日以降、予測完了日まで延長するセグメントを生成する。
   * EVは終了日時点の予測EVからBACへ線形に増加（予測完了日でBAC到達）、
   * ACはCPI（未定義/0は1）で追随、PV/PV_BASEは計画期間後のため全額フラット。
   * 表示の暴走防止のため、延長は「開始日から計画期間の2倍」の時点で打ち切る
   * （打ち切られた場合、EVはBAC未到達のまま線が終わる）。
   */
  private buildForecastExtension(
    wbsData: WbsEvmData,
    lastPoint: EvmMetrics,
    currentMetrics: EvmMetrics,
    endDate: Date,
    forecastDate: Date,
    projectStart: Date,
    interval: 'daily' | 'weekly' | 'monthly',
    calculationMode: EvmCalculationMode,
    method: ProgressMeasurementMethod,
    fMethod: EvmForecastMethod,
    businessDayCounter?: BusinessDayCounter
  ): EvmMetrics[] {
    const capMs =
      projectStart.getTime() + 2 * (endDate.getTime() - projectStart.getTime());
    const targetMs = Math.min(forecastDate.getTime(), Math.max(capMs, endDate.getTime()));
    if (targetMs <= endDate.getTime()) return [];

    const extDates = this.generateDateRange(endDate, new Date(targetMs), interval).slice(1);
    if (extDates.length === 0) return [];

    const evStart = lastPoint.ev;
    const bac = lastPoint.bac;
    const fullSpan = forecastDate.getTime() - endDate.getTime();
    const cpi = currentMetrics.cpi;
    const effectiveCpi = cpi === null || cpi === 0 ? 1 : cpi;
    const thresholds = this.resolveThresholds(wbsData.settings);

    return extDates.map((date) => {
      const frac = Math.min(1, (date.getTime() - endDate.getTime()) / fullSpan);
      const ev = evStart + (bac - evStart) * frac;
      const ac =
        currentMetrics.ac + Math.max(0, ev - currentMetrics.ev) / effectiveCpi;
      const pv = wbsData.tasks.reduce(
        (sum, task) =>
          sum + task.getPlannedValueAtDate('YOTEI', date, calculationMode, method, businessDayCounter),
        0
      );
      const pv_base = wbsData.tasks.reduce(
        (sum, task) =>
          sum + task.getPlannedValueAtDate('BASE', date, calculationMode, method, businessDayCounter),
        0
      );

      return EvmMetrics.create({
        date,
        pv_base,
        pv,
        ev,
        ac,
        bac,
        calculationMode,
        progressMethod: method,
        forecastMethod: fMethod,
        isPredicted: true,
        ...thresholds,
      });
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
    fMethod: EvmForecastMethod,
    businessDayCounter?: BusinessDayCounter
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
    const bufferTotal = this.bufferBacContribution(wbsData, calculationMode);
    const thresholds = this.resolveThresholds(wbsData.settings);

    return (evalDate: Date, ac: number): EvmMetrics => {
      // 評価日 d の終了時刻 = 翌日00:00（UTC）。これ未満の最新スナップショットを d に反映。
      // 累積ACの日付キー（UTC暦日）と同一基準に揃え、サーバーTZ依存を排除する。
      const cutoffMs = utcNextDayStartMs(evalDate);

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
            pv += t.getPlannedValueAtDate('YOTEI', evalDate, calculationMode, method, businessDayCounter);
          }
          if (asOf.baseStart && asOf.baseEnd) {
            pv_base += t.getPlannedValueAtDate('BASE', evalDate, calculationMode, method, businessDayCounter);
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
          pv_base += live.getPlannedValueAtDate('BASE', evalDate, calculationMode, method, businessDayCounter);
          pv += live.getPlannedValueAtDate('YOTEI', evalDate, calculationMode, method, businessDayCounter);
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
        ...thresholds,
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
  getHealthStatus(metrics: EvmMetrics): EvmHealthStatus {
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

    if (interval === 'monthly') {
      // 常に開始日基準で i ヶ月加算（累積setMonthのドリフト回避。同日が無い月は月末にクランプ）
      for (let i = 0; ; i++) {
        const d = addUtcMonthsClamped(startDate, i);
        if (d.getTime() > endDate.getTime()) break;
        dates.push(d);
      }
    } else {
      const stepDays = interval === 'daily' ? 1 : 7;
      const current = new Date(startDate);
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + stepDays);
      }
    }

    // 終端補正: 刻みがendDateに一致しない場合、最終点としてendDateを追加する
    // （チャート・テーブルの最終週/最終日欠けを防ぐ）
    if (
      dates.length > 0 &&
      dates[dates.length - 1].getTime() < endDate.getTime()
    ) {
      dates.push(new Date(endDate));
    }

    return dates;
  }
}
