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
    @inject(SYMBOL.ISyncLogRepository) private syncLogRepository: ISyncLogRepository,
    @inject(SYMBOL.IWbsRepository) private wbsRepository: IWbsRepository,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
    @inject(SYMBOL.IProjectRepository) private projectRepository: IProjectRepository
  ) { }

  async executeSync(wbsId: number): Promise<SyncResult> {
    try {
      // WBSを取得
      const wbs = await this.wbsRepository.findById(wbsId);
      if (!wbs) {
        throw new SyncError(
          'プロジェクトに紐づくWBSが見つかりません',
          SyncErrorType.VALIDATION_ERROR,
          { wbsId }
        );
      }

      // Excel側のデータを取得
      const excelData = await this.wbsSyncService.fetchExcelData(wbs.name);

      // アプリ側のタスクを取得
      const appTasks = await this.taskRepository.findByWbsId(wbs.id!);

      // 変更を検出
      const changes = await this.wbsSyncService.detectChanges(excelData, appTasks);

      // 変更を適用
      const result = await this.wbsSyncService.applyChanges(changes);

      return result;
    } catch (error) {
      console.error('同期処理エラー:', error);
      throw error;
    }
  }

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

  async previewSync(wbsId: number): Promise<{
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
  }> {
    console.log('-------------- previewSync --------------');
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

      // プレビューを取得
      const preview = await this.wbsSyncService.previewChanges(wbsId, wbs.name);

      return {
        toAdd: preview.changes.toAdd.length,
        toUpdate: preview.changes.toUpdate.length,
        toDelete: preview.changes.toDelete.length,
        details: {
          toAdd: preview.changes.toAdd.map((item) => ({
            wbsId: item.WBS_ID,
            taskName: item.TASK || item.ACTIVITY,
            phase: item.PHASE,
            assignee: item.TANTO,
          })),
          toUpdate: preview.changes.toUpdate.map((item) => ({
            wbsId: item.WBS_ID,
            taskName: item.TASK || item.ACTIVITY,
            phase: item.PHASE,
            assignee: item.TANTO,
          })),
          toDelete: preview.changes.toDelete,
        },
        validationErrors: preview.validationErrors,
        newPhases: preview.newPhases.map((phase) => ({
          name: phase.name,
          code: phase.code.value(),
        })),
        newUsers: preview.newUsers.map((user) => ({
          name: user.displayName,
          email: user.email,
        })),
      };
    } catch (error) {
      console.error('同期プレビューエラー:', error);
      throw error;
    }
  }

  async getSyncHistory(projectId: string, limit?: number): Promise<SyncLog[]> {
    return await this.syncLogRepository.getHistory(projectId, limit);
  }

  async getLastSync(projectId: string): Promise<SyncLog | null> {
    return await this.syncLogRepository.getLastSync(projectId);
  }

}