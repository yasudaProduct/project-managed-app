import type { TaskStatus } from "@/types/wbs";
import type { DependencyType } from "@/domains/task-dependency/task-dependency";

/** スケジューリング結果の状態を表す備考コード */
export type ScheduledTaskNote =
  | "NORMAL"
  | "COMPLETED_FIXED"
  | "IN_PROGRESS_REMAINING"
  | "STEADY_FIXED_PERIOD"
  | "FIXED_DATE"
  | "FIXED_DATE_CONFLICT"
  | "FIXED_PERIOD_EXCEEDED"
  | "NO_ASSIGNEE"
  | "NO_YOTEI_KOSU"
  | "STEADY_NO_PERIOD"
  | "FIXED_NO_PERIOD"
  | "CYCLIC"
  | "SCHEDULE_OVERFLOW";

export interface ScheduledPredecessor {
  taskId: number;
  type: DependencyType;
  lag: number;
}

/**
 * スケジューリング計算の出力。1タスク分の結果。
 */
export interface ScheduledTask {
  taskId: number;
  taskNo: string;
  taskName: string;
  phaseId?: number;
  phaseName?: string;
  assigneeId?: number;
  assigneeName?: string;
  status: TaskStatus;
  /** 定常タスクか */
  isSteady: boolean;
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  /** このスケジュール上で消費する工数（進行中は残工数） */
  scheduledManHours?: number;
  /** 完了タスクを実績で固定したか */
  fixed: boolean;
  /** 計算対象外か（担当者/工数未設定・循環など） */
  skipped: boolean;
  note: ScheduledTaskNote;
  predecessors: ScheduledPredecessor[];
}
