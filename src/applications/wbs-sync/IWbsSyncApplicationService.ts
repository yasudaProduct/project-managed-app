import { SyncResult } from '@/domains/sync/ExcelWbs';

export interface IWbsSyncApplicationService {
  replaceAll(wbsId: number): Promise<SyncResult>;
}