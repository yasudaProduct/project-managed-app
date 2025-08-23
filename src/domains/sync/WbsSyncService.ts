import { injectable, inject } from 'inversify';
import type { IWbsSyncService } from './IWbsSyncService';
import { ExcelWbs, SyncChanges, SyncResult, SyncError, SyncErrorType } from './ExcelWbs';
import { Task } from '@/domains/task/task';
import { SyncStatus, TaskStatus, PeriodType, KosuType, type PrismaClient } from '@prisma/client';
import { WbsDataMapper } from './WbsDataMapper';
import type { IExcelWbsRepository } from '@/applications/sync/IExcelWbsRepository';
import type { ISyncLogRepository } from '@/applications/sync/ISyncLogRepository';
import prisma from '@/lib/prisma';
import { SYMBOL } from '@/types/symbol';
import { Phase } from '../phase/phase';
import { PhaseCode } from '../phase/phase-code';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import type { IUserRepository } from '@/applications/user/iuser-repositroy';
import { User } from '../user/user';
import { Assignee } from '../task/assignee';

type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

@injectable()
export class WbsSyncService implements IWbsSyncService {
  constructor(
    @inject(SYMBOL.IExcelWbsRepository) private excelWbsRepository: IExcelWbsRepository,
    @inject(SYMBOL.ISyncLogRepository) private syncLogRepository: ISyncLogRepository,
    @inject(SYMBOL.IPhaseRepository) private phaseRepository: IPhaseRepository,
    @inject(SYMBOL.IUserRepository) private userRepository: IUserRepository,
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

      // リポジトリを使用して永続化する
      // リポジトリ間のトランザクションを検討する

      // ドメインモデル作成

      // 工程を作成




      // 担当者を作成
      // タスクを作成
      // 期間を作成
      // 工数を作成

      // トランザクション内で変更を適用
      await prisma.$transaction(async (tx) => {
        const wbsId = changes.wbsId;

        // フェーズの取得・作成
        const phases = await this.ensurePhases(tx as PrismaTransaction, wbsId, changes);

        // 担当者の取得
        const assignees = await tx.wbsAssignee.findMany({
          where: { wbsId },
          include: { assignee: true },
        });

        // 削除処理
        if (changes.toDelete.length > 0) {
          await tx.wbsTask.deleteMany({
            where: {
              wbsId,
              taskNo: { in: changes.toDelete },
            },
          });
          result.deletedCount = changes.toDelete.length;
        }

        // 追加処理
        for (const excelWbs of changes.toAdd) {
          await this.createTask(tx as PrismaTransaction, wbsId, excelWbs, phases, assignees);
          result.addedCount++;
        }

        // 更新処理
        for (const excelWbs of changes.toUpdate) {
          await this.updateTask(tx as PrismaTransaction, wbsId, excelWbs, phases, assignees);
          result.updatedCount++;
        }

        result.recordCount = changes.toAdd.length + changes.toUpdate.length;

        // 同期ログを記録
        await tx.syncLog.create({
          data: {
            projectId: changes.projectId,
            syncStatus: SyncStatus.SUCCESS,
            recordCount: result.recordCount,
            addedCount: result.addedCount,
            updatedCount: result.updatedCount,
            deletedCount: result.deletedCount,
          },
        });
      });

      result.success = true;
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

  // ExcelTANTOからWBSユーザーをドメインを作成
  async excelToWbsUser(excelWbs: ExcelWbs[]): Promise<User[]> {
    // 既存のユーザーを取得
    // 既存のユーザーに存在しない場合は作成
    // マッピング仕様：
    // ・excelのTANTO != user.displayNameの場合はドメインモデルを作成
    // ・その他項目は仮登録

    // 既存のユーザーを取得
    const existingUsers = new Map<string, User>();
    for (const excel of excelWbs) {
      if (excel.TANTO) {
        const users = await this.userRepository.findByWbsDisplayName(excel.TANTO);
        users.forEach(user => existingUsers.set(user.displayName, user));
      }
    }

    const newUsers = [];
    for (const excel of excelWbs) {
      if (excel.TANTO) {
        const user = existingUsers.get(excel.TANTO);
        if (!user) {
          newUsers.push(User.create({
            name: excel.TANTO!,
            displayName: excel.TANTO!,
            email: excel.TANTO! + '@example.com', // ここでは仮作成
          }));
        }
      }
    }

    return newUsers;
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
    let seq = 1;
    for (const phase of Array.from(uniquePhases).sort((a, b) => a.code.localeCompare(b.code))) {
      // ドメインモデルを作成
      const newPhase = Phase.create({
        name: phase.name,
        code: new PhaseCode(phase.code),
        seq: seq++,
      });

      // ドメインモデルを永続化
      // await this.phaseRepository.create(newPhase);

      // phaseMap.set(phase.name, newPhase);
    }

    return phaseMap;
  }

  private async createTask(
    tx: PrismaTransaction,
    wbsId: number,
    excelWbs: ExcelWbs,
    phases: Map<string, Record<string, unknown>>,
    assignees: Record<string, unknown>[]
  ): Promise<void> {
    const { task, periods } = WbsDataMapper.toAppWbs(excelWbs);

    // フェーズIDの取得
    const phaseId = excelWbs.PHASE ? phases.get(excelWbs.PHASE)?.id as number : null;

    // 担当者IDの取得
    const assigneeId = this.findAssigneeId(excelWbs.TANTO, assignees);

    // タスクを作成
    const createdTask = await tx.wbsTask.create({
      data: {
        taskNo: task.taskNo as string,
        name: task.name as string,
        status: task.status as TaskStatus,
        wbsId,
        phaseId,
        assigneeId,
      },
    });

    // 期間を作成
    for (const period of periods) {
      const createdPeriod = await tx.taskPeriod.create({
        data: {
          taskId: createdTask.id,
          startDate: period.startDate,
          endDate: period.endDate,
          type: period.type.type as PeriodType,
        },
      });

      // 対応する工数を作成
      for (const manHour of period.manHours) {
        await tx.taskKosu.create({
          data: {
            wbsId,
            periodId: createdPeriod.id,
            kosu: manHour.kosu,
            type: manHour.type.type as KosuType,
          },
        });
      }
    }
  }

  private async updateTask(
    tx: PrismaTransaction,
    wbsId: number,
    excelWbs: ExcelWbs,
    phases: Map<string, Record<string, unknown>>,
    assignees: Record<string, unknown>[]
  ): Promise<void> {
    const { task } = WbsDataMapper.toAppWbs(excelWbs);

    // フェーズIDの取得
    const phaseId = excelWbs.PHASE ? phases.get(excelWbs.PHASE)?.id as number : null;

    // 担当者IDの取得
    const assigneeId = this.findAssigneeId(excelWbs.TANTO, assignees);

    // タスクを更新
    await tx.wbsTask.update({
      where: {
        taskNo_wbsId: {
          taskNo: excelWbs.WBS_ID,
          wbsId,
        },
      },
      data: {
        name: task.name as string,
        status: task.status as TaskStatus,
        phaseId,
        assigneeId,
      },
    });

    // TODO: 期間と工数の更新処理も実装する必要がある
  }

  private findAssigneeId(tantoName: string | null, assignees: Record<string, unknown>[]): number | null {
    if (!tantoName) return null;

    const assignee = assignees.find(a => {
      const assigneeInfo = a.assignee as Record<string, unknown>;
      return assigneeInfo.name === tantoName ||
        assigneeInfo.displayName === tantoName;
    });

    return (assignee?.id as number) || null;
  }
}