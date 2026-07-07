import { ProgressMeasurementMethod } from '@/types/progress-measurement';
import { TaskStatus } from '@/types/wbs';
import { DEFAULT_COST_PER_HOUR } from './evm-constants';

export type EvmCalculationMode = 'hours' | 'cost';

export class TaskEvmData {
  constructor(
    public readonly taskId: number,
    public readonly taskNo: string,
    public readonly taskName: string,
    public readonly baseStartDate: Date,
    public readonly baseEndDate: Date,
    public readonly plannedStartDate: Date,
    public readonly plannedEndDate: Date,
    public readonly actualStartDate: Date | null,
    public readonly actualEndDate: Date | null,
    public readonly baseManHours: number,
    public readonly plannedManHours: number,
    public readonly actualManHours: number,
    public readonly status: TaskStatus,
    public readonly progressRate: number,
    public readonly costPerHour: number = DEFAULT_COST_PER_HOUR,
    public readonly selfReportedProgress: number | null = null
  ) { }

  // 工数ベースの出来高計算
  get earnedValue(): number {
    return this.plannedManHours * (this.progressRate / 100);
  }

  // 金額ベースの出来高計算
  get earnedValueCost(): number {
    return this.plannedManHours * this.costPerHour * (this.progressRate / 100);
  }

  // 進捗率測定方法に応じた進捗率取得
  getProgressRate(
    method: ProgressMeasurementMethod
  ): number {
    switch (method) {
      case 'ZERO_HUNDRED':
        return this.status === 'COMPLETED' ? 100 : 0;
      case 'FIFTY_FIFTY':
        if (this.status === 'COMPLETED') return 100;
        if (this.status === 'IN_PROGRESS') return 50;
        return 0;
      case 'SELF_REPORTED':
        return this.selfReportedProgress ?? this.progressRate;
      default:
        return this.progressRate;
    }
  }

  /**
   * 計算モードと進捗率測定方法に応じた出来高取得
   * @param evaluationDate 評価日
   * @param calculationMode 計算モード(工数 or コスト)
   * @param progressMethod 進捗率測定方法
   * @param referenceDate 現在進捗率の基準日（時系列計算では「現在(now)」を渡す。デフォルトは評価日）
   * @description
   * 進捗率の履歴を保持していないため、過去日のEVは保持済みの
   * actualStartDate / actualEndDate / status / progressRate から近似配分する（暫定対応・提案C）。
   * - ZERO_HUNDRED: 完了日(actualEndDate)に0→100へステップ
   * - FIFTY_FIFTY: 実績開始で50、完了日で100へステップ
   * - SELF_REPORTED: 実績開始(0%)→現在進捗率まで実績期間で線形按分（完了タスクは完了日で100%）
   * referenceDate == evaluationDate（単一点評価）の場合、現在時点の値は従来どおり変化しない。
   */
  getEarnedValue(
    evaluationDate: Date,
    calculationMode: EvmCalculationMode,
    progressMethod: ProgressMeasurementMethod,
    referenceDate: Date = evaluationDate
  ): number {
    if (!this.actualStartDate || evaluationDate < this.actualStartDate) return 0;

    const base =
      calculationMode === 'cost'
        ? this.plannedManHours * this.costPerHour
        : this.plannedManHours;

    const rate = this.effectiveRateAtDate(evaluationDate, progressMethod, referenceDate);

    return base * (rate / 100);
  }

  /**
   * 按分しない直接EV（スナップショット値の確定進捗をそのまま使う）。
   * @description
   * スナップショットは既にas-of確定値のため、提案Cの線形按分や actualStartDate ゲートを通さず、
   * その時点の進捗率を予定工数（コスト時は単価込み）に直接適用する。
   */
  getEarnedValueDirect(
    calculationMode: EvmCalculationMode,
    progressMethod: ProgressMeasurementMethod
  ): number {
    const base =
      calculationMode === 'cost'
        ? this.plannedManHours * this.costPerHour
        : this.plannedManHours;
    return base * (this.directRate(progressMethod) / 100);
  }

  /** 方式別の直接進捗率（0〜100、按分なし） */
  private directRate(method: ProgressMeasurementMethod): number {
    switch (method) {
      case 'ZERO_HUNDRED':
        return this.status === 'COMPLETED' ? 100 : 0;
      case 'FIFTY_FIFTY':
        if (this.status === 'COMPLETED') return 100;
        if (this.status === 'IN_PROGRESS') return 50;
        return 0;
      case 'SELF_REPORTED':
      default:
        return this.status === 'COMPLETED'
          ? 100
          : Math.max(0, Math.min(100, this.selfReportedProgress ?? this.progressRate));
    }
  }

  /**
   * 評価日時点での実効進捗率（0〜100）を方式別の位相で算出する。
   * @param evaluationDate 評価日（actualStartDate以降であることが呼び出し側で保証される）
   * @param method 進捗率測定方法
   * @param referenceDate 現在進捗率の基準日
   */
  private effectiveRateAtDate(
    evaluationDate: Date,
    method: ProgressMeasurementMethod,
    referenceDate: Date
  ): number {
    // ゲート通過済みのため actualStartDate は非null
    const startDate = this.actualStartDate as Date;
    const creditDate = this.actualEndDate ?? startDate;

    switch (method) {
      case 'ZERO_HUNDRED':
        return this.status === 'COMPLETED' && evaluationDate >= creditDate ? 100 : 0;

      case 'FIFTY_FIFTY':
        if (this.status === 'COMPLETED') {
          return evaluationDate >= creditDate ? 100 : 50;
        }
        if (this.status === 'IN_PROGRESS') return 50;
        return 0;

      case 'SELF_REPORTED':
      default: {
        const final =
          this.status === 'COMPLETED'
            ? 100
            : Math.max(0, Math.min(100, this.selfReportedProgress ?? this.progressRate));
        const rampEnd = this.status === 'COMPLETED' ? creditDate : referenceDate;

        if (evaluationDate >= rampEnd) return final;

        const totalDays = this.getDaysBetween(startDate, rampEnd);
        if (totalDays === 0) return final;

        const elapsedDays = this.getDaysBetween(startDate, evaluationDate);
        return (final * elapsedDays) / totalDays;
      }
    }
  }

  /**
   * 評価日時点での計画価値取得
   * @param evaluationDate 評価日
   * @param mode 計算モード(工数 or コスト)
   * @returns PV
   * @description 
   * 評価日時点での計画価値(PV)を取得する
   * 評価日 >= 予定開始日の場合、0を返す
   * 評価日 <= 予定終了日の場合、予定工数または予定コストを返す
   * 予定開始日 < 評価日 < 予定終了日の場合、
   *  LINEAR: 予定工数または予定コスト × (経過日数 / 総日数)
   *  ZERO_HUNDRED: 0 (完了していないため)
   *  FIFTY_FIFTY: 予定工数または予定コスト * 50%
   */
  getPlannedValueAtDate(
    type: 'YOTEI' | 'BASE',
    evaluationDate: Date,
    mode: EvmCalculationMode = 'hours',
    progressMethod: 'LINEAR' | ProgressMeasurementMethod = 'LINEAR' //TODO: PVの算出optionとProgressMeasurementMethodを分ける?
  ): number {
    let startDate: Date;
    let endDate: Date;
    let hours: number;

    if (type === 'BASE') {
      startDate = this.baseStartDate;
      endDate = this.baseEndDate;
      hours = this.baseManHours;
    } else {
      startDate = this.plannedStartDate;
      endDate = this.plannedEndDate;
      hours = this.plannedManHours
    }

    if (evaluationDate < startDate) return 0;

    const baseValue =
      mode === 'cost'
        ? hours * this.costPerHour
        : hours;

    if (evaluationDate >= endDate) return baseValue;

    // SELF_REPORTEDの場合はLINEARとして扱う
    if (progressMethod === 'SELF_REPORTED') progressMethod = 'LINEAR';

    switch (progressMethod) {
      case 'LINEAR':
        // 総日数
        const totalDays = this.getDaysBetween(
          startDate,
          endDate
        );

        // 経過日数
        const elapsedDays = this.getDaysBetween(
          startDate,
          evaluationDate
        );

        return totalDays === 0 ? 0 : (baseValue * elapsedDays) / totalDays;
      case 'ZERO_HUNDRED':
        // 評価日が予定開始日と予定終了日の間の場合、計画価値は0
        return 0;
      case 'FIFTY_FIFTY':
        // 評価日が予定開始日と予定終了日の間の場合、計画価値は50%
        return baseValue * 0.5;

      default:
        return 0;
    }


  }

  private getDaysBetween(start: Date, end: Date): number {
    return Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
  }
}
