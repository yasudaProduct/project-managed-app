/**
 * タスク進捗率計算ドメインサービス
 *
 * @description
 * タスクの実効進捗率を計算するドメインサービス。
 * プロジェクト設定に基づき、3つの進捗測定方式（0/100法、50/50法、自己申告進捗率）で計算する。
 * EVMやスケジュール管理、見通し工数算出など、複数の機能で共通利用される。
 */

import { ProgressMeasurementMethod } from '@/types/progress-measurement';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';

/**
 * タスク進捗率計算サービス
 */
export class TaskProgressCalculator {
  /**
   * プロジェクト設定に基づいて実効進捗率を計算
   *
   * @param status タスクステータス
   * @param selfReportedProgress 自己申告進捗率（0-100）
   * @param method 進捗測定方式
   * @returns 実効進捗率（0-100）
   *
   * @example
   * // 0/100法: 完了のみ100%
   * TaskProgressCalculator.calculateEffectiveProgress('IN_PROGRESS', 50, 'ZERO_HUNDRED') // => 0
   * TaskProgressCalculator.calculateEffectiveProgress('COMPLETED', 50, 'ZERO_HUNDRED')   // => 100
   *
   * // 50/50法: 着手で50%、完了で100%
   * TaskProgressCalculator.calculateEffectiveProgress('IN_PROGRESS', 30, 'FIFTY_FIFTY')  // => 50
   * TaskProgressCalculator.calculateEffectiveProgress('COMPLETED', 30, 'FIFTY_FIFTY')    // => 100
   *
   * // 自己申告進捗率: 完了は100%優先、それ以外は申告値
   * TaskProgressCalculator.calculateEffectiveProgress('IN_PROGRESS', 75, 'SELF_REPORTED') // => 75
   * TaskProgressCalculator.calculateEffectiveProgress('COMPLETED', 75, 'SELF_REPORTED')   // => 100
   */
  static calculateEffectiveProgress(
    status: TaskStatus,
    selfReportedProgress: number | null,
    method: ProgressMeasurementMethod
  ): number {
    console.log('--- calculateEffectiveProgress ---');
    console.log('status', status);
    console.log('selfReportedProgress', selfReportedProgress);
    console.log('method', method);
    switch (method) {
      case 'ZERO_HUNDRED':
        return this.calculateZeroHundred(status);

      case 'FIFTY_FIFTY':
        return this.calculateFiftyFifty(status);

      case 'SELF_REPORTED':
        return this.calculateSelfReported(status, selfReportedProgress);

      default:
        // デフォルトは自己申告進捗率
        return this.calculateSelfReported(status, selfReportedProgress);
    }
  }

  /**
   * 0/100法: 完了のみ100%、それ以外は0%
   *
   * @param status タスクステータス
   * @returns 進捗率（0 or 100）
   *
   * @description
   * 保守的な進捗管理方式。確実な成果のみを評価する。
   * EVMにおいてリスクを重視する場合に適している。
   *
   * - NOT_STARTED: 0%
   * - IN_PROGRESS: 0%
   * - ON_HOLD: 0%
   * - COMPLETED: 100%
   */
  private static calculateZeroHundred(status: TaskStatus): number {
    return status === 'COMPLETED' ? 100 : 0;
  }

  /**
   * 50/50法: 着手で50%、完了で100%
   *
   * @param status タスクステータス
   * @returns 進捗率（0, 50, or 100）
   *
   * @description
   * バランス型の進捗管理方式。着手時に半分の価値を認める。
   * EVMにおいて作業開始時点での貢献を評価したい場合に適している。
   *
   * - NOT_STARTED: 0%
   * - IN_PROGRESS: 50%
   * - ON_HOLD: 0%
   * - COMPLETED: 100%
   */
  private static calculateFiftyFifty(status: TaskStatus): number {
    if (status === 'COMPLETED') return 100;
    if (status === 'IN_PROGRESS') return 50;
    return 0;
  }

  /**
   * 自己申告進捗率: wbs_task.progress_rateを使用（完了は100%優先）
   *
   * @param status タスクステータス
   * @param selfReportedProgress 自己申告進捗率
   * @returns 進捗率（0-100）
   *
   * @description
   * 最も柔軟な進捗管理方式。担当者が申告した進捗率をそのまま使用。
   * 完了ステータスは必ず100%として扱う（データ整合性のため）。
   * 自己申告値がない場合はステータスベースのフォールバック値を使用。
   *
   * - COMPLETED: 100%（申告値に関わらず）
   * - IN_PROGRESS: 申告値（なければ50%）
   * - NOT_STARTED: 0%
   * - ON_HOLD: 0%
   */
  private static calculateSelfReported(
    status: TaskStatus,
    selfReportedProgress: number | null
  ): number {
    // 完了ステータスは必ず100%（データ整合性のため優先）
    if (status === 'COMPLETED') {
      return 100;
    }

    // 自己申告進捗率がある場合はそれを使用（0-100の範囲でクランプ）
    if (selfReportedProgress !== null && selfReportedProgress !== undefined) {
      return Math.max(0, Math.min(100, selfReportedProgress));
    }

    // フォールバック: ステータスベースの推定値
    switch (status) {
      case 'NOT_STARTED':
        return 0;
      case 'IN_PROGRESS':
        return 50; // 進行中だが申告値がない場合の仮値
      case 'ON_HOLD':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * 複数タスクの加重平均進捗率を計算
   *
   * @param tasks タスクリスト（status, selfReportedProgress, plannedHours含む）
   * @param method 進捗測定方式
   * @returns 加重平均進捗率（0-100）
   *
   * @description
   * EVMのスケジュールパフォーマンス指標（SPI）計算などで使用。
   * 各タスクの予定工数を重みとして加重平均を計算する。
   *
   * @example
   * const tasks = [
   *   { status: 'COMPLETED', selfReportedProgress: 100, plannedHours: 10 },
   *   { status: 'IN_PROGRESS', selfReportedProgress: 50, plannedHours: 20 },
   *   { status: 'NOT_STARTED', selfReportedProgress: 0, plannedHours: 30 }
   * ];
   * TaskProgressCalculator.calculateWeightedAverageProgress(tasks, 'SELF_REPORTED')
   * // => (100*10 + 50*20 + 0*30) / (10+20+30) = 33.33
   */
  static calculateWeightedAverageProgress(
    tasks: Array<{
      status: TaskStatus;
      selfReportedProgress: number | null;
      plannedHours: number;
    }>,
    method: ProgressMeasurementMethod
  ): number {
    if (tasks.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const task of tasks) {
      const progress = this.calculateEffectiveProgress(
        task.status,
        task.selfReportedProgress,
        method
      );
      const weight = task.plannedHours || 0;

      weightedSum += progress * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}
