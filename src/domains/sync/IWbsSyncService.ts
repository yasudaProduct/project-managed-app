import { ExcelWbs, SyncChanges, SyncResult } from './ExcelWbs';
import { Task } from '@/domains/task/task';

export interface IWbsSyncService {
  // 洗い替え（全削除→全インポート）
  replaceAll(wbsId: number, wbsName: string): Promise<SyncResult>;
}