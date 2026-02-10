import { CompanyCalendar } from './company-calendar';
import { BusinessDayPeriod } from './business-day-period';
import { UserSchedule } from './assignee-working-calendar';
import { WbsAssignee } from '../wbs/wbs-assignee';
import {
  MonthlyTaskAllocation,
  TaskForAllocation as ExtendedTaskForAllocation
} from '../wbs/monthly-task-allocation';
import { AllocationQuantizer } from '../wbs/allocation-quantizer';

/**
 * タスクの予定情報
 */
export interface TaskForAllocation {
  /** 予定開始日 */
  yoteiStart: Date;
  /** 予定終了日 */
  yoteiEnd: Date;
  /** 予定工数 */
  yoteiKosu: number;
}

/**
 * 営業日案分サービス
 */
export class WorkingHoursAllocationService {
  /**
   * コンストラクタ
   * @param companyCalendar 会社カレンダー
   */
  constructor(
    private readonly companyCalendar: CompanyCalendar
  ) { }

  /**
   * タスクの営業日案分を実行
   * @param task タスク
   * @param assignee 担当者
   * @param userSchedules 個人スケジュール
   * @returns 月別按分詳細
   */
  allocateTaskHoursByAssigneeWorkingDays(
    task: TaskForAllocation,
    assignee: WbsAssignee,
    userSchedules: UserSchedule[]
  ): Map<string, number> {
    // 終了日が未設定の場合は開始日と同じとする
    const endDate = task.yoteiEnd || task.yoteiStart;

    const period = new BusinessDayPeriod(
      task.yoteiStart,
      endDate,
      assignee,
      this.companyCalendar,
      userSchedules
    );

    // 営業日案分を実行
    return period.distributeHoursByBusinessDays(task.yoteiKosu);
  }

  allocateMultipleTasksHours(
    tasks: TaskForAllocation[],
    assignee: WbsAssignee,
    userSchedules: UserSchedule[]
  ): Map<string, Map<TaskForAllocation, number>> {
    const result = new Map<string, Map<TaskForAllocation, number>>();

    for (const task of tasks) {
      const allocatedHours = this.allocateTaskHoursByAssigneeWorkingDays(
        task,
        assignee,
        userSchedules
      );

      allocatedHours.forEach((hours, yearMonth) => {
        if (!result.has(yearMonth)) {
          result.set(yearMonth, new Map());
        }
        result.get(yearMonth)!.set(task, hours);
      });
    }

    return result;
  }

  getTotalAllocatedHoursByMonth(
    tasks: TaskForAllocation[],
    assignee: WbsAssignee,
    userSchedules: UserSchedule[]
  ): Map<string, number> {
    const monthlyTotals = new Map<string, number>();

    for (const task of tasks) {
      const allocatedHours = this.allocateTaskHoursByAssigneeWorkingDays(
        task,
        assignee,
        userSchedules
      );

      allocatedHours.forEach((hours, yearMonth) => {
        const currentTotal = monthlyTotals.get(yearMonth) || 0;
        monthlyTotals.set(yearMonth, currentTotal + hours);
      });
    }

    return monthlyTotals;
  }

  /**
   * タスクの詳細な月別按分を実行
   * @param task タスク
   * @param assignee 担当者（未割当の場合はundefined）
   * @param userSchedules 個人スケジュール
   * @param quantizer 量子化器（オプション）
   * @returns 月別タスク按分結果
   */
  allocateTaskWithDetails(
    task: ExtendedTaskForAllocation,
    assignee: WbsAssignee | undefined,
    userSchedules: UserSchedule[],
    quantizer?: AllocationQuantizer
  ): MonthlyTaskAllocation {
    // 単月/複数月の判定（予定期間基準）
    const isSingleMonth = this.isSingleMonth(task);

    if (isSingleMonth) {
      return this.allocateSingleMonth(task);
    }

    // 担当者未割当の場合はダミーを作成
    const targetAssignee = assignee || WbsAssignee.createUnassigned(task.wbsId);

    // 予定期間のBusinessDayPeriodを作成
    const yoteiPeriod = new BusinessDayPeriod(
      task.yoteiStart,
      task.yoteiEnd!,
      targetAssignee,
      this.companyCalendar,
      userSchedules
    );

    // 予定工数の按分
    const allocatedPlannedHoursRaw = this.allocateTaskHoursByAssigneeWorkingDays(
      {
        yoteiStart: task.yoteiStart,
        yoteiEnd: task.yoteiEnd!,
        yoteiKosu: task.yoteiKosu
      },
      targetAssignee,
      userSchedules
    );

    // 量子化（必要な場合）
    const allocatedPlannedHours = quantizer
      ? quantizer.quantize(allocatedPlannedHoursRaw)
      : allocatedPlannedHoursRaw;

    // 見通し工数の按分（見通し工数が設定されている場合）
    let allocatedForecastHours: Map<string, number> | undefined;
    if (task.forecastKosu && task.forecastKosu > 0) {
      const allocatedForecastHoursRaw = this.allocateTaskHoursByAssigneeWorkingDays(
        {
          yoteiStart: task.yoteiStart,
          yoteiEnd: task.yoteiEnd!,
          yoteiKosu: task.forecastKosu
        },
        targetAssignee,
        userSchedules
      );

      allocatedForecastHours = quantizer
        ? quantizer.quantize(allocatedForecastHoursRaw)
        : allocatedForecastHoursRaw;
    }

    // 基準工数の按分（基準期間が存在する場合）
    let allocatedBaselineHours: Map<string, number> | undefined;
    let kijunPeriod: BusinessDayPeriod | undefined;

    if (task.kijunStart && task.kijunEnd && task.kijunKosu) {
      // 基準期間が単月かチェック
      const isKijunSingleMonth = this.isSingleMonthPeriod(task.kijunStart, task.kijunEnd);

      if (isKijunSingleMonth) {
        // 基準期間が単月の場合は、その月に全額計上
        const kijunMonth = this.formatYearMonth(task.kijunStart);
        allocatedBaselineHours = new Map([[kijunMonth, task.kijunKosu]]);
      } else {
        // 基準期間が複数月の場合は按分
        kijunPeriod = new BusinessDayPeriod(
          task.kijunStart,
          task.kijunEnd,
          targetAssignee,
          this.companyCalendar,
          userSchedules
        );

        const allocatedBaselineHoursRaw = this.allocateTaskHoursByAssigneeWorkingDays(
          {
            yoteiStart: task.kijunStart,
            yoteiEnd: task.kijunEnd,
            yoteiKosu: task.kijunKosu
          },
          targetAssignee,
          userSchedules
        );

        allocatedBaselineHours = quantizer
          ? quantizer.quantize(allocatedBaselineHoursRaw)
          : allocatedBaselineHoursRaw;
      }
    }

    // MonthlyTaskAllocation を作成
    return MonthlyTaskAllocation.createMultiMonth(
      task,
      allocatedPlannedHours,
      yoteiPeriod,
      allocatedBaselineHours,
      kijunPeriod,
      allocatedForecastHours
    );
  }

  /**
   * ビジネスルール: 単月タスクの判定
   */
  private isSingleMonth(task: ExtendedTaskForAllocation): boolean {
    if (!task.yoteiEnd) return true;
    return this.isSingleMonthPeriod(task.yoteiStart, task.yoteiEnd);
  }

  /**
   * 指定された期間が単月かどうかを判定
   */
  private isSingleMonthPeriod(start: Date, end: Date): boolean {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return startDate.getFullYear() === endDate.getFullYear()
      && startDate.getMonth() === endDate.getMonth();
  }

  /**
   * 単月タスクの按分
   */
  private allocateSingleMonth(task: ExtendedTaskForAllocation): MonthlyTaskAllocation {
    const yearMonth = this.formatYearMonth(task.yoteiStart);
    return MonthlyTaskAllocation.createSingleMonth(task, yearMonth);
  }

  private formatYearMonth(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}