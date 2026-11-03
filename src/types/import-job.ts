export const ImportJobTypes = {
  WBS: 'WBS',
  GEPPO: 'GEPPO',
} as const;

export type ImportJobType = (typeof ImportJobTypes)[keyof typeof ImportJobTypes];

export const ImportJobStatuses = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type ImportJobStatus = (typeof ImportJobStatuses)[keyof typeof ImportJobStatuses];

/**
 * ジョブの開始結果。インポートジョブは1件ずつ実行する。
 * - STARTED: 開始した
 * - BUSY: 他のジョブが実行中のため開始せず、実行待ちのまま（完了後に順番に開始される）
 * - NOT_PENDING: 保留中のジョブではない（既に開始・終了・キャンセル済み）
 */
export type ImportJobStartResult = 'STARTED' | 'BUSY' | 'NOT_PENDING';

/**
 * インポートジョブの UI/Server Action 受け渡し用 DTO。
 * 日時は ISO 文字列にシリアライズ済み。
 */
export interface ImportJobDto {
  id: string;
  type: ImportJobType;
  status: ImportJobStatus;
  progress?: number;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  targetMonth?: string | null;
  wbsId?: number | null;
  wbsName?: string | null;
  errorDetails?: unknown;
  result?: unknown;
}
