import { injectable, inject } from 'inversify';
import type { IWbsSyncApplicationService } from './IWbsSyncApplicationService';
import type { IWbsSyncService } from '@/domains/sync/IWbsSyncService';
import type { ISyncLogRepository } from './ISyncLogRepository';
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import { SyncResult, SyncError, SyncErrorType, ValidationError } from '@/domains/sync/ExcelWbs';
import type { SyncLog } from './ISyncLogRepository';
import { SYMBOL } from '@/types/symbol';
import type { IProjectRepository } from '../projects/iproject-repository';

@injectable()
export class WbsSyncApplicationService implements IWbsSyncApplicationService {
  constructor(
    @inject(SYMBOL.IWbsSyncService) private wbsSyncService: IWbsSyncService,
    @inject(SYMBOL.IWbsRepository) private wbsRepository: IWbsRepository,
  ) { }


  async executeReplaceAll(wbsId: number): Promise<SyncResult> {
    try {
      // WBSを取得
      const wbs = await this.wbsRepository.findById(wbsId);
      if (!wbs) {
        throw new SyncError(
          'WBSが見つかりません',
          SyncErrorType.VALIDATION_ERROR,
          { wbsId }
        );
      }

      // 洗い替え実行
      const result = await this.wbsSyncService.replaceAll(wbsId, wbs.name);

      return result;
    } catch (error) {
      console.error('洗い替え処理エラー:', error);
      throw error;
    }
  }

}