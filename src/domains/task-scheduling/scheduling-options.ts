import type { SteadyDailyHoursMode } from "@/types/scheduling-settings";
import type { BaselineMode } from "@/types/scheduling-settings";

export type { BaselineMode };

/**
 * スケジューリング計算のオプション。
 */
export interface SchedulingOptions {
  /** 前詰めの起点となる基準日 */
  baselineDate: Date;
  /** 定常タスクが担当者の稼働可能時間を消費するか */
  consumeSteadyTaskCapacity: boolean;
  /** 定常タスク判定キーワード（タスク名の部分一致） */
  steadyTaskKeywords: string[];
  /** 実施日固定タスク判定キーワード（タスク名の部分一致。前詰めせず予定日で固定） */
  fixedDateTaskKeywords: string[];
  /** 定常タスクの日次消費量の決定方式 */
  steadyDailyHoursMode: SteadyDailyHoursMode;
  /** FIXED モード時のキーワード別日次固定時間 */
  steadyFixedHoursByKeyword?: Record<string, number>;
}
