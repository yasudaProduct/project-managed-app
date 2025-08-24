import { injectable, inject } from 'inversify';
import type { IWbsSyncService, PreviewResult } from './IWbsSyncService';
import { ExcelWbs, SyncChanges, SyncResult, SyncError, SyncErrorType, ValidationError } from './ExcelWbs';
import { Task } from '@/domains/task/task';
import { SyncStatus, type PrismaClient } from '@prisma/client';
import { WbsDataMapper } from './WbsDataMapper';
import type { IExcelWbsRepository } from '@/applications/excel-sync/IExcelWbsRepository';
import type { ISyncLogRepository } from '@/applications/excel-sync/ISyncLogRepository';
// import prisma from '@/lib/prisma';
import { SYMBOL } from '@/types/symbol';
import { Phase } from '../phase/phase';
import { PhaseCode } from '../phase/phase-code';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import type { IUserRepository } from '@/applications/user/iuser-repositroy';
import { User } from '../user/user';
import { WbsAssignee } from '../wbs/wbs-assignee';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { randomString } from '@/lib/utils';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import { TaskNo } from '../task/value-object/task-id';
import { TaskStatus } from '../task/value-object/project-status';

type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

@injectable()
export class WbsSyncService implements IWbsSyncService {
  constructor(
    @inject(SYMBOL.IExcelWbsRepository) private excelWbsRepository: IExcelWbsRepository,
    @inject(SYMBOL.ISyncLogRepository) private syncLogRepository: ISyncLogRepository,
    @inject(SYMBOL.IPhaseRepository) private phaseRepository: IPhaseRepository,
    @inject(SYMBOL.IUserRepository) private userRepository: IUserRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
  ) { }

  // エクセル側のでwbsデータを取得
  // エクセルデータはWBS名で取得する
  async fetchExcelData(wbsName: string): Promise<ExcelWbs[]> {
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

  async detectChanges(
    excelData: ExcelWbs[],
    appData: Task[]
  ): Promise<SyncChanges> {
    const changes: SyncChanges = {
      wbsId: appData[0]?.wbsId,
      projectId: excelData[0]?.PROJECT_ID || '',
      toAdd: [],
      toUpdate: [],
      toDelete: [],
      timestamp: new Date(),
    };

    // アプリ側のタスクをWBS_IDでマッピング
    const appTaskMap = new Map(
      appData.map(task => [task.taskNo.getValue(), task])
    );

    // Excel側のデータを確認
    for (const excelWbs of excelData) {
      const appTask = appTaskMap.get(excelWbs.WBS_ID);

      if (!appTask) {
        // 新規追加
        changes.toAdd.push(excelWbs);
      } else {
        // 更新チェック
        if (WbsDataMapper.needsUpdate(excelWbs, appTask)) {
          changes.toUpdate.push(excelWbs);
        }
        // 処理済みのタスクをマップから削除
        appTaskMap.delete(excelWbs.WBS_ID);
      }
    }

    // 残ったアプリ側のタスクは削除対象
    changes.toDelete = Array.from(appTaskMap.keys()).filter(id => id !== null) as string[];

    return changes;
  }

  async applyChanges(changes: SyncChanges): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      projectId: changes.projectId,
      recordCount: 0,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
    };

    try {
      // リポジトリを使用して永続化する（トランザクションは未対応）
      const wbsId = changes.wbsId;

      // フェーズの取得（名前→ID）
      const phaseList = await this.phaseRepository.findByWbsId(wbsId);
      const phaseNameToId = new Map<string, number>();
      phaseList.forEach(p => {
        const id = (p as unknown as { id?: number }).id;
        if (p.name && id !== undefined) {
          phaseNameToId.set(p.name, id);
        }
      });

      // 既存担当者の取得
      const assignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);

      // 既存タスクの取得（taskNo→Task）
      const existingTasks = await this.taskRepository.findByWbsId(wbsId);
      const taskNoToTask = new Map<string, Task>();
      existingTasks.forEach(t => taskNoToTask.set(t.taskNo.getValue(), t));

      const validationErrors: Array<Record<string, unknown>> = [];

      // 削除処理
      if (changes.toDelete.length > 0) {
        // 既存リポジトリに削除APIがないため、ここでは削除件数のみカウント
        // 後続実装で TaskRepository.delete を用いた削除に置き換える
        result.deletedCount = changes.toDelete.length;
      }

      // 追加処理
      for (const excelWbs of changes.toAdd) {
        try {
          const task = this.buildTaskDomainFromExcel({ excelWbs, wbsId, phaseNameToId, assignees });
          await this.taskRepository.create(task);
          result.addedCount++;
        } catch (e) {
          validationErrors.push({
            type: 'VALIDATION_ERROR',
            taskNo: excelWbs.WBS_ID,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // 更新処理
      for (const excelWbs of changes.toUpdate) {
        const existing = taskNoToTask.get(excelWbs.WBS_ID);
        try {
          if (!existing) {
            // 既存が見つからない場合は追加扱い
            const task = this.buildTaskDomainFromExcel({ excelWbs, wbsId, phaseNameToId, assignees });
            await this.taskRepository.create(task);
            result.addedCount++;
          } else {
            const updated = this.buildTaskDomainFromExcel({ excelWbs, wbsId, phaseNameToId, assignees, base: existing });
            await this.taskRepository.update(wbsId, updated);
            result.updatedCount++;
          }
        } catch (e) {
          validationErrors.push({
            type: 'VALIDATION_ERROR',
            taskNo: excelWbs.WBS_ID,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      result.recordCount = changes.toAdd.length + changes.toUpdate.length;

      // 成否
      result.success = validationErrors.length === 0;
      if (validationErrors.length > 0) {
        result.errorDetails = { validationErrors };
      }
    } catch (error) {
      // エラーログを記録
      await this.syncLogRepository.recordSync({
        projectId: changes.projectId,
        syncStatus: SyncStatus.FAILED,
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
        '同期処理中にエラーが発生しました',
        SyncErrorType.TRANSACTION_ERROR,
        { message: String(error) }
      );
    }

    return result;
  }

  // ExcelフェーズからWBSフェーズをドメインを作成
  async excelToWbsPhase(excelWbsList: ExcelWbs[], wbsId: number): Promise<Phase[]> {
    // 既存のWbsPhaseに存在しない場合は作成
    // マッピング仕様：
    // ・excelのPHASE != wbsPhase.nameの場合はドメインモデルを作成
    // ・excelのPHASEからWBS_IDのハイフンより左側をフェーズコードとする
    // ・フェーズコードの昇順でseqを採番する

    // 既存のフェーズを取得
    const existingPhases = await this.phaseRepository.findByWbsId(wbsId);

    const existingPhaseMap = new Map<string, Record<string, unknown>>();
    for (const phase of existingPhases) {
      existingPhaseMap.set(phase.name, {
        name: phase.name,
        code: phase.code,
        seq: phase.seq,
      });
    }

    // 新しいフェーズを作成
    const uniquePhases = new Set<{ name: string, code: string }>();
    excelWbsList.forEach(excelWbs => {
      // フェーズが存在しない場合は追加
      if (excelWbs.PHASE && !existingPhaseMap.has(excelWbs.PHASE)) {
        const code = excelWbs.WBS_ID.split('-')[0];
        const name = excelWbs.PHASE;
        uniquePhases.add({ name, code });
      }
    });

    // フェーズを作成
    const newPhases = [];
    let seq = 1;
    for (const phase of Array.from(uniquePhases).sort((a, b) => a.code.localeCompare(b.code))) {
      newPhases.push(Phase.create({
        name: phase.name,
        code: new PhaseCode(phase.code),
        seq: seq++,
      }));
    }

    return newPhases;
  }

  // ExcelTANTOからWBSユーザーと担当者をドメインを作成
  async excelToWbsUserAndAssignee(excelWbs: ExcelWbs[], wbsId: number): Promise<{ users: User[], assignees: WbsAssignee[] }> {
    // 既存のユーザーを取得
    // 既存のユーザーに存在しない場合は作成
    // マッピング仕様：
    // ・excelのTANTO != user.displayNameの場合はドメインモデルを作成
    // ・excelのTANTO に対応する既存ユーザーがいれば WbsAssignee を作成（rate は暫定で 100）
    // ・TANTO が null/空は無視

    // 既存のユーザーを取得（displayName -> User）
    const existingUsersByDisplayName = new Map<string, User>();
    for (const excel of excelWbs) {
      if (excel.TANTO) {
        const users = await this.userRepository.findByWbsDisplayName(excel.TANTO);
        users.forEach(user => existingUsersByDisplayName.set(user.displayName, user));
      }
    }

    // 既存の担当者を取得（wbsId）
    const existingAssignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);
    const existingAssigneeUserIds = new Set(existingAssignees.map(a => a.userId));

    // 新規作成対象ユーザー（重複除外）
    const newUsers: User[] = [];
    const seenNewUserNames = new Set<string>();

    // 作成対象の WbsAssignee（重複除外）
    const newAssignees: WbsAssignee[] = [];
    const seenAssigneeUserIds = new Set<string>();

    for (const excel of excelWbs) {
      if (!excel.TANTO) continue;

      const displayName = excel.TANTO;
      const existingUser = existingUsersByDisplayName.get(displayName);

      if (existingUser) {
        // 既存ユーザーがいる場合は、担当者が未登録なら WbsAssignee を作成
        const userId = existingUser.id as string;
        if (userId && !existingAssigneeUserIds.has(userId) && !seenAssigneeUserIds.has(userId)) {
          newAssignees.push(WbsAssignee.create({ userId, rate: 100 }));
          seenAssigneeUserIds.add(userId);
        }
      } else {
        // 既存ユーザーがいない場合はユーザーを作成（同一表示名は一度だけ）
        if (!seenNewUserNames.has(displayName)) {
          // 新規ユーザーは一時的に displayName を id として扱う
          const tempId = randomString(6);
          const newUser = User.createFromDb({
            id: tempId,
            name: displayName,
            displayName: displayName,
            email: displayName + '@example.com',
          });
          newUsers.push(newUser);
          seenNewUserNames.add(displayName);

          // 同時に担当者も作成（同一ユーザーは一度だけ）
          if (!existingAssigneeUserIds.has(tempId) && !seenAssigneeUserIds.has(tempId)) {
            newAssignees.push(WbsAssignee.create({ userId: tempId, rate: 100 }));
            seenAssigneeUserIds.add(tempId);
          }
        }
      }
    }

    return { users: newUsers, assignees: newAssignees };
  }

  // フェーズを作成
  private async ensurePhases(tx: PrismaTransaction, wbsId: number, changes: SyncChanges): Promise<Map<string, Record<string, unknown>>> {
    const phaseMap = new Map<string, Record<string, unknown>>();

    // 既存のフェーズを取得
    const existingPhases = await tx.wbsPhase.findMany({
      where: { wbsId },
    });

    for (const phase of existingPhases) {
      phaseMap.set(phase.name, phase);
    }

    // 新しいフェーズを作成
    const uniquePhases = new Set<{ name: string, code: string }>();
    [...changes.toAdd, ...changes.toUpdate].forEach(excelWbs => {
      // フェーズが存在しない場合は追加
      if (excelWbs.PHASE && !phaseMap.has(excelWbs.PHASE)) {
        // ExcelWbsのWBS_IDとのハイフンより左側をフェーズコードとする
        const code = excelWbs.WBS_ID.split('-')[0];
        uniquePhases.add({ name: excelWbs.PHASE, code });
      }
    });

    // フェーズを作成
    // seq 採番は将来の永続化時に使用予定

    return phaseMap;
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

    // ドメイン制約に合わせて変換
    const taskNo = TaskNo.reconstruct(task.taskNo as string);
    const name = (task.name as string) || '';
    const status = new TaskStatus({ status: task.status as ReturnType<TaskStatus['getStatus']> });
    const phaseId = excelWbs.PHASE ? phaseNameToId.get(excelWbs.PHASE) : undefined;
    const assigneeId = this.findAssigneeIdFromDomain(excelWbs.TANTO, assignees) ?? undefined;

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

  // 旧Prisma直叩きの作成・更新は削除し、TaskRepository 経由で実装

  // プレビュー機能（ドメイン制約チェック付き）
  async previewChanges(wbsId: number, wbsName: string): Promise<PreviewResult> {
    const validationErrors: ValidationError[] = [];

    try {
      // Excelデータを取得
      const excelData = await this.fetchExcelData(wbsName);

      // 既存タスクを取得
      const appData = await this.taskRepository.findByWbsId(wbsId);

      // 変更を検出
      const changes = await this.detectChanges(excelData, appData);

      // フェーズの準備
      const phaseList = await this.phaseRepository.findByWbsId(wbsId);
      const phaseNameToId = new Map<string, number>();
      phaseList.forEach(p => {
        const id = (p as unknown as { id?: number }).id;
        if (p.name && id !== undefined) {
          phaseNameToId.set(p.name, id);
        }
      });

      // 新規フェーズを検出
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const newPhases = await this.excelToWbsPhase(excelData, wbsId);

      // 新規ユーザーと担当者を検出
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { users: newUsers, assignees: newAssignees } = await this.excelToWbsUserAndAssignee(excelData, wbsId);

      // 既存担当者の取得
      const assignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);

      // 追加・更新タスクのドメイン制約をチェック
      const allChangedTasks = [...changes.toAdd, ...changes.toUpdate];
      for (const excelWbs of allChangedTasks) {
        try {
          // ドメインモデルを生成してバリデーション
          this.validateTaskDomain(excelWbs, wbsId, phaseNameToId, assignees);
        } catch (error) {
          const field = this.getErrorField(error);
          validationErrors.push({
            taskNo: excelWbs.WBS_ID,
            field,
            message: error instanceof Error ? error.message : String(error),
            value: this.getFieldValue(excelWbs, field)
          });
        }
      }

      return {
        changes,
        validationErrors,
        newPhases: [],//newPhases,
        newUsers: [],// newUsers,
        newAssignees: []// newAssignees
      };
    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }
      throw new SyncError(
        'プレビュー処理中にエラーが発生しました',
        SyncErrorType.TRANSACTION_ERROR,
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // 洗い替え処理（全削除→全インポート）
  async replaceAll(wbsId: number, wbsName: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      projectId: '',
      recordCount: 0,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
    };

    try {
      // Excelデータを取得
      const excelData = await this.fetchExcelData(wbsName);
      if (excelData.length === 0) {
        throw new SyncError(
          'インポートするデータがありません',
          SyncErrorType.VALIDATION_ERROR,
          { wbsName }
        );
      }

      result.projectId = excelData[0].PROJECT_ID;

      // 既存のWBS関連データを全削除
      const existingTasks = await this.taskRepository.findByWbsId(wbsId);
      for (const task of existingTasks) {
        if (task.id) {
          await this.taskRepository.delete(task.id);
          result.deletedCount++;
        }
      }

      // フェーズを作成
      const newPhases = await this.excelToWbsPhase(excelData, wbsId);
      for (const phase of newPhases) {
        await this.phaseRepository.create(wbsId, phase);
      }

      // フェーズを再取得（IDが必要）
      const phaseList = await this.phaseRepository.findByWbsId(wbsId);
      const phaseNameToId = new Map<string, number>();
      phaseList.forEach(p => {
        const id = (p as unknown as { id?: number }).id;
        if (p.name && id !== undefined) {
          phaseNameToId.set(p.name, id);
        }
      });

      // ユーザーと担当者を作成
      const { users: newUsers, assignees: newAssignees } = await this.excelToWbsUserAndAssignee(excelData, wbsId);

      // 新規ユーザーを作成
      const userIdMap = new Map<string, string>();
      for (const user of newUsers) {
        const created = await this.userRepository.save(user);
        if (created.id && user.id) {
          userIdMap.set(user.id, created.id);
        }
      }

      // 担当者を作成（ユーザーIDを更新）
      for (const assignee of newAssignees) {
        const tempId = assignee.userId;
        const realUserId = userIdMap.get(tempId) || tempId;
        const newAssignee = WbsAssignee.create({ userId: realUserId, rate: assignee.getRate() });
        await this.wbsAssigneeRepository.create(wbsId, newAssignee);
      }

      // 担当者を再取得
      const assignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);

      // 全タスクをインポート
      const validationErrors: Array<Record<string, unknown>> = [];
      for (const excelWbs of excelData) {
        try {
          const task = this.buildTaskDomainFromExcel({ excelWbs, wbsId, phaseNameToId, assignees });
          await this.taskRepository.create(task);
          result.addedCount++;
        } catch (error) {
          validationErrors.push({
            type: 'VALIDATION_ERROR',
            taskNo: excelWbs.WBS_ID,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      result.recordCount = excelData.length;
      result.success = validationErrors.length === 0;

      if (validationErrors.length > 0) {
        result.errorDetails = { validationErrors };
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
        '洗い替え処理中にエラーが発生しました',
        SyncErrorType.TRANSACTION_ERROR,
        { message: String(error) }
      );
    }
  }

  // ドメイン制約をチェック（生成のみ、保存しない）
  private validateTaskDomain(excelWbs: ExcelWbs, wbsId: number, phaseNameToId: Map<string, number>, assignees: WbsAssignee[]): void {
    const { task, periods } = WbsDataMapper.toAppWbs(excelWbs);

    // 必須フィールドチェック
    if (!task.taskNo) {
      throw new Error('タスクNoは必須です');
    }
    if (!task.name) {
      throw new Error('タスク名は必須です');
    }
    // if (!task.status) {
    //   throw new Error('ステータスは必須です');
    // }
    // if (!excelWbs.TANTO) {
    //   throw new Error('担当者は必須です');
    // }
    if (!excelWbs.PHASE) {
      throw new Error('フェーズは必須です');
    }

    // フェーズの存在チェック
    const phaseId = phaseNameToId.get(excelWbs.PHASE);
    if (!phaseId) {
      throw new Error(`フェーズ「${excelWbs.PHASE}」が見つかりません`);
    }

    // 担当者の存在チェック
    const assigneeId = this.findAssigneeIdFromDomain(excelWbs.TANTO, assignees);
    if (!assigneeId) {
      throw new Error(`担当者「${excelWbs.TANTO}」が見つかりません`);
    }

    // ドメインモデルを生成（制約違反があれば例外が発生）
    const taskNo = TaskNo.reconstruct(task.taskNo as string);
    const status = new TaskStatus({ status: task.status as ReturnType<TaskStatus['getStatus']> });

    Task.create({
      taskNo,
      wbsId,
      name: task.name as string,
      status,
      phaseId,
      assigneeId,
      periods,
    });
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