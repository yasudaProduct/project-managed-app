import { DailyWorkAllocation } from './daily-work-allocation';
import { TaskAllocation } from './task-allocation';
import { AssigneeWorkingCalendar, UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';

/**
 * ラベル付きの日別配分セット。
 * 1つのWBS(×担当者)分の計算結果に、表示用のプロジェクト情報を付与したもの。
 */
export interface LabeledAllocationSet {
  wbsId?: number;
  projectId?: string;
  projectName?: string;
  dailyAllocations: DailyWorkAllocation[];
}

/**
 * 複数WBSの作業負荷マージドメインサービス
 * @description
 * 複数WBS(プロジェクト)にまたがる同一ユーザーの日別配分を1本にマージする。
 * - 配分工数: 同一日の全セットを合算(タスク配分は連結)
 * - 稼働可能時間(分母): mergedCalendar(rate=1想定: 標準勤務時間−個人予定)で再計算し、
 *   各WBSの参画率キャップは適用しない
 * - タスク配分にはセットの projectName をラベルとして載せ替える
 */
export class WorkloadMergeService {
  mergeDailyAllocations(args: {
    sets: LabeledAllocationSet[];
    mergedCalendar: AssigneeWorkingCalendar;
    companyCalendar: CompanyCalendar;
    userSchedules: UserSchedule[];
    startDate: Date;
    endDate: Date;
  }): DailyWorkAllocation[] {
    const { sets, mergedCalendar, companyCalendar, userSchedules, startDate, endDate } = args;

    // セットごとに ymd → TaskAllocation[] を事前構築(日ループ内の走査を避ける)
    const allocationsByYmd = new Map<string, TaskAllocation[]>();
    for (const set of sets) {
      for (const daily of set.dailyAllocations) {
        if (daily.taskAllocations.length === 0) continue;
        const key = this.toYmd(daily.date);
        const list = allocationsByYmd.get(key) ?? [];
        for (const allocation of daily.taskAllocations) {
          list.push(
            TaskAllocation.create({
              taskId: allocation.taskId,
              taskName: allocation.taskName,
              allocatedHours: allocation.allocatedHours,
              totalHours: allocation.totalHours,
              periodStart: allocation.periodStart,
              periodEnd: allocation.periodEnd,
              projectName: set.projectName ?? allocation.projectName,
            })
          );
        }
        allocationsByYmd.set(key, list);
      }
    }

    const merged: DailyWorkAllocation[] = [];
    for (
      let currentDate = new Date(startDate);
      currentDate <= endDate;
      currentDate.setDate(currentDate.getDate() + 1)
    ) {
      const date = new Date(currentDate);
      const availableHours = mergedCalendar.getAvailableHours(date);
      const isCompanyHoliday = companyCalendar.isCompanyHoliday(date);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const schedulesForDay = userSchedules
        .filter(schedule => this.toYmd(schedule.date) === this.toYmd(date))
        .map(schedule => ({
          title: schedule.title,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          durationHours: this.calculateScheduleDuration(schedule.startTime, schedule.endTime),
        }));

      merged.push(
        DailyWorkAllocation.create({
          date,
          availableHours,
          taskAllocations: allocationsByYmd.get(this.toYmd(date)) ?? [],
          isWeekend,
          isCompanyHoliday,
          userSchedules: schedulesForDay,
        })
      );
    }

    return merged;
  }

  /**
   * スケジュールの期間を計算(時間単位)
   */
  private calculateScheduleDuration(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  }

  /**
   * 日付をローカルYYYY-MM-DD形式に変換(タイムゾーン起因のずれ防止)
   */
  private toYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
