/**
 * 進捗確認のサイクル（進捗会議の頻度）。
 * 案件ごとに日次〜月次で異なるため、期間の単位をコードに固定せずプロジェクト設定から決める
 * （docs/plans/progress-management-analysis-requirements.md §4 原則7）。
 */

/**
 * Prisma の ProgressReviewCycle enum と値を一致させた独立 union 型。
 * Prisma enum との相互変換は Infrastructure 層でのみ行う。
 */
export const PROGRESS_REVIEW_CYCLES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type ProgressReviewCycle = (typeof PROGRESS_REVIEW_CYCLES)[number];

export const DEFAULT_PROGRESS_REVIEW_CYCLE: ProgressReviewCycle = 'WEEKLY';

export const PROGRESS_REVIEW_CYCLE_LABELS: Record<ProgressReviewCycle, string> = {
  DAILY: '日次',
  WEEKLY: '週次',
  MONTHLY: '月次',
};

type EvmViewDefaults = {
  interval: 'daily' | 'weekly' | 'monthly';
  periodMode: 'project' | 'recent3months' | 'recent1month';
};

/**
 * サイクルごとのEVMダッシュボードの既定の間隔・表示期間。
 * 週次は従来の既定値（週次・プロジェクト全期間）と同じ。ダッシュボード上で都度変更できる。
 */
export const EVM_VIEW_DEFAULTS_BY_REVIEW_CYCLE: Record<ProgressReviewCycle, EvmViewDefaults> = {
  DAILY: { interval: 'daily', periodMode: 'recent1month' },
  WEEKLY: { interval: 'weekly', periodMode: 'project' },
  MONTHLY: { interval: 'monthly', periodMode: 'project' },
};
