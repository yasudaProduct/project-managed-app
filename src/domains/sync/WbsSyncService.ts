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

type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

@injectable()
export class WbsSyncService implements IWbsSyncService {
  constructor(
    @inject(SYMBOL.IExcelWbsRepository) private excelWbsRepository: IExcelWbsRepository,
    @inject(SYMBOL.ISyncLogRepository) private syncLogRepository: ISyncLogRepository
  ) { }

  async fetchExcelData(projectId: string): Promise<ExcelWbs[]> {
    try {
      return await this.excelWbsRepository.findByProjectId(projectId);
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
      // トランザクション内で変更を適用
      await prisma.$transaction(async (tx) => {
        // プロジェクトに紐づくWBSを取得
        const project = await tx.projects.findUnique({
          where: { id: changes.projectId },
          include: { wbs: true },
        });

        if (!project || !project.wbs[0]) {
          throw new SyncError(
            'プロジェクトまたはWBSが見つかりません',
            SyncErrorType.VALIDATION_ERROR,
            { projectId: changes.projectId }
          );
        }

        const wbsId = project.wbs[0].id;

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
    const uniquePhases = new Set<string>();
    [...changes.toAdd, ...changes.toUpdate].forEach(excelWbs => {
      if (excelWbs.PHASE && !phaseMap.has(excelWbs.PHASE)) {
        uniquePhases.add(excelWbs.PHASE);
      }
    });

    let seq = existingPhases.length + 1;
    for (const phaseName of uniquePhases) {
      const newPhase = await tx.wbsPhase.create({
        data: {
          wbsId,
          name: phaseName,
          code: `PHASE_${seq}`,
          seq: seq++,
        },
      });
      phaseMap.set(phaseName, newPhase);
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