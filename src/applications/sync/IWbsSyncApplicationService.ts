import { SyncResult } from '@/domains/sync/ExcelWbs';
import { SyncLog } from './ISyncLogRepository';

export interface IWbsSyncApplicationService {
  // 同期を実行
  executeSync(projectId: string): Promise<SyncResult>;
  
  // 同期プレビューを取得
  previewSync(projectId: string): Promise<{
    toAdd: number;
    toUpdate: number;
    toDelete: number;
    details: {
      toAdd: Array<{ wbsId: string; taskName: string; phase: string; assignee: string | null }>;
      toUpdate: Array<{ wbsId: string; taskName: string; phase: string; assignee: string | null }>;
      toDelete: string[];
    };
  }>;
  
  // 同期履歴を取得
  getSyncHistory(projectId: string, limit?: number): Promise<SyncLog[]>;
  
  // 最終同期情報を取得
  getLastSync(projectId: string): Promise<SyncLog | null>;
}