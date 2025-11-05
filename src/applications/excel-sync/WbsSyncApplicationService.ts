// import { injectable, inject } from 'inversify';
// import type { IWbsSyncApplicationService } from './IWbsSyncApplicationService';
// import type { IWbsSyncService } from '@/domains/sync/IWbsSyncService';
// import type { IWbsRepository } from '@/applications/wbs/iwbs-repository';
// import { SyncResult, SyncError, SyncErrorType } from '@/domains/sync/ExcelWbs';
// import { SYMBOL } from '@/types/symbol';

// @injectable()
// export class WbsSyncApplicationService implements IWbsSyncApplicationService {
//   constructor(
//     @inject(SYMBOL.IWbsSyncService) private wbsSyncService: IWbsSyncService,
//     @inject(SYMBOL.IWbsRepository) private wbsRepository: IWbsRepository,
//   ) { }


//   // TODO: 直接IWbsSyncServiceを呼び出せばいいのでは
//   /**
//    * 洗い替え同期を実行する
//    * @param wbsId 
//    * @returns 
//    */
//   async executeReplaceAll(wbsId: number): Promise<SyncResult> {
//     try {
//       // WBSを取得
//       const wbs = await this.wbsRepository.findById(wbsId);
//       if (!wbs) {
//         throw new SyncError(
//           'WBSが見つかりません',
//           SyncErrorType.VALIDATION_ERROR,
//           { wbsId }
//         );
//       }

//       // 洗い替え実行
//       const result = await this.wbsSyncService.replaceAll(wbsId);

//       return result;
//     } catch (error) {
//       console.error('洗い替え処理エラー:', error);
//       throw error;
//     }
//   }

// }