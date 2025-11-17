import { TaskStatus, ProgressMeasurementMethod } from '@prisma/client';

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
  getProgressRate(method: ProgressMeasurementMethod): number {
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

  // 評価日時点での計画価値取得
  getPlannedValueAtDate(
    evaluationDate: Date,
    mode: EvmCalculationMode = 'hours'
  ): number {
    if (evaluationDate < this.plannedStartDate) return 0;

    const baseValue =
      mode === 'cost'
        ? this.plannedManHours * this.costPerHour
        : this.plannedManHours;

    if (evaluationDate >= this.plannedEndDate) return baseValue;

    const totalDays = this.getDaysBetween(
      this.plannedStartDate,
      this.plannedEndDate
    );
    const elapsedDays = this.getDaysBetween(
      this.plannedStartDate,
      evaluationDate
    );

    return totalDays === 0 ? 0 : (baseValue * elapsedDays) / totalDays;
  }

  private getDaysBetween(start: Date, end: Date): number {
    return Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
  }
}
