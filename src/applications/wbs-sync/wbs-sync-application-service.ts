import { injectable, inject } from 'inversify';
import { ExcelWbs, SyncResult, SyncError, SyncErrorType, ValidationError } from '@/domains/sync/excel-wbs';
import { Task } from '@/domains/task/task';
import { WbsDataMapper } from '@/domains/sync/wbs-data-mapper';
import type { IExcelWbsRepository } from '@/applications/wbs-sync/iexcel-wbs-repository';
import type { ISyncLogRepository } from '@/applications/wbs-sync/isync-log-repository';
import { SYMBOL } from '@/types/symbol';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ITaskRepository, TaskSyncState, TaskProgressSnapshotInput } from '@/applications/task/itask-repository';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import type { IWbsRepository } from '../wbs/iwbs-repository';
import { IWbsSyncApplicationService } from './iwbs-sync-application-service';

/**
 * WBS同期アプリケーションサービス
 */
@injectable()
export class WbsSyncApplicationService implements IWbsSyncApplicationService {
  constructor(
    @inject(SYMBOL.IWbsRepository) private wbsRepository: IWbsRepository,
    @inject(SYMBOL.IExcelWbsRepository) private excelWbsRepository: IExcelWbsRepository,
    @inject(SYMBOL.ISyncLogRepository) private syncLogRepository: ISyncLogRepository,
    @inject(SYMBOL.IPhaseRepository) private phaseRepository: IPhaseRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
  ) { }

  // 洗い替え処理（全削除→全インポート）
  async replaceAll(wbsId: number): Promise<SyncResult> {
    // 実行モードで処理を実行
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
      // wbs存在チェック
      const wbs = await this.wbsRepository.findById(wbsId);
      if (!wbs) {
        // 予見可能な検証失敗は throw せず Result で返す（docs/08 §5・行検証エラーと統一）
        result.errorDetails = { message: 'WBSが見つかりません' };
        return result;
      }

      // Excelデータを取得
      const excelData = await this.fetchExcelData(wbs.name);
      const excelDataWithRowNumbers
        = excelData.map((data) => ({
          data,
          rowNumber: data.ROW_NO
        }));

      // プロジェクトIDを設定
      result.projectId = excelData[0].PROJECT_ID;

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

      // [事前検証フェーズ] 全Excel行をドメイン構築＆検証（DB無変更）。
      // 1行でもエラーがあればmutationせず中断し、部分置換を起こさない。
      const builtTasks: Task[] = [];
      for (const { data: excelWbs, rowNumber } of excelDataWithRowNumbers) {
        try {
          const task = this.buildTaskDomainFromExcel({ excelWbs, wbsId, phaseNameToId, assignees });
          builtTasks.push(task);
        } catch (error) {
          const field = this.getErrorField(error);
          validationErrors.push({
            taskNo: excelWbs.WBS_ID,
            field,
            message: error instanceof Error ? error.message : String(error),
            value: this.getFieldValue(excelWbs, field),
            rowNumber,
          });
        }
      }

      result.recordCount = excelData.length;

      if (validationErrors.length > 0) {
        // DBを一切更新しない
        result.success = false;
        result.errorDetails = { validationErrors };
      } else {
        // [適用：単一トランザクション] 全削除＋スナップショット履歴クリア＋全再作成（原子的）
        const { deleted, added } = await this.taskRepository.replaceAllTasks(wbsId, builtTasks);
        result.deletedCount = deleted;
        result.addedCount = added;
        result.updatedCount = 0;
        result.success = true;
      }

      // 同期ログを記録
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
        'WBS同期処理中にエラーが発生しました',
        SyncErrorType.TRANSACTION_ERROR,
        { message: String(error) }
      );
    }
  }

  // 差分同期（taskNo upsert＋revive＋soft-delete）
  // 事前検証で原子性を担保し、差分適用は単一トランザクションで行う。
  async syncDiff(wbsId: number): Promise<SyncResult> {
    const validationErrors: ValidationError[] = [];
    const result: SyncResult = {
      success: false,
      projectId: '',
      recordCount: 0,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
    };

    const now = new Date();

    try {
      // wbs存在チェック
      const wbs = await this.wbsRepository.findById(wbsId);
      if (!wbs) {
        // 予見可能な検証失敗は throw せず Result で返す（docs/08 §5・行検証エラーと統一）
        result.errorDetails = { message: 'WBSが見つかりません' };
        return result;
      }

      // Excelデータを取得
      const excelData = await this.fetchExcelData(wbs.name);
      const excelDataWithRowNumbers = excelData.map((data) => ({
        data,
        rowNumber: data.ROW_NO,
      }));
      result.projectId = excelData[0].PROJECT_ID;
      // taskNo→Excel行（実績日付などの参照用）
      const excelByTaskNo = new Map<string, ExcelWbs>(
        excelData.map((d) => [d.WBS_ID, d])
      );

      // フェーズ・担当者マップ（replaceAllと同じ）
      const phaseList = await this.phaseRepository.findByWbsId(wbsId);
      const phaseNameToId = new Map<string, number>();
      phaseList.forEach((p) => {
        const id = (p as unknown as { id?: number }).id;
        if (p.name && id !== undefined) {
          phaseNameToId.set(p.name, id);
        }
      });
      const assignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);

      // 既存の同期状態（id/taskNo/isDeleted、論理削除込み）
      const state = await this.taskRepository.findSyncStateByWbsId(wbsId);

      // [事前検証フェーズ] 全Excel行をドメイン構築＆検証（DB更新なし）
      const builtTasks: Task[] = [];
      for (const { data: excelWbs, rowNumber } of excelDataWithRowNumbers) {
        try {
          const task = this.buildTaskDomainFromExcel({ excelWbs, wbsId, phaseNameToId, assignees });
          builtTasks.push(task);
        } catch (error) {
          const field = this.getErrorField(error);
          validationErrors.push({
            taskNo: excelWbs.WBS_ID,
            field,
            message: error instanceof Error ? error.message : String(error),
            value: this.getFieldValue(excelWbs, field),
            rowNumber,
          });
        }
      }

      result.recordCount = excelData.length;

      if (validationErrors.length > 0) {
        // 1件でもエラーがあればDBを一切更新しない（原子性担保）
        result.success = false;
        result.errorDetails = { validationErrors };
      } else {
        // [差分バケット構築（純粋計算）]
        const existingByTaskNo = new Map(state.map((s) => [s.taskNo, s]));
        const excelTaskNos = new Set(builtTasks.map((t) => t.taskNo.getValue()));

        const toCreate: Task[] = [];
        const toUpdate: Task[] = [];
        for (const task of builtTasks) {
          const existing = existingByTaskNo.get(task.taskNo.getValue());
          if (existing) {
            // 存続/復活：id保持でupdate（reviveはapplySyncDiff側でisDeleted解除）
            task.id = existing.id;
            toUpdate.push(task);
          } else {
            toCreate.push(task);
          }
        }
        // 消失：Excelに無い有効タスクのみ論理削除（既存tombstoneは対象外）
        const tombstoneStates = state.filter(
          (s) => !s.isDeleted && !excelTaskNos.has(s.taskNo)
        );
        const toSoftDeleteIds = tombstoneStates.map((s) => s.id);

        result.addedCount = toCreate.length;
        result.updatedCount = toUpdate.length;
        result.deletedCount = toSoftDeleteIds.length;

        // スナップショット入力（時点データ・自己完結）を構築
        const snapshotInputs = this.buildSnapshotInputs(
          [...toCreate, ...toUpdate],
          tombstoneStates,
          assignees,
          excelByTaskNo
        );

        // [適用：単一トランザクション] SyncLog採番＋差分適用＋スナップショット追記
        await this.taskRepository.applySyncDiff(
          wbsId,
          { toCreate, toUpdate, toSoftDeleteIds },
          now,
          {
            syncLogData: {
              projectId: result.projectId,
              syncStatus: 'SUCCESS',
              syncedAt: now,
              recordCount: result.recordCount,
              addedCount: result.addedCount,
              updatedCount: result.updatedCount,
              deletedCount: result.deletedCount,
            },
            snapshotInputs,
            snapshotAt: now,
          }
        );

        result.success = true;
      }

      // 検証エラー時のみ FAILED ログを記録（成功時は applySyncDiff 内で採番・記録済み）
      if (!result.success) {
        await this.syncLogRepository.recordSync({
          projectId: result.projectId,
          syncStatus: 'FAILED',
          syncedAt: now,
          recordCount: result.recordCount,
          addedCount: result.addedCount,
          updatedCount: result.updatedCount,
          deletedCount: result.deletedCount,
          errorDetails: result.errorDetails,
        });
      }

      return result;
    } catch (error) {
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
        'WBS同期処理中にエラーが発生しました',
        SyncErrorType.TRANSACTION_ERROR,
        { message: String(error) }
      );
    }
  }

  // エクセル側のでwbsデータを取得
  // エクセルデータはWBS名で取得する
  private async fetchExcelData(wbsName: string): Promise<ExcelWbs[]> {
    try {
      const excelWbs = await this.excelWbsRepository.findByWbsName(wbsName);
      if (!excelWbs || excelWbs.length === 0) {
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

  // ExcelWbsからTaskドメインを構築
  private buildTaskDomainFromExcel(args: {
    excelWbs: ExcelWbs,
    wbsId: number,
    phaseNameToId: Map<string, number>,
    assignees: WbsAssignee[],
  }): Task {
    const { excelWbs, wbsId, phaseNameToId, assignees } = args;
    const { task, periods } = WbsDataMapper.toAppWbs(excelWbs);

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

    return Task.create({
      taskNo,
      wbsId,
      name,
      status,
      phaseId,
      assigneeId,
      periods,
      progressRate: task.progressRate as number | undefined,
    });
  }

  // 担当者名から担当者IDを取得
  private findAssigneeIdFromDomain(tantoName: string | null, assignees: WbsAssignee[]): number | null {
    if (!tantoName) return null;
    const found = assignees.find(a => a.userName === tantoName);
    return found && found.id !== undefined ? found.id : null;
  }

  /**
   * 進捗スナップショット入力を構築する（時点データ・自己完結）。
   * - activeTasks（新規/存続/復活）：Task のperiods/status/progressRate＋担当者単価＋ExcelのJISSEKI実績から構築
   * - tombstoneStates（消失）：isRemoved=true。工数・単価は読み出し時に無視されるため0
   */
  private buildSnapshotInputs(
    activeTasks: Task[],
    tombstoneStates: TaskSyncState[],
    assignees: WbsAssignee[],
    excelByTaskNo: Map<string, ExcelWbs>,
  ): TaskProgressSnapshotInput[] {
    const costByAssigneeId = new Map<number, number>();
    assignees.forEach(a => {
      if (a.id !== undefined) costByAssigneeId.set(a.id, a.getCostPerHour());
    });

    const normalKosu = (period?: { manHours: { kosu: number; type: { type: string } }[] }): number =>
      (period?.manHours ?? [])
        .filter(m => m.type.type === 'NORMAL')
        .reduce((sum, m) => sum + Number(m.kosu), 0);

    const inputs: TaskProgressSnapshotInput[] = activeTasks.map((task) => {
      const taskNo = task.taskNo.getValue();
      const kijun = task.periods?.find(p => p.type.type === 'KIJUN');
      const yotei = task.periods?.find(p => p.type.type === 'YOTEI');
      const baseManHours = normalKosu(kijun);
      const plannedManHours = yotei ? normalKosu(yotei) : baseManHours;
      const excel = excelByTaskNo.get(taskNo);

      return {
        taskId: task.id ?? null, // 新規はnull（create後にtaskNoで解決）
        taskNo,
        progressRate: task.progressRate ?? null,
        status: task.status.status,
        plannedManHours,
        baseManHours,
        costPerHour:
          task.assigneeId !== undefined ? (costByAssigneeId.get(task.assigneeId) ?? 5000) : 5000,
        plannedStart: yotei?.startDate ?? null,
        plannedEnd: yotei?.endDate ?? null,
        baseStart: kijun?.startDate ?? null,
        baseEnd: kijun?.endDate ?? null,
        actualStart: excel?.JISSEKI_START_DATE ?? null,
        actualEnd: excel?.JISSEKI_END_DATE ?? null,
        isRemoved: false,
      };
    });

    // 消失タスクは tombstone スナップショット（値は読み出し時に無視）
    for (const s of tombstoneStates) {
      inputs.push({
        taskId: s.id,
        taskNo: s.taskNo,
        progressRate: null,
        status: 'NOT_STARTED',
        plannedManHours: 0,
        baseManHours: 0,
        costPerHour: 0,
        plannedStart: null,
        plannedEnd: null,
        baseStart: null,
        baseEnd: null,
        actualStart: null,
        actualEnd: null,
        isRemoved: true,
      });
    }

    return inputs;
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