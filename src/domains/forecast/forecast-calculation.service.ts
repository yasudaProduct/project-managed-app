/**
 * 見通し工数計算サービス
 * 設計書：/docs/forecast-calculation-design.md
 */

import { WbsTaskData } from "@/applications/wbs/query/wbs-query-repository";

export interface ForecastCalculationOptions {
  method: 'conservative' | 'realistic' | 'optimistic';
}

export interface ForecastCalculationResult {
  taskId: string;
  taskName: string;
  plannedHours: number;
  actualHours: number;
  progressRate: number;
  effectiveProgressRate: number; // 完了ステータス優先後の進捗率
  forecastHours: number;
  completionStatus: string;
}

export class ForecastCalculationService {
  /**
   * タスクの見通し工数を計算
   * @param task タスクデータ
   * @param options 計算オプション
   * @returns 見通し工数計算結果
   * @description
   * 完了ステータスは100%として扱い、データベースの進捗率より優先
   */
  static calculateTaskForecast(
    task: WbsTaskData,
    options: ForecastCalculationOptions = { method: 'realistic' }
  ): ForecastCalculationResult {
    // 予定工数と実績工数を取得
    const plannedHours = task.yoteiKosu || 0;
    const actualHours = task.jissekiKosu || 0;

    // 完了ステータス優先で実効進捗率を決定
    const effectiveProgressRate = this.getEffectiveProgressRate(
      task.status,
      task.progressRate
    );

    // 見通し工数計算
    const forecastHours = this.calculateForecastHours(
      plannedHours,
      actualHours,
      effectiveProgressRate,
      options.method
    );

    return {
      taskId: task.id,
      taskName: task.name,
      plannedHours,
      actualHours,
      progressRate: task.progressRate || 0,
      effectiveProgressRate,
      forecastHours,
      completionStatus: task.status,
    };
  }

  /**
   * 複数タスクの見通し工数を一括計算
   */
  static calculateMultipleTasksForecast(
    tasks: WbsTaskData[],
    options: ForecastCalculationOptions = { method: 'realistic' }
  ): ForecastCalculationResult[] {
    return tasks.map(task => this.calculateTaskForecast(task, options));
  }

  /**
   * 完了ステータス優先で実効進捗率を決定
   * @param status タスクステータス
   * @param progressRate 進捗率
   * @returns 実効進捗率
   * @description
   * 完了ステータスは100%として扱い、データベースの進捗率より優先
   */
  private static getEffectiveProgressRate(
    status: string,
    progressRate: number | null
  ): number {
    // 完了ステータスの場合は必ず100%
    if (status === 'COMPLETED') {
      return 100;
    }

    // 完了以外の場合はデータベースの値またはステータスベースの値
    if (progressRate !== null && progressRate !== undefined) {
      return Math.max(0, Math.min(100, progressRate));
    }

    // フォールバック: ステータスベースの進捗率
    switch (status) {
      case 'NOT_STARTED':
        return 0;
      case 'IN_PROGRESS':
        return 50;
      case 'ON_HOLD':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * 見通し工数を計算（実績 + 残りの予定）
   * @param plannedHours 予定工数
   * @param actualHours 実績工数
   * @param progressRate 進捗率
   * @param method 計算方法
   * @returns 見通し工数
   * @description
   * 計算方法に応じて見通し工数を計算
   * 計算方法は保守的、現実的、楽観的の3つの方法がある
   * 保守的：実績ベースの推定（実績工数 / 進捗率 * 100）
   * 現実的：実績 + 残り予定の加重平均
   * 楽観的：実績 + 残り予定
   */
  private static calculateForecastHours(
    plannedHours: number,
    actualHours: number,
    progressRate: number,
    method: 'conservative' | 'realistic' | 'optimistic'
  ): number {
    // 完了済みの場合は実績工数をそのまま返す
    if (progressRate >= 100) {
      return actualHours;
    }

    // 進捗率が0の場合は予定工数をそのまま返す TODO: 実績が入っていても申告進捗が0%だったらprogressRateは0%になる
    if (progressRate <= 0) {
      return plannedHours;
    }

    // 残り工数を計算
    const remainingWork = (100 - progressRate) / 100;

    switch (method) {
      case 'conservative':
        // 保守的：実績ベースの推定（実績工数 / 進捗率 * 100）
        return progressRate > 0 ? (actualHours / progressRate) * 100 : plannedHours;

      case 'realistic':
        // 現実的：実績 + 残り予定の加重平均
        const estimatedFromActual = progressRate > 0 ? (actualHours / progressRate) * 100 : plannedHours;
        const remainingPlanned = plannedHours * remainingWork;

        // 進捗率に応じて実績ベースと予定ベースを加重平均
        // 進捗率が高いほど実績ベースの重みを大きくする
        const actualWeight = progressRate / 100;
        const plannedWeight = 1 - actualWeight;

        return estimatedFromActual * actualWeight + (actualHours + remainingPlanned) * plannedWeight;

      case 'optimistic':
        // 楽観的：実績 + 残り予定
        const remainingPlannedHours = plannedHours * remainingWork;
        return actualHours + remainingPlannedHours;

      default:
        return plannedHours;
    }
  }

  /**
   * 基準工数を取得（task_period.type='KIJUN'）
   * TODO: 基準工数データの取得が必要な場合に実装
   */
  static getBaselineHours(task: WbsTaskData): number {
    // 現在の実装では基準工数は取得していないため、予定工数を代用
    // 必要に応じて task_period テーブルから KIJUN タイプの工数を取得する実装を追加
    return task.yoteiKosu || 0;
  }
}