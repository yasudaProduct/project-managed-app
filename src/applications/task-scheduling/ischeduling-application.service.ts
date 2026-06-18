import type { BaselineMode } from "@/domains/task-scheduling/scheduling-options";
import type { PreconditionWarning } from "@/domains/task-scheduling/scheduling-precondition.service";
import type { ScheduledTaskNote } from "@/domains/task-scheduling/scheduled-result";
import type { TaskStatus } from "@/types/wbs";
import type { DependencyType } from "@/domains/task-dependency/task-dependency";
import type { WorkloadData } from "../assignee-gantt/workload-data";

export interface ScheduleCalculationParams {
  baselineMode: BaselineMode;
  /** baselineMode === "CUSTOM" のときの基準日（ISO8601, UTC） */
  baselineDateIso?: string;
}

/** スケジューリング結果のプレーンな転送オブジェクト（日付は ISO8601 文字列） */
export interface ScheduledTaskDto {
  taskId: number;
  taskNo: string;
  taskName: string;
  phaseId?: number;
  phaseName?: string;
  assigneeId?: number;
  assigneeName?: string;
  status: TaskStatus;
  isSteady: boolean;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  scheduledManHours?: number;
  fixed: boolean;
  skipped: boolean;
  note: ScheduledTaskNote;
  predecessors: { taskId: number; type: DependencyType; lag: number }[];
}

export interface ScheduleCalculationResult {
  baselineDate: string;
  warnings: PreconditionWarning[];
  scheduledTasks: ScheduledTaskDto[];
  workloads: WorkloadData[];
  tsv: string;
}

export interface ISchedulingApplicationService {
  calculateSchedule(
    wbsId: number,
    params: ScheduleCalculationParams
  ): Promise<ScheduleCalculationResult>;
}
