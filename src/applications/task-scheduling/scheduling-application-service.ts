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
import {
  type WorkingCalendar,
  addCalendarDays,
} from "@/domains/task-scheduling/working-calendar-walker";
import { SchedulingPreconditionService } from "@/domains/task-scheduling/scheduling-precondition-service";
import type { ScheduledTask } from "@/domains/task-scheduling/scheduled-result";
import type { SchedulingTask } from "@/domains/task-scheduling/scheduling-task";
import {
  WorkloadCalculationService,
  type ScheduleAllocationInput,
} from "@/domains/assignee-workload/workload-calculation-service";
import type { DailyWorkAllocation } from "@/domains/assignee-workload/daily-work-allocation";
import { toSchedulingTask } from "./scheduling-task-mapper";
import { resolveBaselineDate } from "./baseline-resolver";
import { convertScheduledTasksToTsv } from "./tsv-converter";
import type { WorkloadData } from "../assignee-gantt/workload-data";

@injectable()
export class SchedulingApplicationService
  implements ISchedulingApplicationService
{
  private readonly workloadCalculationService = new WorkloadCalculationService();

  constructor(
    @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository,
    @inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository,
    @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
    @inject(SYMBOL.ITaskDependencyRepository) private readonly taskDependencyRepository: ITaskDependencyRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.IUserScheduleRepository) private readonly userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.ICompanyHolidayRepository) private readonly companyHolidayRepository: ICompanyHolidayRepository,
    @inject(SYMBOL.ISystemSettingsRepository) private readonly systemSettingsRepository: ISystemSettingsRepository,
    @inject(SYMBOL.ISchedulingSettingsRepository) private readonly schedulingSettingsRepository: ISchedulingSettingsRepository
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

    const { companyHolidays, userSchedules } = await this.loadCalendarInputs(
      assignees,
      baselineDate
    );

    const companyCalendar = new CompanyCalendar(
      systemSettings.standardWorkingHours,
      companyHolidays
    );

    // assigneeId(wbs_assignee.id) → 稼働カレンダー
    const calendars = new Map<number, WorkingCalendar>();
    for (const a of assignees) {
      if (a.id == null) continue;
      const schedules = userSchedules.filter((s) => s.userId === a.userId);
      calendars.set(
        a.id,
        new AssigneeWorkingCalendar(a, companyCalendar, schedules)
      );
    }

    const schedulingTasks: SchedulingTask[] = tasks
      .filter((t) => t.id != null)
      .map(toSchedulingTask);

    const warnings = SchedulingPreconditionService.check(
      schedulingTasks,
      dependencies,
      schedulingSettings.steadyTaskKeywords
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
        steadyDailyHoursMode: schedulingSettings.steadyDailyHoursMode,
        steadyFixedHoursByKeyword: schedulingSettings.steadyFixedHoursByKeyword,
      },
    });

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
      baselineDate
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

    const { companyHolidays, userSchedules } = await this.loadCalendarInputs(
      assignees,
      baselineDate
    );

    const companyCalendar = new CompanyCalendar(
      systemSettings.standardWorkingHours,
      companyHolidays
    );

    const workloads = this.buildWorkloads(
      scheduledTasks,
      assignees,
      userSchedules,
      companyCalendar,
      baselineDate
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
    return { companyHolidays, userSchedules };
  }

  private buildWorkloads(
    scheduledTasks: ScheduledTask[],
    assignees: WbsAssignee[],
    userSchedules: UserSchedule[],
    companyCalendar: CompanyCalendar,
    baselineDate: Date
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
      result.push(toWorkloadData(a, daily));
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

function toWorkloadData(
  assignee: WbsAssignee,
  daily: DailyWorkAllocation[]
): WorkloadData {
  const rate = assignee.getRate();
  return {
    assigneeId: assignee.userId,
    assigneeName: assignee.userName || assignee.userId,
    assigneeRate: rate,
    dailyAllocations: daily.map((d) => ({
      date: d.date.toISOString(),
      availableHours: d.availableHours,
      allocatedHours: d.allocatedHours,
      isOverloaded: d.allocatedHours > d.availableHours,
      utilizationRate:
        d.availableHours > 0 ? d.allocatedHours / d.availableHours : 0,
      overloadedHours: Math.max(0, d.allocatedHours - d.availableHours),
      isOverloadedByStandard: d.allocatedHours > 7.5,
      overloadedByStandardHours: Math.max(0, d.allocatedHours - 7.5),
      rateAllowedHours: d.availableHours * rate,
      isOverRateCapacity: d.allocatedHours > d.availableHours * rate,
      overRateHours: Math.max(0, d.allocatedHours - d.availableHours * rate),
      isWeekend: d.isWeekend,
      isCompanyHoliday: d.isCompanyHoliday,
      userSchedules: d.userSchedules,
      taskAllocations: d.taskAllocations.map((t) => ({
        taskId: t.taskId,
        taskName: t.taskName,
        allocatedHours: t.allocatedHours,
        totalHours: t.totalHours,
        periodStart: t.periodStart?.toISOString(),
        periodEnd: t.periodEnd?.toISOString(),
      })),
    })),
  };
}
