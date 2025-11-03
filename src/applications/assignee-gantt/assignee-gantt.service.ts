import { injectable, inject } from 'inversify';
import { IAssigneeGanttService } from './iassignee-gantt.service';
import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { WorkloadCalculationService } from '@/domains/assignee-workload/workload-calculation.service';
import { WorkloadWarningService, WorkloadWarning } from '@/domains/assignee-workload/workload-warning.service';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { SYMBOL } from '@/types/symbol';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';

/**
 * 担当者ガントサービス
 * 担当者の作業負荷を可視化するためのサービス
 */
@injectable()
export class AssigneeGanttService implements IAssigneeGanttService {
  private readonly workloadCalculationService: WorkloadCalculationService;
  private readonly workloadWarningService: WorkloadWarningService;

  constructor(
    @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
    @inject(SYMBOL.IUserScheduleRepository) private readonly userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.ICompanyHolidayRepository) private readonly companyHolidayRepository: ICompanyHolidayRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository
  ) {
    this.workloadCalculationService = new WorkloadCalculationService();
    this.workloadWarningService = new WorkloadWarningService();
  }

  /**
   * 担当者の作業負荷を取得
   * @param wbsId WBS ID
   * @param startDate 開始日
   * @param endDate 終了日
   * @returns 担当者の作業負荷の配列
   * @description
   * 指定されたWBSに紐づく担当者ごとに、指定期間内の日別作業負荷を計算して返す
   * 処理フロー：<br/>
   * 1. WBSに紐づくタスクと担当者情報を取得 <br/>
   * 2. 会社休日と担当者の個人予定を取得 <br/>
   * 3. 各担当者について、以下を実施 <br/>
   * 　a. 担当者に割り当てられたタスクを抽出 <br/>
   * 　b. 担当者の個人予定を抽出 <br/>
   * 　c. 指定期間内の日別にループし、以下を実施 <br/>
   * 　　i. その日の稼働可能時間を計算（会社休日・個人予定・稼働率を考慮） <br/>
   * 　　ii. その日にアサインされたタスクの配分を計算 <br/>
   * 　　iii. 日別作業割り当てを作成 <br/>
   * 4. 最終的に担当者別の作業負荷配列を返す <br/>
   */
  async getAssigneeWorkloads(
    wbsId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AssigneeWorkload[]> {
    // 1. WBSに紐づくタスクと担当者情報を取得
    const [tasks, assignees] = await Promise.all([
      this.taskRepository.findByWbsId(wbsId),
      this.wbsAssigneeRepository.findByWbsId(wbsId)
    ]);

    if (!assignees || assignees.length === 0) {
      return [];
    }

    // 2. 会社休日と担当者の個人予定を取得
    const [userSchedules, companyHolidays] = await Promise.all([
      this.getUserSchedulesForAssignees(assignees, startDate, endDate),
      this.companyHolidayRepository.findByDateRange(startDate, endDate)
    ]);
    const companyCalendar = new CompanyCalendar(companyHolidays);

    // 担当者別に作業負荷を計算
    const workloads: AssigneeWorkload[] = [];
    for (const assignee of assignees) {
      // 担当者に割り当てられたタスクを取得
      const assigneeTasks = this.getTasksByAssignee(tasks, assignee.id!);

      // 担当者の個人予定を取得
      const assigneeSchedules = this.getUserSchedulesByAssignee(userSchedules, assignee.userId);

      // 担当者の作業負荷を計算
      const dailyAllocations = this.workloadCalculationService.calculateDailyAllocations(
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

  /**
   * 担当者別の警告を取得
   * @param wbsId 
   * @param startDate 
   * @param endDate 
   * @returns 
   * @description
   * 担当者に割り当てられたタスクの予定開始日〜終了日の期間内に<br/>
   * 会社休日や個人予定を考慮した稼働可能日が存在しない場合に警告を返す
   * 処理フロー：<br/>
   * 1. WBSに紐づくタスクと担当者情報を取得 <br/>
   * 2. 会社休日を取得し、カレンダーに設定 <br/>
   * 3. 各タスクについて、予定開始日〜終了日の期間内に稼働可能日が存在するか判定 <br/>
   * 　- 担当者が割り当てられている場合、個人予定も考慮した稼働可能時間の総和で判定 <br/>
   * 　- 担当者が割り当てられていない場合、会社休日のみで判定 <br/>
   * 4. 稼働可能日が存在しない場合、警告リストに追加 <br/>
   * 5. 最終的に警告リストを返す <br/>
   */
  async getAssigneeWarnings(
    wbsId: number,
    startDate: Date,
    endDate: Date
  ): Promise<WorkloadWarning[]> {
    const [tasks, assignees] = await Promise.all([
      this.taskRepository.findByWbsId(wbsId),
      this.wbsAssigneeRepository.findByWbsId(wbsId)
    ]);

    // 会社休日を取得
    const companyHolidays = await this.companyHolidayRepository.findByDateRange(startDate, endDate);
    const companyCalendar = new CompanyCalendar(companyHolidays);

    // 担当者マップを作成
    const assigneeMap = new Map<number, WbsAssignee>();
    for (const assignee of assignees) {
      if (assignee.id != null) {
        assigneeMap.set(assignee.id, assignee);
      }
    }

    // 個人予定を取得してマップ化
    const userSchedulesMap = new Map<string, UserSchedule[]>();
    for (const assignee of assignees) {
      const schedules = await this.userScheduleRepository.findByUserIdAndDateRange(
        assignee.userId,
        startDate,
        endDate
      );
      userSchedulesMap.set(assignee.userId, schedules);
    }

    // ドメインサービスで警告を計算
    return this.workloadWarningService.validateTasksFeasibility(
      tasks,
      assigneeMap,
      companyCalendar,
      userSchedulesMap
    );
  }

  /**
   * 担当者の作業負荷を取得
   * @param wbsId 
   * @param assigneeId 
   * @param startDate 
   * @param endDate 
   * @returns 
  */
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
}