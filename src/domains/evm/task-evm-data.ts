import { ProgressMeasurementMethod } from '@/types/progress-measurement';
import { TaskStatus } from '@prisma/client'; //TODO: prismaに依存している

export type EvmCalculationMode = 'hours' | 'cost';

export class TaskEvmData {
  constructor(
    public readonly taskId: number,
    public readonly taskNo: string,
    public readonly taskName: string,
    public readonly plannedStartDate: Date,
    public readonly plannedEndDate: Date,
    public readonly actualStartDate: Date | null,
    public readonly actualEndDate: Date | null,
    public readonly plannedManHours: number,
    public readonly actualManHours: number,
    public readonly status: TaskStatus,
    public readonly progressRate: number,
    public readonly costPerHour: number = 5000,
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

  // 計算モードと進捗率測定方法に応じた出来高取得
  getEarnedValue(
    evaluationDate: Date,
    calculationMode: EvmCalculationMode,
    progressMethod: ProgressMeasurementMethod
  ): number {
    if (!this.actualStartDate || evaluationDate < this.actualStartDate) return 0;
    const rate = this.getProgressRate(progressMethod);

    if (calculationMode === 'cost') {
      return this.plannedManHours * this.costPerHour * (rate / 100);
    } else {
      return this.plannedManHours * (rate / 100);
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
    evaluationDate: Date,
    mode: EvmCalculationMode = 'hours',
    progressMethod: 'LINEAR' | ProgressMeasurementMethod = 'LINEAR' //TODO: PVの算出optionとProgressMeasurementMethodを分ける?
  ): number {
    if (evaluationDate < this.plannedStartDate) return 0;

    const baseValue =
      mode === 'cost'
        ? this.plannedManHours * this.costPerHour
        : this.plannedManHours;

    if (evaluationDate >= this.plannedEndDate) return baseValue;

    // SELF_REPORTEDの場合はLINEARとして扱う
    if (progressMethod === 'SELF_REPORTED') progressMethod = 'LINEAR';

    switch (progressMethod) {
      case 'LINEAR':
        // 総日数
        const totalDays = this.getDaysBetween(
          this.plannedStartDate,
          this.plannedEndDate
        );

        // 経過日数
        const elapsedDays = this.getDaysBetween(
          this.plannedStartDate,
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
