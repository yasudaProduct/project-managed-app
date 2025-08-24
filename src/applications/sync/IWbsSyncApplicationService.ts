import { SyncResult, ValidationError } from '@/domains/sync/ExcelWbs';
import { SyncLog } from './ISyncLogRepository';

export interface IWbsSyncApplicationService {
  // 同期を実行
  executeSync(wbsId: number): Promise<SyncResult>;
  
  // 洗い替えを実行（全削除→全インポート）
  executeReplaceAll(wbsId: number): Promise<SyncResult>;

  // 同期プレビューを取得
  previewSync(wbsId: number): Promise<{
    toAdd: number;
    toUpdate: number;
    toDelete: number;
    details: {
      toAdd: Array<{ wbsId: string; taskName: string; phase: string; assignee: string | null }>;
      toUpdate: Array<{ wbsId: string; taskName: string; phase: string; assignee: string | null }>;
      toDelete: string[];
    };
    validationErrors: ValidationError[];
    newPhases: Array<{ name: string; code: string }>;
    newUsers: Array<{ name: string; email: string }>;
  }>;

  // 同期履歴を取得
  getSyncHistory(projectId: string, limit?: number): Promise<SyncLog[]>;

  // 最終同期情報を取得
  getLastSync(projectId: string): Promise<SyncLog | null>;
}