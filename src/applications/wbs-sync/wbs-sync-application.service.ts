import { injectable, inject } from 'inversify';
import type { IWbsSyncService } from '@/domains/sync/IWbsSyncService';
import { ExcelWbs, SyncResult, SyncError, SyncErrorType, ValidationError } from '@/domains/sync/ExcelWbs';
import { Task } from '@/domains/task/task';
import { WbsDataMapper } from '@/domains/sync/WbsDataMapper';
import type { IExcelWbsRepository } from '@/applications/excel-sync/IExcelWbsRepository';
import type { ISyncLogRepository } from '@/applications/excel-sync/ISyncLogRepository';
import { SYMBOL } from '@/types/symbol';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import type { IUserRepository } from '@/applications/user/iuser-repositroy';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/project-status';

/**
 * WBS同期アプリケーションサービス
 */
@injectable()
export class WbsSyncApplicationService implements IWbsSyncService {
  constructor(
    @inject(SYMBOL.IExcelWbsRepository) private excelWbsRepository: IExcelWbsRepository,
    @inject(SYMBOL.ISyncLogRepository) private syncLogRepository: ISyncLogRepository,
    @inject(SYMBOL.IPhaseRepository) private phaseRepository: IPhaseRepository,
    @inject(SYMBOL.IUserRepository) private userRepository: IUserRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
  ) { }

  // 洗い替え処理（全削除→全インポート）
  async replaceAll(wbsId: number, wbsName: string): Promise<SyncResult> {
    // 実行モードで処理を実行
    const result = await this.processSync(wbsId, wbsName);
    return result;
  }

  // エクセル側のでwbsデータを取得
  // エクセルデータはWBS名で取得する
  private async fetchExcelData(wbsName: string): Promise<ExcelWbs[]> {
    try {
      const excelWbs = await this.excelWbsRepository.findByWbsName(wbsName);
      if (!excelWbs) {
        throw new SyncError(
          'Excel側のデータが見つかりません',
          SyncErrorType.VALIDATION_ERROR,
          { wbsName }
        );
      }
      return excelWbs;
    } catch (error) {
      throw new SyncError(
        'Excel側のデータ取得に失敗しました',
        SyncErrorType.CONNECTION_ERROR,
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private buildTaskDomainFromExcel(args: {
    excelWbs: ExcelWbs,
    wbsId: number,
    phaseNameToId: Map<string, number>,
    assignees: WbsAssignee[],
    base?: Task,
  }): Task {
    const { excelWbs, wbsId, phaseNameToId, assignees, base } = args;
    const { task, periods } = WbsDataMapper.toAppWbs(excelWbs);
    console.log('excelWbs.ROW_NO', excelWbs.ROW_NO);

    // 必須フィールドチェック
    if (!task.taskNo) {
      throw new Error('タスクNoは必須です');
    }
    if (!task.name || (task.name as string).trim() === '') {
      // TODO: よくわからないデータがまぎれこんでいるので一時的に空のタスク名を許容する。 スキップするか必須とするか検討
      task.name = '(無題のタスク)';
      // throw new Error('タスク名は必須です');
    }
    if (!excelWbs.PHASE) {
      throw new Error('フェーズは必須です');
    }

    // フェーズの存在チェック
    const phaseId = phaseNameToId.get(excelWbs.PHASE);
    if (!phaseId) {
      throw new Error(`フェーズ「${excelWbs.PHASE}」が見つかりません`);
    }

    // 担当者の存在チェック（担当者が指定されている場合のみ）
    let assigneeId: number | undefined = undefined;
    if (excelWbs.TANTO) {
      const foundAssigneeId = this.findAssigneeIdFromDomain(excelWbs.TANTO, assignees);
      if (!foundAssigneeId) {
        throw new Error(`担当者「${excelWbs.TANTO}」が見つかりません`);
      }
      assigneeId = foundAssigneeId;
    }

    // ドメイン制約に合わせて変換
    const taskNo = TaskNo.reconstruct(task.taskNo as string);
    const name = task.name as string;
    const status = new TaskStatus({ status: task.status as ReturnType<TaskStatus['getStatus']> });

    if (base) {
      // 既存タスクをドメイン更新で反映（制約違反は例外）
      base.update({ name, assigneeId, status, phaseId, periods });
      return base;
    }

    return Task.create({
      taskNo,
      wbsId,
      name,
      status,
      phaseId,
      assigneeId,
      periods,
    });
  }

  private findAssigneeIdFromDomain(tantoName: string | null, assignees: WbsAssignee[]): number | null {
    if (!tantoName) return null;
    const found = assignees.find(a => a.userName === tantoName);
    return found && found.id !== undefined ? found.id : null;
  }

  // 共通同期処理（プレビューモードと実行モードの両方に対応）
  private async processSync(wbsId: number, wbsName: string): Promise<SyncResult> {
    const validationErrors: ValidationError[] = [];
    const result: SyncResult = {
      success: false,
      projectId: '',
      recordCount: 0,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
    };

    try {
      // Excelデータを取得（行番号付き）
      const excelDataWithRowNumbers = await this.fetchExcelDataWithRowNumbers(wbsName);
      const excelData = excelDataWithRowNumbers.map(item => item.data);

      if (excelData.length === 0) {
        throw new SyncError(
          'インポートするデータがありません',
          SyncErrorType.VALIDATION_ERROR,
          { wbsName }
        );
      }

      result.projectId = excelData[0].PROJECT_ID;

      // 既存タスクを取得
      const existingTasks = await this.taskRepository.findByWbsId(wbsId);

      // 削除数を設定
      result.deletedCount = existingTasks.length;

      // 既存タスクを全削除
      for (const task of existingTasks) {
        if (task.id) {
          await this.taskRepository.delete(task.id);
        }
      }

      // フェーズ情報を取得（IDマッピング用）
      const phaseList = await this.phaseRepository.findByWbsId(wbsId);
      const phaseNameToId = new Map<string, number>(); // <フェーズ名, フェーズID>
      phaseList.forEach(p => {
        const id = (p as unknown as { id?: number }).id;
        if (p.name && id !== undefined) {
          phaseNameToId.set(p.name, id);
        }
      });

      // 担当者情報を取得
      const assignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);

      // 全タスクを処理（バリデーション・作成）
      const summary = {
        totalTasks: 0,
        validTasks: 0,
        errorTasks: 0,
        byPhase: {} as Record<string, number>,
        byAssignee: {} as Record<string, number>
      };

      for (let i = 0; i < excelDataWithRowNumbers.length; i++) {
        const { data: excelWbs, rowNumber } = excelDataWithRowNumbers[i];
        summary.totalTasks++;

        try {
          // タスクドメインを構築
          const task = this.buildTaskDomainFromExcel({ excelWbs, wbsId, phaseNameToId, assignees: assignees });

          // タスクを作成
          await this.taskRepository.create(task);

          result.addedCount++;
          summary.validTasks++;

          // フェーズ別集計
          if (excelWbs.PHASE) {
            summary.byPhase[excelWbs.PHASE] = (summary.byPhase[excelWbs.PHASE] || 0) + 1;
          }

          // 担当者別集計
          if (excelWbs.TANTO) {
            summary.byAssignee[excelWbs.TANTO] = (summary.byAssignee[excelWbs.TANTO] || 0) + 1;
          }
        } catch (error) {
          console.log('エラー', error);
          summary.errorTasks++;
          const field = this.getErrorField(error);
          validationErrors.push({
            taskNo: excelWbs.WBS_ID,
            field,
            message: error instanceof Error ? error.message : String(error),
            value: this.getFieldValue(excelWbs, field),
            rowNumber
          });
        }
      }

      result.recordCount = excelData.length;
      result.success = validationErrors.length === 0;

      if (validationErrors.length > 0) {
        result.errorDetails = { validationErrors };
      }

      // 同期ログを記録（実行時のみ）
      await this.syncLogRepository.recordSync({
        projectId: result.projectId,
        syncStatus: result.success ? 'SUCCESS' : 'FAILED',
        syncedAt: new Date(),
        recordCount: result.recordCount,
        addedCount: result.addedCount,
        updatedCount: result.updatedCount,
        deletedCount: result.deletedCount,
        errorDetails: result.errorDetails,
      });

      return result;
    } catch (error) {
      // エラーログを記録
      await this.syncLogRepository.recordSync({
        projectId: result.projectId || 'unknown',
        syncStatus: 'FAILED',
        syncedAt: new Date(),
        recordCount: 0,
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        errorDetails: error instanceof Error ? { message: error.message } : { message: String(error) },
      });

      if (error instanceof SyncError) {
        throw error;
      }

      throw new SyncError(
        '洗い替え処理中にエラーが発生しました',
        SyncErrorType.TRANSACTION_ERROR,
        { message: String(error) }
      );
    }
  }

  // Excelデータを行番号付きで取得
  private async fetchExcelDataWithRowNumbers(wbsName: string): Promise<Array<{ data: ExcelWbs; rowNumber: number }>> {
    const excelData = await this.fetchExcelData(wbsName);
    // 実際のExcelファイルの行番号を想定（ヘッダー行1行 + データ行のインデックス）
    return excelData.map((data) => ({
      data,
      rowNumber: data.ROW_NO // Excelの行番号は1から始まり、ヘッダー行を考慮
    }));
  }

  // エラーからフィールド名を推測
  private getErrorField(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('タスクNo')) return 'taskNo';
    if (message.includes('タスク名')) return 'name';
    if (message.includes('ステータス')) return 'status';
    if (message.includes('担当者')) return 'assignee';
    if (message.includes('フェーズ')) return 'phase';
    return 'unknown';
  }

  // フィールドの値を取得
  private getFieldValue(excelWbs: ExcelWbs, field: string): unknown {
    switch (field) {
      case 'taskNo': return excelWbs.WBS_ID;
      case 'name': return excelWbs.TASK;
      case 'status': return excelWbs.STATUS;
      case 'assignee': return excelWbs.TANTO;
      case 'phase': return excelWbs.PHASE;
      default: return undefined;
    }
  }
}