import { CompanyCalendar } from './company-calendar';
import { BusinessDayPeriod } from './business-day-period';
import { UserSchedule } from './assignee-working-calendar';
import { WbsAssignee } from '../wbs/wbs-assignee';

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
}