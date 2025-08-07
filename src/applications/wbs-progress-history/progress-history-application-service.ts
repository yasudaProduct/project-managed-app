/**
 * 進捗履歴アプリケーションサービス
 */

import { injectable, inject } from 'inversify';
import { SYMBOL } from '../../types/symbol';
import type { IProgressHistoryRepository, HistoryQueryOptions } from './iprogress-history-repository';
import type { IWbsRepository } from '../wbs/iwbs-repository';
import type { ITaskRepository } from '../task/itask-repository';
import {
  WbsProgressHistory,
  ProgressHistoryService,
  WbsTaskData,
} from '../../domains/wbs-progress-history';

export interface IProgressHistoryApplicationService {
  recordTaskUpdate(wbsId: number): Promise<WbsProgressHistory>;
  createSnapshot(wbsId: number, snapshotName?: string): Promise<WbsProgressHistory>;
  getProgressAtDate(wbsId: number, targetDate: Date): Promise<WbsProgressHistory | null>;
  getProgressHistories(wbsId: number, options?: HistoryQueryOptions): Promise<WbsProgressHistory[]>;
  getProgressHistoryCount(wbsId: number, options?: Omit<HistoryQueryOptions, 'limit' | 'offset'>): Promise<number>;
  deleteOldData(wbsId: number, beforeDate: Date): Promise<number>;
  deleteProgressHistory(id: number): Promise<void>;
  getProgressHistoryById(id: number): Promise<WbsProgressHistory | null>;
}

@injectable()
export class ProgressHistoryApplicationService implements IProgressHistoryApplicationService {
  constructor(
    @inject(SYMBOL.IProgressHistoryRepository)
    private readonly progressHistoryRepository: IProgressHistoryRepository,
    @inject(SYMBOL.IWbsRepository)
    private readonly wbsRepository: IWbsRepository,
    @inject(SYMBOL.ITaskRepository)
    private readonly taskRepository: ITaskRepository
  ) {}

  /**
   * タスク更新時の自動進捗記録
   */
  async recordTaskUpdate(wbsId: number): Promise<WbsProgressHistory> {
    // WBSの存在確認
    const wbs = await this.wbsRepository.findById(wbsId);
    if (!wbs) {
      throw new Error('WBSが見つかりません');
    }

    // WBSの全タスクを取得
    const tasks = await this.getWbsTaskData(wbsId);

    // 自動進捗記録を作成
    const progressHistory = ProgressHistoryService.createAutoProgressRecord(wbsId, tasks);

    // 保存
    return await this.progressHistoryRepository.save(progressHistory);
  }

  /**
   * 手動スナップショット作成
   */
  async createSnapshot(wbsId: number, snapshotName?: string): Promise<WbsProgressHistory> {
    // WBSの存在確認
    const wbs = await this.wbsRepository.findById(wbsId);
    if (!wbs) {
      throw new Error('WBSが見つかりません');
    }

    // デフォルトのスナップショット名を設定
    const finalSnapshotName = snapshotName || `手動スナップショット_${new Date().toLocaleString('ja-JP')}`;

    // WBSの全タスクを取得
    const tasks = await this.getWbsTaskData(wbsId);

    // 手動スナップショットを作成
    const progressHistory = ProgressHistoryService.createManualSnapshot(
      wbsId,
      finalSnapshotName,
      tasks
    );

    // 保存
    return await this.progressHistoryRepository.save(progressHistory);
  }

  /**
   * 特定日時の進捗取得
   */
  async getProgressAtDate(wbsId: number, targetDate: Date): Promise<WbsProgressHistory | null> {
    return await this.progressHistoryRepository.findByWbsAndDate(wbsId, targetDate);
  }

  /**
   * 進捗履歴一覧取得
   */
  async getProgressHistories(wbsId: number, options?: HistoryQueryOptions): Promise<WbsProgressHistory[]> {
    return await this.progressHistoryRepository.findByWbs(wbsId, options);
  }

  /**
   * 進捗履歴件数取得
   */
  async getProgressHistoryCount(
    wbsId: number,
    options?: Omit<HistoryQueryOptions, 'limit' | 'offset'>
  ): Promise<number> {
    return await this.progressHistoryRepository.countByWbs(wbsId, options);
  }

  /**
   * 古いデータの削除
   */
  async deleteOldData(wbsId: number, beforeDate: Date): Promise<number> {
    // WBSの存在確認
    const wbs = await this.wbsRepository.findById(wbsId);
    if (!wbs) {
      throw new Error('WBSが見つかりません');
    }

    return await this.progressHistoryRepository.deleteOldHistories(wbsId, beforeDate);
  }

  /**
   * 特定の進捗履歴を削除
   */
  async deleteProgressHistory(id: number): Promise<void> {
    const progressHistory = await this.progressHistoryRepository.findById(id);
    if (!progressHistory) {
      throw new Error('進捗履歴が見つかりません');
    }

    await this.progressHistoryRepository.delete(id);
  }

  /**
   * 進捗履歴の詳細取得
   */
  async getProgressHistoryById(id: number): Promise<WbsProgressHistory | null> {
    return await this.progressHistoryRepository.findById(id);
  }

  /**
   * WBSのタスクデータを取得してWbsTaskData形式に変換
   */
  private async getWbsTaskData(wbsId: number): Promise<WbsTaskData[]> {
    const tasks = await this.taskRepository.findByWbsId(wbsId);
    
    return tasks.map(task => ({
      id: task.id!,
      taskNo: task.taskNo!.getValue(),
      name: task.name,
      status: task.status.toString(),
      assigneeId: task.assignee?.id,
      assigneeName: task.assignee?.name,
      phaseId: task.phaseId,
      phaseName: task.phase?.name,
      plannedStartDate: task.periods?.find(p => p.type.toString() === 'YOTEI')?.startDate,
      plannedEndDate: task.periods?.find(p => p.type.toString() === 'YOTEI')?.endDate,
      actualStartDate: task.periods?.find(p => p.type.toString() === 'JISSEKI')?.startDate,
      actualEndDate: task.periods?.find(p => p.type.toString() === 'JISSEKI')?.endDate,
      plannedManHours: task.periods
        ?.filter(p => p.type.toString() === 'YOTEI')
        .reduce((sum, p) => sum + p.manHours.reduce((s, k) => s + k.kosu, 0), 0) || 0,
      actualManHours: task.periods
        ?.filter(p => p.type.toString() === 'JISSEKI')
        .reduce((sum, p) => sum + p.manHours.reduce((s, k) => s + k.kosu, 0), 0) || 0,
      progressRate: this.calculateProgressRate(task.status.toString()),
    }));
  }

  /**
   * ステータスから進捗率を計算
   */
  private calculateProgressRate(status: string): number {
    switch (status) {
      case 'NOT_STARTED':
        return 0;
      case 'IN_PROGRESS':
        return 50; // 仮の値、実際は別途進捗率を管理する可能性
      case 'COMPLETED':
        return 100;
      default:
        return 0;
    }
  }
}