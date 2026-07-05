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
