import { SyncResult, ValidationError } from '@/domains/sync/ExcelWbs';

export interface IWbsSyncApplicationService {
  // 洗い替えを実行（全削除→全インポート）
  executeReplaceAll(wbsId: number): Promise<SyncResult>;

}