export interface SyncLog {
  id: number;
  projectId: string;
  syncStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  syncedAt: Date;
  recordCount: number;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  errorDetails?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISyncLogRepository {
  getLastSync(projectId: string): Promise<SyncLog | null>;
  /** 同期ログを記録し、採番された id を返す */
  recordSync(log: Omit<SyncLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number>;
  getHistory(
    projectId: string, 
    limit?: number
  ): Promise<SyncLog[]>;
}