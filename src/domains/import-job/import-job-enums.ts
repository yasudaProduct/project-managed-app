export enum ImportJobType {
  GEPPO_IMPORT = 'GEPPO_IMPORT',
  WBS_SYNC = 'WBS_SYNC',
}

export enum ImportJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}