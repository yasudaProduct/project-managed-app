import { CompanyCalendar } from './company-calendar';
import { BusinessDayPeriod } from './business-day-period';
import { UserSchedule } from './assignee-working-calendar';
import { WbsAssignee } from '../wbs/wbs-assignee';
import { AssigneeGanttCalculationOptions } from '@/types/project-settings';

export interface TaskForAllocation {
  yoteiStart: Date;
  yoteiEnd: Date;
  yoteiKosu: number;
}

export class WorkingHoursAllocationService {
  constructor(
    private readonly companyCalendar: CompanyCalendar
  ) { }

  allocateTaskHoursByAssigneeWorkingDays(
    task: TaskForAllocation,
    assignee: WbsAssignee,
    userSchedules: UserSchedule[],
    calculationOptions: AssigneeGanttCalculationOptions
  ): Map<string, number> {
    // 終了日が未設定の場合は開始日と同じとする
    const endDate = task.yoteiEnd || task.yoteiStart;

    const period = new BusinessDayPeriod(
      task.yoteiStart,
      endDate,
      assignee,
      this.companyCalendar,
      userSchedules,
      calculationOptions
    );

    return period.distributeHoursByBusinessDays(task.yoteiKosu);
  }

  allocateMultipleTasksHours(
    tasks: TaskForAllocation[],
    assignee: WbsAssignee,
    userSchedules: UserSchedule[],
    calculationOptions: AssigneeGanttCalculationOptions
  ): Map<string, Map<TaskForAllocation, number>> {
    const result = new Map<string, Map<TaskForAllocation, number>>();

    for (const task of tasks) {
      const allocatedHours = this.allocateTaskHoursByAssigneeWorkingDays(
        task,
        assignee,
        userSchedules,
        calculationOptions
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
    userSchedules: UserSchedule[],
    calculationOptions: AssigneeGanttCalculationOptions
  ): Map<string, number> {
    const monthlyTotals = new Map<string, number>();

    for (const task of tasks) {
      const allocatedHours = this.allocateTaskHoursByAssigneeWorkingDays(
        task,
        assignee,
        userSchedules,
        calculationOptions
      );

      allocatedHours.forEach((hours, yearMonth) => {
        const currentTotal = monthlyTotals.get(yearMonth) || 0;
        monthlyTotals.set(yearMonth, currentTotal + hours);
      });
    }

    return monthlyTotals;
  }
}