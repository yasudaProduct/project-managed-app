import { injectable, inject } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type { IWbsRepository } from "../wbs/iwbs-repository";
import type { IProjectRepository } from "../projects/iproject-repository";
import type { ITaskRepository } from "../task/itask-repository";
import type { ITaskDependencyRepository } from "../task-dependency/itask-dependency-repository";
import type { IWbsAssigneeRepository } from "../wbs/iwbs-assignee-repository";
import type { IUserScheduleRepository } from "../calendar/iuser-schedule-repository";
import type { ICompanyHolidayRepository } from "../calendar/icompany-holiday-repository";
import type { ISystemSettingsRepository } from "../system-settings/isystem-settings-repository";
import type { ISchedulingSettingsRepository } from "./ischeduling-settings-repository";
import type {
  ISchedulingApplicationService,
  ScheduleCalculationParams,
  ScheduleCalculationResult,
  SchedulePreviewRecalcParams,
  SchedulePreviewRecalcResult,
  ScheduledTaskDto,
} from "./ischeduling-application-service";
import {
  CompanyCalendar,
  type CompanyHoliday,
} from "@/domains/calendar/company-calendar";
import {
  AssigneeWorkingCalendar,
  type UserSchedule,
} from "@/domains/calendar/assignee-working-calendar";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import { forwardSchedule } from "@/domains/task-scheduling/forward-scheduler";
import { ExternalLoadAwareCalendar } from "@/domains/task-scheduling/external-load-aware-calendar";
import {
  type WorkingCalendar,
  addCalendarDays,
  toDateKey,
} from "@/domains/task-scheduling/working-calendar-walker";
import { SchedulingPreconditionService } from "@/domains/task-scheduling/scheduling-precondition-service";
import type { ScheduledTask } from "@/domains/task-scheduling/scheduled-result";
import type { SchedulingTask } from "@/domains/task-scheduling/scheduling-task";
import {
  WorkloadCalculationService,
  type ScheduleAllocationInput,
} from "@/domains/assignee-workload/workload-calculation-service";
import {
  WorkloadMergeService,
  type LabeledAllocationSet,
} from "@/domains/assignee-workload/workload-merge-service";
import { AssigneeWorkload } from "@/domains/assignee-workload/assignee-workload";
import { toSchedulingTask } from "./scheduling-task-mapper";
import { resolveBaselineDate } from "./baseline-resolver";
import { convertScheduledTasksToTsv } from "./tsv-converter";
import type { WorkloadData } from "../assignee-gantt/workload-data";
import { toWorkloadData } from "../assignee-gantt/workload-data-mapper";
import type { ICrossWbsWorkloadService } from "../cross-wbs-workload/icross-wbs-workload-service";

@injectable()
export class SchedulingApplicationService
  implements ISchedulingApplicationService
{
  private readonly workloadCalculationService = new WorkloadCalculationService();
  private readonly workloadMergeService = new WorkloadMergeService();

  constructor(
    @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository,
    @inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository,
    @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
    @inject(SYMBOL.ITaskDependencyRepository) private readonly taskDependencyRepository: ITaskDependencyRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.IUserScheduleRepository) private readonly userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.ICompanyHolidayRepository) private readonly companyHolidayRepository: ICompanyHolidayRepository,
    @inject(SYMBOL.ISystemSettingsRepository) private readonly systemSettingsRepository: ISystemSettingsRepository,
    @inject(SYMBOL.ISchedulingSettingsRepository) private readonly schedulingSettingsRepository: ISchedulingSettingsRepository,
    @inject(SYMBOL.ICrossWbsWorkloadService) private readonly crossWbsWorkloadService: ICrossWbsWorkloadService
  ) {}

  async calculateSchedule(
    wbsId: number,
    params: ScheduleCalculationParams
  ): Promise<ScheduleCalculationResult> {
    const wbs = await this.wbsRepository.findById(wbsId);
    if (!wbs) throw new Error("WBSが見つかりません");
    if (!wbs.projectId)
      throw new Error("WBSに紐づくプロジェクトが見つかりません");

    const project = await this.projectRepository.findById(wbs.projectId);
    if (!project) throw new Error("プロジェクトが見つかりません");
    if (!project.startDate)
      throw new Error("プロジェクトの基準開始日が設定されていません");

    const baselineDate = resolveBaselineDate(
      params.baselineMode,
      project.startDate,
      new Date(),
      params.baselineDateIso
    );

    const schedulingSettings =
      await this.schedulingSettingsRepository.getByProjectId(wbs.projectId);

    const [tasks, dependencies, assignees, systemSettings] = await Promise.all([
      this.taskRepository.findActiveByWbsId(wbsId),
      this.taskDependencyRepository.findByWbsId(wbsId),
      this.wbsAssigneeRepository.findByWbsId(wbsId),
      this.systemSettingsRepository.get(),
    ]);

    const { companyHolidays, userSchedules, rangeStart, rangeEnd } =
      await this.loadCalendarInputs(assignees, baselineDate);

    const companyCalendar = new CompanyCalendar(
      systemSettings.standardWorkingHours,
      companyHolidays
    );

    // 他WBS(未開始・進行中プロジェクトの最新WBS)の負荷を取得する
    const externalSetsByUser = await this.loadExternalSets(
      params.considerOtherWbsLoad ?? true,
      assignees,
      wbs.projectId,
      rangeStart,
      rangeEnd
    );
    const externalDailyByAssignee = this.buildExternalDailyHours(
      assignees,
      externalSetsByUser
    );

    // assigneeId(wbs_assignee.id) → 稼働カレンダー
    // 外部負荷がある担当者は、参画率を「取り分の予約」として扱うカレンダーへ差し替える:
    //   available = min(標準×参画率, (標準−個人予定) − 外部負荷)
    // (参画率キャップ後から外部負荷を引くと、0.5/0.5掛け持ちの取り分が不当に0になるため)
    const calendars = new Map<number, WorkingCalendar>();
    for (const a of assignees) {
      if (a.id == null) continue;
      const schedules = userSchedules.filter((s) => s.userId === a.userId);
      const externalDaily = externalDailyByAssignee.get(a.id);
      if (!externalDaily || externalDaily.size === 0) {
        calendars.set(
          a.id,
          new AssigneeWorkingCalendar(a, companyCalendar, schedules)
        );
        continue;
      }
      calendars.set(
        a.id,
        new ExternalLoadAwareCalendar({
          physicalCalendar: new AssigneeWorkingCalendar(
            WbsAssignee.create({ userId: a.userId, rate: 1 }),
            companyCalendar,
            schedules
          ),
          rateCapHours: systemSettings.standardWorkingHours * a.getRate(),
          externalDailyHours: externalDaily,
        })
      );
    }

    const schedulingTasks: SchedulingTask[] = tasks
      .filter((t) => t.id != null)
      .map(toSchedulingTask);

    const warnings = SchedulingPreconditionService.check(
      schedulingTasks,
      dependencies,
      schedulingSettings.steadyTaskKeywords,
      schedulingSettings.fixedDateTaskKeywords
    );

    const scheduledTasks = forwardSchedule({
      tasks: schedulingTasks,
      dependencies,
      calendars,
      standardWorkingHours: systemSettings.standardWorkingHours,
      options: {
        baselineDate,
        consumeSteadyTaskCapacity: schedulingSettings.consumeSteadyTaskCapacity,
        steadyTaskKeywords: schedulingSettings.steadyTaskKeywords,
        fixedDateTaskKeywords: schedulingSettings.fixedDateTaskKeywords,
        steadyDailyHoursMode: schedulingSettings.steadyDailyHoursMode,
        steadyFixedHoursByKeyword: schedulingSettings.steadyFixedHoursByKeyword,
      },
    });

    // 実施日固定タスクの先行超過（前工程が固定日に間に合わない）を警告
    warnings.push(
      ...SchedulingPreconditionService.checkFixedDateConflicts(scheduledTasks)
    );

    // 実施日固定タスクの期間超過（予定工数が入力期間に収まらない）を警告
    warnings.push(
      ...SchedulingPreconditionService.checkFixedPeriodExceeded(scheduledTasks)
    );

    // 計算結果がプロジェクト終了日に収まらないタスクを警告（リスケ判断の主要シグナル）
    if (project.endDate) {
      warnings.push(
        ...SchedulingPreconditionService.checkProjectEnd(
          scheduledTasks,
          project.endDate
        )
      );
    }

    const workloads = this.buildWorkloads(
      scheduledTasks,
      assignees,
      userSchedules,
      companyCalendar,
      baselineDate,
      externalSetsByUser
    );

    return {
      baselineDate: baselineDate.toISOString(),
      warnings,
      scheduledTasks: scheduledTasks.map(toDto),
      workloads,
      tsv: convertScheduledTasksToTsv(scheduledTasks),
    };
  }

  /**
   * 手動調整後のスケジュール（画面編集済みDTO）から負荷・TSV・超過警告のみを再計算する。
   * タスクの再スケジュール（前詰め）は行わず、DBへの書き込みも一切行わない読み取り専用処理。
   */
  async recalculatePreview(
    wbsId: number,
    params: SchedulePreviewRecalcParams
  ): Promise<SchedulePreviewRecalcResult> {
    const wbs = await this.wbsRepository.findById(wbsId);
    if (!wbs) throw new Error("WBSが見つかりません");
    if (!wbs.projectId)
      throw new Error("WBSに紐づくプロジェクトが見つかりません");

    const project = await this.projectRepository.findById(wbs.projectId);
    if (!project) throw new Error("プロジェクトが見つかりません");

    const baselineDate = new Date(params.baselineDateIso);
    if (Number.isNaN(baselineDate.getTime())) {
      throw new Error("基準日が不正です");
    }

    const scheduledTasks = params.scheduledTasks.map(dtoToScheduledTask);

    const [assignees, systemSettings] = await Promise.all([
      this.wbsAssigneeRepository.findByWbsId(wbsId),
      this.systemSettingsRepository.get(),
    ]);

    const { companyHolidays, userSchedules, rangeStart, rangeEnd } =
      await this.loadCalendarInputs(assignees, baselineDate);

    const companyCalendar = new CompanyCalendar(
      systemSettings.standardWorkingHours,
      companyHolidays
    );

    // 計算時と同じ条件で他WBS負荷を取得し直し、調整後プレビューにも合算する
    const externalSetsByUser = await this.loadExternalSets(
      params.considerOtherWbsLoad ?? true,
      assignees,
      wbs.projectId,
      rangeStart,
      rangeEnd
    );

    const workloads = this.buildWorkloads(
      scheduledTasks,
      assignees,
      userSchedules,
      companyCalendar,
      baselineDate,
      externalSetsByUser
    );

    const warnings = project.endDate
      ? SchedulingPreconditionService.checkProjectEnd(
          scheduledTasks,
          project.endDate
        )
      : [];

    return {
      workloads,
      warnings,
      tsv: convertScheduledTasksToTsv(scheduledTasks),
    };
  }

  /** 会社休日・個人予定の取得。完了タスクは基準日より前にもありうるため前後に余裕を確保 */
  private async loadCalendarInputs(
    assignees: WbsAssignee[],
    baselineDate: Date
  ): Promise<{
    companyHolidays: CompanyHoliday[];
    userSchedules: UserSchedule[];
    rangeStart: Date;
    rangeEnd: Date;
  }> {
    const rangeStart = addCalendarDays(baselineDate, -366);
    const rangeEnd = addCalendarDays(baselineDate, 366 * 2);
    const [companyHolidays, userSchedules] = await Promise.all([
      this.companyHolidayRepository.findByDateRange(rangeStart, rangeEnd),
      assignees.length > 0
        ? this.userScheduleRepository.findByUsersAndDateRange(
            assignees.map((a) => a.userId),
            rangeStart,
            rangeEnd
          )
        : Promise.resolve([] as UserSchedule[]),
    ]);
    return { companyHolidays, userSchedules, rangeStart, rangeEnd };
  }

  /**
   * 他WBS(未開始・進行中プロジェクトの最新WBS)のユーザー別配分セットを取得する。
   * OFF・担当者なしの場合は空Mapを返す。現プロジェクトの全WBSは対象から除外する。
   */
  private async loadExternalSets(
    considerOtherWbsLoad: boolean,
    assignees: WbsAssignee[],
    projectId: string,
    rangeStart: Date,
    rangeEnd: Date
  ): Promise<Map<string, LabeledAllocationSet[]>> {
    if (!considerOtherWbsLoad || assignees.length === 0) {
      return new Map();
    }
    return this.crossWbsWorkloadService.getExternalAllocationSets({
      startDate: rangeStart,
      endDate: rangeEnd,
      userIds: [...new Set(assignees.map((a) => a.userId))],
      excludeProjectId: projectId,
    });
  }

  /**
   * 外部配分セットを担当者(wbs_assignee.id)別の日次負荷マップ(dateKey → hours)へ変換する。
   * 同一ユーザーが現WBSに複数行登録されている場合は各行が同じ外部負荷を持つ(稀なデータ形状として許容)。
   */
  private buildExternalDailyHours(
    assignees: WbsAssignee[],
    externalSetsByUser: Map<string, LabeledAllocationSet[]>
  ): Map<number, Map<string, number>> {
    const result = new Map<number, Map<string, number>>();
    if (externalSetsByUser.size === 0) return result;

    for (const assignee of assignees) {
      if (assignee.id == null) continue;
      const sets = externalSetsByUser.get(assignee.userId);
      if (!sets || sets.length === 0) continue;

      const daily = new Map<string, number>();
      for (const set of sets) {
        for (const allocation of set.dailyAllocations) {
          const hours = allocation.allocatedHours;
          if (hours <= 0) continue;
          const key = toDateKey(allocation.date);
          daily.set(key, (daily.get(key) ?? 0) + hours);
        }
      }
      if (daily.size > 0) result.set(assignee.id, daily);
    }
    return result;
  }

  private buildWorkloads(
    scheduledTasks: ScheduledTask[],
    assignees: WbsAssignee[],
    userSchedules: UserSchedule[],
    companyCalendar: CompanyCalendar,
    baselineDate: Date,
    externalSetsByUser?: Map<string, LabeledAllocationSet[]>
  ): WorkloadData[] {
    // 負荷表示範囲: min(開始) 〜 max(終了)
    let minStart = baselineDate;
    let maxEnd = baselineDate;
    for (const st of scheduledTasks) {
      if (
        st.scheduledStartDate &&
        st.scheduledStartDate.getTime() < minStart.getTime()
      ) {
        minStart = st.scheduledStartDate;
      }
      if (
        st.scheduledEndDate &&
        st.scheduledEndDate.getTime() > maxEnd.getTime()
      ) {
        maxEnd = st.scheduledEndDate;
      }
    }

    const result: WorkloadData[] = [];
    for (const a of assignees) {
      if (a.id == null) continue;
      const items: ScheduleAllocationInput[] = scheduledTasks
        .filter(
          (st) =>
            st.assigneeId === a.id &&
            !st.skipped &&
            st.scheduledStartDate != null &&
            st.scheduledEndDate != null &&
            st.scheduledManHours != null &&
            st.scheduledManHours > 0
        )
        .map((st) => ({
          taskId: String(st.taskId),
          taskName: st.taskName,
          start: st.scheduledStartDate!,
          end: st.scheduledEndDate!,
          hours: st.scheduledManHours!,
        }));

      const schedules = userSchedules.filter((s) => s.userId === a.userId);
      const daily =
        this.workloadCalculationService.calculateDailyAllocationsFromSchedule(
          items,
          a,
          schedules,
          companyCalendar,
          minStart,
          maxEnd
        );

      const externalSets = externalSetsByUser?.get(a.userId) ?? [];
      if (externalSets.length === 0) {
        // 従来パス: 現WBSのみ(そのWBSの参画率を分母に使用)
        result.push(
          toWorkloadData(
            AssigneeWorkload.create({
              assigneeId: a.userId,
              assigneeName: a.userName || a.userId,
              dailyAllocations: daily,
              assigneeRate: a.getRate(),
            })
          )
        );
        continue;
      }

      // 他WBS負荷を合算(分母は rate=1: 標準勤務時間−個人予定)
      const merged = this.workloadMergeService.mergeDailyAllocations({
        sets: [{ dailyAllocations: daily }, ...externalSets],
        mergedCalendar: new AssigneeWorkingCalendar(
          WbsAssignee.create({ userId: a.userId, rate: 1 }),
          companyCalendar,
          schedules
        ),
        companyCalendar,
        userSchedules: schedules,
        startDate: minStart,
        endDate: maxEnd,
      });
      result.push(
        toWorkloadData(
          AssigneeWorkload.create({
            assigneeId: a.userId,
            assigneeName: a.userName || a.userId,
            dailyAllocations: merged,
            assigneeRate: 1,
          })
        )
      );
    }
    return result;
  }
}

/** 画面編集済みDTO（日付はISO文字列）をドメインの ScheduledTask（Date）へ戻す */
function dtoToScheduledTask(dto: ScheduledTaskDto): ScheduledTask {
  return {
    ...dto,
    scheduledStartDate: dto.scheduledStartDate
      ? new Date(dto.scheduledStartDate)
      : undefined,
    scheduledEndDate: dto.scheduledEndDate
      ? new Date(dto.scheduledEndDate)
      : undefined,
  };
}

function toDto(st: ScheduledTask): ScheduledTaskDto {
  return {
    taskId: st.taskId,
    taskNo: st.taskNo,
    taskName: st.taskName,
    phaseId: st.phaseId,
    phaseName: st.phaseName,
    assigneeId: st.assigneeId,
    assigneeName: st.assigneeName,
    status: st.status,
    isSteady: st.isSteady,
    scheduledStartDate: st.scheduledStartDate?.toISOString(),
    scheduledEndDate: st.scheduledEndDate?.toISOString(),
    scheduledManHours: st.scheduledManHours,
    fixed: st.fixed,
    skipped: st.skipped,
    note: st.note,
    predecessors: st.predecessors,
  };
}

