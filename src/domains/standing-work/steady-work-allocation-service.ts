import { SteadyWorkPlan } from "./steady-work-plan";
import { DailyWorkAllocation } from "@/domains/assignee-workload/daily-work-allocation";
import { TaskAllocation } from "@/domains/assignee-workload/task-allocation";
import { AssigneeWorkingCalendar, UserSchedule } from "@/domains/calendar/assignee-working-calendar";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";

/** 定常枠を持つタスク（配分計算の入力） */
export interface SteadyWorkTaskInput {
  taskId: number;
  taskName: string;
  plans: SteadyWorkPlan[];
}

/**
 * 定常枠の日別配分ドメインサービス
 * @description
 * 定常枠（docs/plans/non-project-work-management.md §6.4）を日別の負荷に展開する。
 * - PER_DAY: 稼働日（会社休日・全日休暇でない日）に固定値。半休などで稼働が減っても減らさない
 * - PER_MONTH: 月額 × 当日の稼働可能時間 ÷ その月の稼働可能時間合計
 * - 参画率は見ない（rate=1 のカレンダー。枠が負荷そのもの）
 */
export class SteadyWorkAllocationService {
  calculateDailyAllocations(
    tasks: SteadyWorkTaskInput[],
    assignee: WbsAssignee,
    userSchedules: UserSchedule[],
    companyCalendar: CompanyCalendar,
    startDate: Date,
    endDate: Date
  ): DailyWorkAllocation[] {
    const workingCalendar = new AssigneeWorkingCalendar(
      WbsAssignee.create({ wbsId: assignee.wbsId, userId: assignee.userId, rate: 1 }),
      companyCalendar,
      userSchedules
    );
    const monthlyAvailableCache = new Map<string, number>();
    const dailyAllocations: DailyWorkAllocation[] = [];

    for (
      let currentDate = new Date(startDate);
      currentDate <= endDate;
      currentDate.setDate(currentDate.getDate() + 1)
    ) {
      const date = new Date(currentDate);
      const availableHours = workingCalendar.getAvailableHours(date);
      const isCompanyHoliday = companyCalendar.isCompanyHoliday(date);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isWorkingDay = workingCalendar.isWorkingDay(date);

      const taskAllocations: TaskAllocation[] = [];
      for (const task of tasks) {
        const plan = task.plans.find((candidate) => candidate.isActiveOn(date));
        if (!plan || !isWorkingDay) continue;

        const allocatedHours =
          plan.unit === "PER_DAY"
            ? plan.hours
            : this.prorateMonthly(plan.hours, date, availableHours, workingCalendar, monthlyAvailableCache);
        if (allocatedHours <= 0) continue;

        taskAllocations.push(
          TaskAllocation.create({
            taskId: String(task.taskId),
            taskName: task.taskName,
            allocatedHours,
            totalHours: plan.hours,
            periodStart: plan.validFrom,
            periodEnd: plan.validTo,
          })
        );
      }

      dailyAllocations.push(
        DailyWorkAllocation.create({
          date,
          availableHours,
          taskAllocations,
          isWeekend,
          isCompanyHoliday,
          userSchedules: this.schedulesForDay(userSchedules, date),
        })
      );
    }

    return dailyAllocations;
  }

  /**
   * 通常タスク分の日別配分（base）に定常枠分（extra）を日付ごとに合流させる。
   * base に無い日の extra は無視する。入力の配列・要素は変更しない。
   */
  mergeDailyAllocations(
    base: DailyWorkAllocation[],
    extra: DailyWorkAllocation[]
  ): DailyWorkAllocation[] {
    const extraByYmd = new Map(extra.map((daily) => [toYmd(daily.date), daily]));
    return base.map((daily) => {
      const additional = extraByYmd.get(toYmd(daily.date));
      const merged = DailyWorkAllocation.create({
        date: daily.date,
        availableHours: daily.availableHours,
        taskAllocations: [...daily.taskAllocations],
        isWeekend: daily.isWeekend,
        isCompanyHoliday: daily.isCompanyHoliday,
        userSchedules: daily.userSchedules,
      });
      for (const allocation of additional?.taskAllocations ?? []) {
        merged.addTaskAllocation(allocation);
      }
      return merged;
    });
  }

  /** 月額 × 当日の稼働可能時間 ÷ その月の稼働可能時間合計 */
  private prorateMonthly(
    monthlyHours: number,
    date: Date,
    availableToday: number,
    workingCalendar: AssigneeWorkingCalendar,
    cache: Map<string, number>
  ): number {
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    let monthlyAvailable = cache.get(monthKey);
    if (monthlyAvailable === undefined) {
      monthlyAvailable = 0;
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      for (
        let day = new Date(monthStart);
        day.getMonth() === monthStart.getMonth();
        day.setDate(day.getDate() + 1)
      ) {
        monthlyAvailable += workingCalendar.getAvailableHours(new Date(day));
      }
      cache.set(monthKey, monthlyAvailable);
    }
    if (monthlyAvailable <= 0) return 0;
    return (monthlyHours * availableToday) / monthlyAvailable;
  }

  private schedulesForDay(userSchedules: UserSchedule[], date: Date) {
    return userSchedules
      .filter((schedule) => schedule.date.toDateString() === date.toDateString())
      .map((schedule) => ({
        title: schedule.title,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        durationHours: scheduleDurationHours(schedule.startTime, schedule.endTime),
      }));
  }
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function scheduleDurationHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  return ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;
}
