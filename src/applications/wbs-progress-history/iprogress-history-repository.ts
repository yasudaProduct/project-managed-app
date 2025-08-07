/**
 * 進捗履歴リポジトリインターフェース
 */

import { WbsProgressHistory } from '../../domains/wbs-progress-history';

export interface HistoryQueryOptions {
  startDate?: Date;
  endDate?: Date;
  recordType?: 'AUTO' | 'MANUAL_SNAPSHOT';
  limit?: number;
  offset?: number;
}

export interface IProgressHistoryRepository {
  /**
   * 進捗履歴を保存
   */
  save(history: WbsProgressHistory): Promise<WbsProgressHistory>;

  /**
   * 指定されたWBSとID履歴を取得
   */
  findById(id: number): Promise<WbsProgressHistory | null>;

  /**
   * 指定されたWBSと日時に最も近い履歴を取得
   */
  findByWbsAndDate(wbsId: number, targetDate: Date): Promise<WbsProgressHistory | null>;

  /**
   * 指定されたWBSの履歴一覧を取得
   */
  findByWbs(wbsId: number, options?: HistoryQueryOptions): Promise<WbsProgressHistory[]>;

  /**
   * 指定されたWBSの履歴件数を取得
   */
  countByWbs(wbsId: number, options?: Omit<HistoryQueryOptions, 'limit' | 'offset'>): Promise<number>;

  /**
   * 古い履歴を削除
   */
  deleteOldHistories(wbsId: number, beforeDate: Date): Promise<number>;

  /**
   * 特定の履歴とそのタスク履歴を削除
   */
  delete(id: number): Promise<void>;
}