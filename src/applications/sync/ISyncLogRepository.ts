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
  recordSync(log: Omit<SyncLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  getHistory(
    projectId: string, 
    limit?: number
  ): Promise<SyncLog[]>;
}