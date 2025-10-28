export const ImportJobTypes = {
  WBS: 'WBS',
  GEPPO: 'GEPPO',
} as const;
export type ImportJobType = typeof ImportJobTypes[keyof typeof ImportJobTypes];

export const ImportJobStatuses = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type ImportJobStatus = typeof ImportJobStatuses[keyof typeof ImportJobStatuses];