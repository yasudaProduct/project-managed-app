import { injectable, inject } from 'inversify';
import { IAssigneeGanttService } from './iassignee-gantt.service';
import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { DailyWorkAllocation } from '@/domains/assignee-workload/daily-work-allocation';
import { TaskAllocation } from '@/domains/assignee-workload/task-allocation';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import * as iwbsAssigneeRepository from '@/applications/wbs/iwbs-assignee-repository';
import { SYMBOL } from '@/types/symbol';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { CompanyCalendar, CompanyHoliday } from '@/domains/calendar/company-calendar';
import { AssigneeWorkingCalendar } from '@/domains/calendar/assignee-working-calendar';

@injectable()
export class AssigneeGanttService implements IAssigneeGanttService {
  constructor(
    @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
    @inject(SYMBOL.IUserScheduleRepository) private readonly userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.ICompanyHolidayRepository) private readonly companyHolidayRepository: ICompanyHolidayRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: iwbsAssigneeRepository.IWbsAssigneeRepository
  ) {}

  async getAssigneeWorkloads(
    wbsId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AssigneeWorkload[]> {
    // 基本データを取得
    const [tasks, assignees] = await Promise.all([
      this.taskRepository.findByWbsId(wbsId),
      this.wbsAssigneeRepository.findByWbsId(wbsId)
    ]);

    if (!assignees || assignees.length === 0) {
      return [];
    }

    const [userSchedules, companyHolidays] = await Promise.all([
      this.getUserSchedulesForAssignees(assignees, startDate, endDate),
      this.companyHolidayRepository.findByDateRange(startDate, endDate)
    ]);
    const companyCalendar = new CompanyCalendar(companyHolidays);

    // 担当者別に作業負荷を計算
    const workloads: AssigneeWorkload[] = [];
    
    for (const assignee of assignees) {
      const assigneeTasks = this.getTasksByAssignee(tasks, assignee.id!);
      const assigneeSchedules = this.getUserSchedulesByAssignee(userSchedules, assignee.userId);

      // 1日の作業割り当てを計算
      const dailyAllocations = this.calculateDailyAllocations(
        assigneeTasks,
        assignee,
        assigneeSchedules,
        companyCalendar,
        startDate,
        endDate
      );

      // 担当者の作業負荷を作成
      const workload = AssigneeWorkload.create({
        assigneeId: assignee.userId,
        assigneeName: assignee.userName || assignee.userId,
        dailyAllocations,
        assigneeRate: assignee.getRate(),
      });

      workloads.push(workload);
    }

    return workloads;
  }

  async getAssigneeWorkload(
    wbsId: number,
    assigneeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AssigneeWorkload> {
    const workloads = await this.getAssigneeWorkloads(wbsId, startDate, endDate);
    const workload = workloads.find(w => w.assigneeId === assigneeId);
    
    if (!workload) {
      throw new Error(`担当者が見つかりません: ${assigneeId}`);
    }

    return workload;
  }

  private async getUserSchedulesForAssignees(
    assignees: WbsAssignee[],
    startDate: Date,
    endDate: Date
  ): Promise<UserSchedule[]> {
    const userIds = assignees.map(a => a.userId);
    if (userIds.length === 0) {
      return [];
    }
    return await this.userScheduleRepository.findByUsersAndDateRange(userIds, startDate, endDate);
  }

  private getTasksByAssignee(tasks: Task[], assigneeId: number): Task[] {
    return tasks.filter(task => task.assigneeId === assigneeId);
  }

  private getUserSchedulesByAssignee(schedules: UserSchedule[], userId: string): UserSchedule[] {
    return schedules.filter(schedule => schedule.userId === userId);
  }

  /**
   * 担当者の作業負荷を計算
   */
  private calculateDailyAllocations(
    tasks: Task[],
    assignee: WbsAssignee,
    userSchedules: UserSchedule[],
    companyCalendar: CompanyCalendar,
    startDate: Date,
    endDate: Date
  ): DailyWorkAllocation[] {
    const dailyAllocations: DailyWorkAllocation[] = [];
    const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, userSchedules);

    // 日付ごとにループ
    for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
      // その日の稼働可能時間（rateは考慮しない）
      const availableHours = workingCalendar.getAvailableHours(currentDate);

      const isCompanyHoliday = companyCalendar.isCompanyHoliday(currentDate);
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // 当日のユーザースケジュール（ツールチップ表示用）
      const schedulesForDay = userSchedules
        .filter(schedule => schedule.date.toDateString() === currentDate.toDateString())
        .map(schedule => ({
          title: schedule.title,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          durationHours: this.calculateScheduleDuration(schedule.startTime, schedule.endTime)
        }));

      // その日にアサインされたタスクの配分を計算
      const taskAllocations = this.calculateTaskAllocationsForDate(
        tasks,
        new Date(currentDate),
        availableHours
      );

      const dailyAllocation = DailyWorkAllocation.create({
        date: new Date(currentDate),
        availableHours,
        taskAllocations,
        isWeekend,
        isCompanyHoliday,
        userSchedules: schedulesForDay
      });

      dailyAllocations.push(dailyAllocation);
    }

    return dailyAllocations;
  }

  private calculateScheduleDuration(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60; // 時間単位で返す
  }

  private calculateTaskAllocationsForDate(
    tasks: Task[],
    date: Date,
    availableHours: number
  ): TaskAllocation[] {
    const taskAllocations: TaskAllocation[] = [];

    // その日に実行されるタスクを抽出
    const activeTasks = tasks.filter(task => this.isTaskActiveOnDate(task, date));

    if (activeTasks.length === 0 || availableHours === 0) {
      return taskAllocations;
    }

    // 各タスクの工数を日別に按分
    for (const task of activeTasks) {
      const allocatedHours = this.calculateTaskHoursForDate(task, date, availableHours, activeTasks.length);
      if (allocatedHours > 0) {
        const taskAllocation = TaskAllocation.create({
          taskId: task.id?.toString() || '0',
          taskName: task.name,
          allocatedHours
        });
        taskAllocations.push(taskAllocation);
      }
    }

    return taskAllocations;
  }

  private isTaskActiveOnDate(task: Task, date: Date): boolean {
    const yoteiStart = task.getYoteiStart();
    const yoteiEnd = task.getYoteiEnd();
    if (!yoteiStart || !yoteiEnd) {
      return false;
    }
    return date >= yoteiStart && date <= yoteiEnd;
  }

  private calculateTaskHoursForDate(
    task: Task,
    date: Date,
    availableHours: number,
    totalActiveTasks: number
  ): number {
    const yoteiStart = task.getYoteiStart();
    const yoteiEnd = task.getYoteiEnd();
    const totalHours = task.getYoteiKosus();

    if (!yoteiStart || !yoteiEnd || !totalHours) {
      return 0;
    }

    // タスク期間内の営業日数を計算（簡略化版）終了日-開始日+1日
    const taskDurationDays = Math.ceil((yoteiEnd.getTime() - yoteiStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    // 1日あたりの工数を計算（平均分散）
    const hoursPerDay = totalHours / taskDurationDays;

    // 利用可能時間を超えないよう調整（rateは考慮しない）
    return Math.min(hoursPerDay, availableHours / totalActiveTasks);
  }
}