export interface ValidationError {
  taskNo: string;
  field: string;
  message: string;
  value?: unknown;
  rowNumber?: number; // Excel行番号
}

export interface ExcelWbs {
  ROW_NO: number;
  PROJECT_ID: string;
  WBS_ID: string;
  PHASE: string;
  ACTIVITY: string;
  TASK: string;
  TANTO: string | null;
  KIJUN_START_DATE: Date | null;
  KIJUN_END_DATE: Date | null;
  YOTEI_START_DATE: Date | null;
  YOTEI_END_DATE: Date | null;
  JISSEKI_START_DATE: Date | null;
  JISSEKI_END_DATE: Date | null;
  KIJUN_KOSU: number | null;
  YOTEI_KOSU: number | null;
  JISSEKI_KOSU: number | null;
  KIJUN_KOSU_BUFFER: number | null;
  STATUS: string | null;
  BIKO: string | null;
  PROGRESS_RATE: number | null;
}

export interface SyncChanges {
  wbsId: number
  projectId: string;
  toAdd: ExcelWbs[];
  toUpdate: ExcelWbs[];
  toDelete: string[];
  timestamp: Date;
}

export interface SyncResult {
  success: boolean;
  projectId: string;
  recordCount: number;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  errorDetails?: Record<string, unknown>;
}

export enum SyncErrorType {
  CONNECTION_ERROR = 'connection_error',
  VALIDATION_ERROR = 'validation_error',
  MAPPING_ERROR = 'mapping_error',
  TRANSACTION_ERROR = 'transaction_error',
}

export class SyncError extends Error {
  constructor(
    message: string,
    public readonly type: SyncErrorType,
    public readonly details: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SyncError';
  }
}