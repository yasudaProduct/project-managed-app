import type { BaselineMode } from "@/domains/task-scheduling/scheduling-options";
import type { PreconditionWarning } from "@/domains/task-scheduling/scheduling-precondition-service";
import type { ScheduledTaskNote } from "@/domains/task-scheduling/scheduled-result";
import type { TaskStatus } from "@/types/wbs";
import type { DependencyType } from "@/domains/task-dependency/task-dependency";
import type { WorkloadData } from "../assignee-gantt/workload-data";

export interface ScheduleCalculationParams {
  baselineMode: BaselineMode;
  /** baselineMode === "CUSTOM" のときの基準日（ISO8601, UTC） */
  baselineDateIso?: string;
  /**
   * 他WBS(未開始・進行中プロジェクトの最新WBS)の負荷を担当者の空き容量から
   * 先行して差し引いた上で前詰めするか。省略時 true。
   */
  considerOtherWbsLoad?: boolean;
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

/** 手動調整後スケジュールの再計算入力 */
export interface SchedulePreviewRecalcParams {
  /** 元計算の基準日（ISO8601）。休日・個人予定の取得範囲の決定に使用 */
  baselineDateIso: string;
  /** 手動調整後のスケジュール結果（画面上の編集を反映したDTO） */
  scheduledTasks: ScheduledTaskDto[];
  /** 他WBSの負荷を負荷プレビューへ合算するか。省略時 true(計算時と同一の指定を渡す) */
  considerOtherWbsLoad?: boolean;
}

/** 手動調整後スケジュールの再計算結果 */
export interface SchedulePreviewRecalcResult {
  workloads: WorkloadData[];
  tsv: string;
  /** 調整後の計算後検証警告（EXCEEDS_PROJECT_END のみ） */
  warnings: PreconditionWarning[];
}

export interface ISchedulingApplicationService {
  calculateSchedule(
    wbsId: number,
    params: ScheduleCalculationParams
  ): Promise<ScheduleCalculationResult>;
  /**
   * 手動調整後のスケジュールから負荷・TSV・超過警告のみを再計算する。
   * タスクの再スケジュール（前詰め）は行わず、DBへの書き込みも行わない。
   */
  recalculatePreview(
    wbsId: number,
    params: SchedulePreviewRecalcParams
  ): Promise<SchedulePreviewRecalcResult>;
}
