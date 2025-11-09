import { BusinessDayPeriod } from '../calendar/business-day-period';

/**
 * 按分対象のタスク情報
 */
export interface TaskForAllocation {
  wbsId: number;
  taskId: string;
  taskName: string;
  phase?: string;
  yoteiStart: Date;
  yoteiEnd?: Date;
  yoteiKosu: number;
  jissekiKosu?: number;
}

/**
 * 月別按分詳細
 */
export interface MonthlyAllocationDetail {
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
   */
  static createMultiMonth(
    task: TaskForAllocation,
    allocatedHours: Map<string, number>,
    period: BusinessDayPeriod
  ): MonthlyTaskAllocation {
    const allocations = new Map<string, MonthlyAllocationDetail>();
    const startYearMonth = formatYearMonth(task.yoteiStart);
    const businessDaysByMonth = period.getBusinessDaysByMonth();
    const availableHoursByMonth = period.getAvailableHoursByMonth();
    const totalAvailableHours = Array.from(availableHoursByMonth.values())
      .reduce((sum, h) => sum + h, 0);

    allocatedHours.forEach((plannedHours, yearMonth) => {
      const workingDays = businessDaysByMonth.get(yearMonth) || 0;
      const availableHours = availableHoursByMonth.get(yearMonth) || 0;
      const allocationRatio = totalAvailableHours > 0
        ? availableHours / totalAvailableHours
        : 0;

      // ビジネスルール: 実績工数は開始月のみ計上
      const actualHours = yearMonth === startYearMonth
        ? (task.jissekiKosu || 0)
        : 0;

      allocations.set(yearMonth, {
        plannedHours,
        actualHours,
        workingDays,
        availableHours,
        allocationRatio
      });
    });

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
