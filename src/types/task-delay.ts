/**
 * タスクの遅れ・期限間近の種類。
 * - END_OVERDUE: 予定終了日を過ぎて未完了
 * - START_OVERDUE: 予定開始日を過ぎて未着手
 * - DUE_SOON: 予定終了日が近い（プロジェクト設定の期限間近日数以内）
 */
export const TASK_DELAY_KINDS = ['END_OVERDUE', 'START_OVERDUE', 'DUE_SOON'] as const;
export type TaskDelayKind = (typeof TASK_DELAY_KINDS)[number];

export const TASK_DELAY_KIND_LABELS: Record<TaskDelayKind, string> = {
  END_OVERDUE: '終了遅れ',
  START_OVERDUE: '開始遅れ',
  DUE_SOON: '期限間近',
};
