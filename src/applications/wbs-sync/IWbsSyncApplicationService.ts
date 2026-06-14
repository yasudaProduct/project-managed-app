import { SyncResult } from '@/domains/sync/ExcelWbs';

export interface IWbsSyncApplicationService {
  replaceAll(wbsId: number): Promise<SyncResult>;
  /** 差分同期（taskNo upsert＋revive＋soft-delete）。事前検証で原子性を担保し単一txで適用する。 */
  syncDiff(wbsId: number): Promise<SyncResult>;
}