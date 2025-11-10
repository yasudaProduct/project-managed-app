import { BusinessDayPeriod } from '../calendar/business-day-period';

/**
 * 按分対象のタスク情報
 */
export interface TaskForAllocation {
  wbsId: number;
  taskId: string;
  taskName: string;
  phase?: string;
  kijunStart?: Date;
  kijunEnd?: Date;
  kijunKosu?: number;
  yoteiStart: Date;
  yoteiEnd?: Date;
  yoteiKosu: number;
  jissekiKosu?: number;
}

/**
 * 月別按分詳細
 */
export interface MonthlyAllocationDetail {
  baselineHours: number;
  plannedHours: number;
  actualHours: number;
  workingDays: number;
  availableHours: number;
  allocationRatio: number;
}

/**
 * 月別タスク按分結果（Value Object）
 * 既存の TaskAllocation（日別）と区別するため "Monthly" を付与
 */
export class MonthlyTaskAllocation {
  private constructor(
    public readonly task: TaskForAllocation,
    public readonly monthlyAllocations: Map<string, MonthlyAllocationDetail>
  ) {}

  /**
   * 単月タスクの按分結果を生成
   */
  static createSingleMonth(
    task: TaskForAllocation,
    yearMonth: string
  ): MonthlyTaskAllocation {
    const allocations = new Map<string, MonthlyAllocationDetail>();
    allocations.set(yearMonth, {
      baselineHours: task.kijunKosu || 0,
      plannedHours: task.yoteiKosu,
      actualHours: task.jissekiKosu || 0,
      workingDays: 1,
      availableHours: 7.5, // デフォルト値
      allocationRatio: 1.0
    });
    return new MonthlyTaskAllocation(task, allocations);
  }

  /**
   * 複数月タスクの按分結果を生成
   * @param task タスク情報
   * @param allocatedPlannedHours 予定工数の按分結果（月別）
   * @param yoteiPeriod 予定期間のBusinessDayPeriod
   * @param allocatedBaselineHours 基準工数の按分結果（月別、オプション）
   * @param kijunPeriod 基準期間のBusinessDayPeriod（オプション）
   */
  static createMultiMonth(
    task: TaskForAllocation,
    allocatedPlannedHours: Map<string, number>,
    yoteiPeriod: BusinessDayPeriod,
    allocatedBaselineHours?: Map<string, number>,
    kijunPeriod?: BusinessDayPeriod
  ): MonthlyTaskAllocation {
    const allocations = new Map<string, MonthlyAllocationDetail>();
    const startYearMonth = formatYearMonth(task.yoteiStart);
    const businessDaysByMonth = yoteiPeriod.getBusinessDaysByMonth();
    const availableHoursByMonth = yoteiPeriod.getAvailableHoursByMonth();
    const totalAvailableHours = Array.from(availableHoursByMonth.values())
      .reduce((sum, h) => sum + h, 0);

    // 予定期間の全ての月をイテレート
    allocatedPlannedHours.forEach((plannedHours, yearMonth) => {
      const workingDays = businessDaysByMonth.get(yearMonth) || 0;
      const availableHours = availableHoursByMonth.get(yearMonth) || 0;
      const allocationRatio = totalAvailableHours > 0
        ? availableHours / totalAvailableHours
        : 0;

      // 基準工数は独立した按分結果から取得（なければ0）
      const baselineHours = allocatedBaselineHours?.get(yearMonth) || 0;

      // ビジネスルール: 実績工数は開始月のみ計上
      const actualHours = yearMonth === startYearMonth
        ? (task.jissekiKosu || 0)
        : 0;

      allocations.set(yearMonth, {
        baselineHours,
        plannedHours,
        actualHours,
        workingDays,
        availableHours,
        allocationRatio
      });
    });

    // 基準工数の按分結果に予定期間にない月があれば追加
    if (allocatedBaselineHours) {
      allocatedBaselineHours.forEach((baselineHours, yearMonth) => {
        if (!allocations.has(yearMonth)) {
          // 予定期間にない月だが基準期間には含まれる場合
          const kijunBusinessDays = kijunPeriod?.getBusinessDaysByMonth().get(yearMonth) || 0;
          const kijunAvailableHours = kijunPeriod?.getAvailableHoursByMonth().get(yearMonth) || 0;

          allocations.set(yearMonth, {
            baselineHours,
            plannedHours: 0,
            actualHours: 0,
            workingDays: kijunBusinessDays,
            availableHours: kijunAvailableHours,
            allocationRatio: 0
          });
        }
      });
    }

    return new MonthlyTaskAllocation(task, allocations);
  }

  /**
   * 全ての月を取得
   */
  getMonths(): string[] {
    return Array.from(this.monthlyAllocations.keys()).sort();
  }

  /**
   * 指定月の按分データを取得
   */
  getAllocation(yearMonth: string): MonthlyAllocationDetail | undefined {
    return this.monthlyAllocations.get(yearMonth);
  }

  /**
   * 予定工数の合計を取得
   */
  getTotalPlannedHours(): number {
    return Array.from(this.monthlyAllocations.values())
      .reduce((sum, detail) => sum + detail.plannedHours, 0);
  }

  /**
   * 実績工数の合計を取得
   */
  getTotalActualHours(): number {
    return Array.from(this.monthlyAllocations.values())
      .reduce((sum, detail) => sum + detail.actualHours, 0);
  }
}

/**
 * 年月フォーマット用ヘルパー関数
 */
export function formatYearMonth(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
