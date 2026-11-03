/**
 * マイルストーンの対象と達成見込み（docs/plans/progress-management-analysis-requirements.md §7.2）。
 * Prisma の MilestoneTargetType enum と値を一致させた独立 union 型。
 * Prisma enum との相互変換は Infrastructure 層でのみ行う。
 */
export const MILESTONE_TARGET_TYPES = ['EVENT', 'PHASE', 'TASKS'] as const;
export type MilestoneTargetType = (typeof MILESTONE_TARGET_TYPES)[number];

export const MILESTONE_TARGET_TYPE_LABELS: Record<MilestoneTargetType, string> = {
  EVENT: 'イベント',
  PHASE: 'フェーズ完了',
  TASKS: 'タスク指定',
};

export const MILESTONE_TARGET_TYPE_DESCRIPTIONS: Record<MilestoneTargetType, string> = {
  EVENT: '顧客レビューなど、タスクに紐付かない予定です。達成日を記録します。',
  PHASE: 'フェーズのタスクがすべて完了したら達成です。フェーズの予測完了日で見込みを出します。',
  TASKS: '指定したタスクがすべて完了したら達成です。未完了タスクの予定終了日で見込みを出します。',
};

/**
 * マイルストーンの対象。
 * フェーズ完了型の phaseId が null になるのは対象フェーズが削除された場合だけ（保存時は必須）。
 */
export type MilestoneTarget =
  | { targetType: 'EVENT' }
  | { targetType: 'PHASE'; phaseId: number | null }
  | { targetType: 'TASKS'; taskIds: number[] };

/** 保存時の対象（フェーズ完了型はフェーズ必須） */
export type MilestoneTargetInput =
  | { targetType: 'EVENT' }
  | { targetType: 'PHASE'; phaseId: number }
  | { targetType: 'TASKS'; taskIds: number[] };

export const MILESTONE_FORECAST_STATUSES = [
  'ACHIEVED',
  'ON_TRACK',
  'AT_RISK',
  'OVERDUE',
  'NO_FORECAST',
  'NO_TARGET',
] as const;
export type MilestoneForecastStatus = (typeof MILESTONE_FORECAST_STATUSES)[number];

export const MILESTONE_FORECAST_STATUS_LABELS: Record<MilestoneForecastStatus, string> = {
  ACHIEVED: '達成',
  ON_TRACK: '見込みどおり',
  AT_RISK: '遅延見込み',
  OVERDUE: '期限超過',
  NO_FORECAST: '予定のみ',
  NO_TARGET: '対象なし',
};
