import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { ICrossWbsWorkloadService, ExternalWorkloadQuery } from './icross-wbs-workload-service';
import type { ITargetWbsQueryRepository, TargetWbsInfo } from './itarget-wbs-query-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { WorkloadCalculationService } from '@/domains/assignee-workload/workload-calculation-service';
import { WorkloadMergeService, LabeledAllocationSet } from '@/domains/assignee-workload/workload-merge-service';
import { AssigneeWorkingCalendar, UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';

/**
 * 横断ワークロードサービス
 * @description
 * 未開始・進行中プロジェクトの最新WBSを対象に、WBS横断の担当者負荷を算出する。
 * 各WBS内の按分は既存ロジック(そのWBSの参画率カレンダー)に従い、
 * 合算時の分母のみ rate=1 カレンダー(標準勤務時間−個人予定)で再計算する。
 */
@injectable()
export class CrossWbsWorkloadService implements ICrossWbsWorkloadService {
  private readonly workloadCalculationService = new WorkloadCalculationService();
  private readonly workloadMergeService = new WorkloadMergeService();

  constructor(
    @inject(SYMBOL.ITargetWbsQueryRepository) private readonly targetWbsQueryRepository: ITargetWbsQueryRepository,
    @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.IUserScheduleRepository) private readonly userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.ICompanyHolidayRepository) private readonly companyHolidayRepository: ICompanyHolidayRepository,
    @inject(SYMBOL.ISystemSettingsRepository) private readonly systemSettingsRepository: ISystemSettingsRepository,
    @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository
  ) {}

  async resolveTargetWbs(excludeProjectId?: string): Promise<TargetWbsInfo[]> {
    const targets = await this.targetWbsQueryRepository.findTargetWbs();
    if (!excludeProjectId) return targets;
    return targets.filter(target => target.projectId !== excludeProjectId);
  }

  async getCrossProjectUserWorkloads(startDate: Date, endDate: Date): Promise<AssigneeWorkload[]> {
    const targets = await this.resolveTargetWbs();
    if (targets.length === 0) return [];

    const wbsIds = targets.map(target => target.wbsId);
    const [assignees, tasks, systemSettings, companyHolidays] = await Promise.all([
      this.wbsAssigneeRepository.findByWbsIds(wbsIds),
      this.taskRepository.findActiveByWbsIds(wbsIds, { periodOverlaps: { start: startDate, end: endDate } }),
      this.systemSettingsRepository.get(),
      this.companyHolidayRepository.findByDateRange(startDate, endDate),
    ]);
    if (assignees.length === 0) return [];

    const users = this.collectUsers(assignees);
    const schedulesByUser = await this.fetchSchedulesByUser([...users.keys()], startDate, endDate);
    const companyCalendar = new CompanyCalendar(systemSettings.standardWorkingHours, companyHolidays);
    const setsByUser = this.buildAllocationSets({
      targets,
      assignees,
      tasks,
      schedulesByUser,
      companyCalendar,
      startDate,
      endDate,
    });

    const workloads = [...users.values()].map(user => {
      const schedules = schedulesByUser.get(user.userId) ?? [];
      const merged = this.workloadMergeService.mergeDailyAllocations({
        sets: setsByUser.get(user.userId) ?? [],
        mergedCalendar: this.createMergedCalendar(user.userId, companyCalendar, schedules),
        companyCalendar,
        userSchedules: schedules,
        startDate,
        endDate,
      });
      return AssigneeWorkload.create({
        assigneeId: user.userId,
        assigneeName: user.userName,
        dailyAllocations: merged,
        assigneeRate: 1,
      });
    });

    return workloads.sort((a, b) => a.assigneeName.localeCompare(b.assigneeName, 'ja'));
  }

  async getWbsWorkloadsWithExternal(wbsId: number, startDate: Date, endDate: Date): Promise<AssigneeWorkload[]> {
    const wbs = await this.wbsRepository.findById(wbsId);
    if (!wbs) throw new Error('WBSが見つかりません');

    const [currentTasks, currentAssignees, systemSettings, companyHolidays, targets] = await Promise.all([
      this.taskRepository.findByWbsId(wbsId),
      this.wbsAssigneeRepository.findByWbsId(wbsId),
      this.systemSettingsRepository.get(),
      this.companyHolidayRepository.findByDateRange(startDate, endDate),
      // 現プロジェクトの全WBSを対象集合から除外する(2重計上防止)
      this.resolveTargetWbs(wbs.projectId),
    ]);
    if (currentAssignees.length === 0) return [];

    const userIds = [...new Set(currentAssignees.map(assignee => assignee.userId))];
    const schedulesByUser = await this.fetchSchedulesByUser(userIds, startDate, endDate);
    const companyCalendar = new CompanyCalendar(systemSettings.standardWorkingHours, companyHolidays);

    // 外部(他プロジェクト対象WBS)の配分セット: 現WBS担当者のユーザーに限定して計算する
    let externalSetsByUser = new Map<string, LabeledAllocationSet[]>();
    if (targets.length > 0) {
      const targetIds = targets.map(target => target.wbsId);
      const [externalAssignees, externalTasks] = await Promise.all([
        this.wbsAssigneeRepository.findByWbsIds(targetIds),
        this.taskRepository.findActiveByWbsIds(targetIds, { periodOverlaps: { start: startDate, end: endDate } }),
      ]);
      const userIdSet = new Set(userIds);
      externalSetsByUser = this.buildAllocationSets({
        targets,
        assignees: externalAssignees.filter(assignee => userIdSet.has(assignee.userId)),
        tasks: externalTasks,
        schedulesByUser,
        companyCalendar,
        startDate,
        endDate,
      });
    }

    // 行は現WBSの担当者のみ。同一ユーザーが現WBSに複数行ある場合、
    // 外部負荷は各行に乗る(稀なデータ形状として許容)。
    return currentAssignees.map(assignee => {
      const schedules = schedulesByUser.get(assignee.userId) ?? [];
      const currentDaily = this.workloadCalculationService.calculateDailyAllocations(
        currentTasks.filter(task => task.assigneeId === assignee.id),
        assignee,
        schedules,
        companyCalendar,
        startDate,
        endDate
      );
      const merged = this.workloadMergeService.mergeDailyAllocations({
        sets: [
          { dailyAllocations: currentDaily }, // 現WBS分はラベルなし
          ...(externalSetsByUser.get(assignee.userId) ?? []),
        ],
        mergedCalendar: this.createMergedCalendar(assignee.userId, companyCalendar, schedules),
        companyCalendar,
        userSchedules: schedules,
        startDate,
        endDate,
      });
      return AssigneeWorkload.create({
        assigneeId: assignee.userId,
        assigneeName: assignee.userName || assignee.userId,
        dailyAllocations: merged,
        assigneeRate: 1,
      });
    });
  }

  async getExternalAllocationSets(query: ExternalWorkloadQuery): Promise<Map<string, LabeledAllocationSet[]>> {
    if (query.userIds && query.userIds.length === 0) return new Map();

    const targets = await this.resolveTargetWbs(query.excludeProjectId);
    if (targets.length === 0) return new Map();

    const wbsIds = targets.map(target => target.wbsId);
    const [assignees, tasks, systemSettings, companyHolidays] = await Promise.all([
      this.wbsAssigneeRepository.findByWbsIds(wbsIds),
      this.taskRepository.findActiveByWbsIds(wbsIds, {
        periodOverlaps: { start: query.startDate, end: query.endDate },
      }),
      this.systemSettingsRepository.get(),
      this.companyHolidayRepository.findByDateRange(query.startDate, query.endDate),
    ]);

    const userIdFilter = query.userIds ? new Set(query.userIds) : undefined;
    const targetAssignees = userIdFilter
      ? assignees.filter(assignee => userIdFilter.has(assignee.userId))
      : assignees;
    if (targetAssignees.length === 0) return new Map();

    const userIds = [...new Set(targetAssignees.map(assignee => assignee.userId))];
    const schedulesByUser = await this.fetchSchedulesByUser(userIds, query.startDate, query.endDate);
    const companyCalendar = new CompanyCalendar(systemSettings.standardWorkingHours, companyHolidays);

    return this.buildAllocationSets({
      targets,
      assignees: targetAssignees,
      tasks,
      schedulesByUser,
      companyCalendar,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  /**
   * (対象WBS×担当者行)ごとに既存ロジックで日別配分を計算し、
   * ユーザーIDごとのラベル付きセットへまとめる。
   * タスクの照合は WbsTask.assigneeId = WbsAssignee.id(join行PK)で行う。
   */
  private buildAllocationSets(args: {
    targets: TargetWbsInfo[];
    assignees: WbsAssignee[];
    tasks: Task[];
    schedulesByUser: Map<string, UserSchedule[]>;
    companyCalendar: CompanyCalendar;
    startDate: Date;
    endDate: Date;
  }): Map<string, LabeledAllocationSet[]> {
    const targetByWbsId = new Map(args.targets.map(target => [target.wbsId, target]));
    const setsByUser = new Map<string, LabeledAllocationSet[]>();

    for (const assignee of args.assignees) {
      if (assignee.id == null) continue;
      const target = targetByWbsId.get(assignee.wbsId);
      if (!target) continue;

      const assigneeTasks = args.tasks.filter(
        task => task.wbsId === assignee.wbsId && task.assigneeId === assignee.id
      );
      if (assigneeTasks.length === 0) continue;

      const schedules = args.schedulesByUser.get(assignee.userId) ?? [];
      const dailyAllocations = this.workloadCalculationService.calculateDailyAllocations(
        assigneeTasks,
        assignee,
        schedules,
        args.companyCalendar,
        args.startDate,
        args.endDate
      );

      const sets = setsByUser.get(assignee.userId) ?? [];
      sets.push({
        wbsId: target.wbsId,
        projectId: target.projectId,
        projectName: target.projectName,
        dailyAllocations,
      });
      setsByUser.set(assignee.userId, sets);
    }

    return setsByUser;
  }

  /** 重複を除いたユーザー一覧(表示名は最初に現れた担当者行のものを使用) */
  private collectUsers(assignees: WbsAssignee[]): Map<string, { userId: string; userName: string }> {
    const users = new Map<string, { userId: string; userName: string }>();
    for (const assignee of assignees) {
      if (!users.has(assignee.userId)) {
        users.set(assignee.userId, {
          userId: assignee.userId,
          userName: assignee.userName || assignee.userId,
        });
      }
    }
    return users;
  }

  private async fetchSchedulesByUser(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, UserSchedule[]>> {
    if (userIds.length === 0) return new Map();
    const schedules = await this.userScheduleRepository.findByUsersAndDateRange(userIds, startDate, endDate);
    const byUser = new Map<string, UserSchedule[]>();
    for (const schedule of schedules) {
      const list = byUser.get(schedule.userId) ?? [];
      list.push(schedule);
      byUser.set(schedule.userId, list);
    }
    return byUser;
  }

  /** 合算分母用の rate=1 カレンダー(標準勤務時間−個人予定。参画率キャップなし) */
  private createMergedCalendar(
    userId: string,
    companyCalendar: CompanyCalendar,
    userSchedules: UserSchedule[]
  ): AssigneeWorkingCalendar {
    return new AssigneeWorkingCalendar(
      WbsAssignee.create({ userId, rate: 1 }),
      companyCalendar,
      userSchedules
    );
  }
}
