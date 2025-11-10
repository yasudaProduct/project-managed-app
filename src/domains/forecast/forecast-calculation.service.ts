/**
 * 見通し工数計算サービス
 * 設計書：/docs/feature/forecast-hours-specification.md
 */

import { WbsTaskData } from "@/applications/wbs/query/wbs-query-repository";
import { TaskProgressCalculator, TaskStatus } from "@/domains/task/task-progress-calculator";
import { ProgressMeasurementMethod } from "@/types/progress-measurement";

export interface ForecastCalculationOptions {
  method: 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual';
  progressMeasurementMethod?: ProgressMeasurementMethod; // 進捗測定方式（プロジェクト設定から取得）
}

export interface ForecastCalculationResult {
  taskId: string;
  taskName: string;
  plannedHours: number;
  actualHours: number;
  progressRate: number;
  effectiveProgressRate: number; // 進捗測定方式適用後の進捗率
  forecastHours: number;
  completionStatus: string;
}

export class ForecastCalculationService {
  /**
   * タスクの見通し工数を計算
   * @param task タスクデータ
   * @param options 計算オプション（見通し算出方式、進捗測定方式）
   * @returns 見通し工数計算結果
   * @description
   * TaskProgressCalculatorを使用して進捗率を計算し、見通し工数を算出する。
   * 進捗測定方式は3つ：0/100法、50/50法、自己申告進捗率
   */
  static calculateTaskForecast(
    task: WbsTaskData,
    options: ForecastCalculationOptions = {
      method: 'realistic',
      progressMeasurementMethod: 'SELF_REPORTED'
    }
  ): ForecastCalculationResult {
    // 予定工数と実績工数を取得
    console.log('-------- calculateTaskForecast ----------',);
    console.log('task', task.name);
    console.log('task status', task.status);
    console.log('task progressRate', task.progressRate);
    const plannedHours = task.yoteiKosu || 0;
    const actualHours = task.jissekiKosu || 0;

    // TaskProgressCalculatorを使用して実効進捗率を計算
    const effectiveProgressRate = TaskProgressCalculator.calculateEffectiveProgress(
      task.status as TaskStatus,
      task.progressRate,
      options.progressMeasurementMethod || 'SELF_REPORTED'
    );
    console.log('effectiveProgressRate', effectiveProgressRate);

    // 見通し工数計算
    const forecastHours = this.calculateForecastHours(
      plannedHours,
      actualHours,
      effectiveProgressRate,
      options.method
    );

    console.log('-------- forecastHours ----------', forecastHours);
    console.log('-------- return ----------', {
      taskId: task.id,
      taskName: task.name,
      plannedHours,
      actualHours,
      progressRate: task.progressRate || 0,
      effectiveProgressRate,
      forecastHours,
      completionStatus: task.status,
    });
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
    options: ForecastCalculationOptions = {
      method: 'realistic',
      progressMeasurementMethod: 'SELF_REPORTED'
    }
  ): ForecastCalculationResult[] {
    return tasks.map(task => this.calculateTaskForecast(task, options));
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
   * 計算方法は保守的、現実的、楽観的、予定/実績優先の4つの方法がある
   * 保守的：実績ベースの推定（実績工数 / 進捗率 * 100）
   * 現実的：実績 + 残り予定の加重平均
   * 楽観的：実績 + 残り予定
   */
  private static calculateForecastHours(
    plannedHours: number,
    actualHours: number,
    progressRate: number,
    method: 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual'
  ): number {
    // 完了済みの場合は実績工数をそのまま返す
    if (progressRate >= 100) {
      console.log('actualHours because progressRate is 100', actualHours);
      return actualHours;
    }

    if (method === 'plannedOrActual') {
      if (actualHours <= 0) {
        console.log('plannedHours because task not started or no actuals', plannedHours);
        return plannedHours;
      }

      if (plannedHours <= 0) {
        console.log('actualHours because no planned hours maintained', actualHours);
        return actualHours;
      }

      const forecast = actualHours >= plannedHours ? actualHours : plannedHours;
      console.log('plannedOrActual forecast', { plannedHours, actualHours, forecast });
      return forecast;
    }

    // 進捗率が0の場合は予定工数をそのまま返す TODO: 実績が入っていても申告進捗が0%だったらprogressRateは0%になる
    if (progressRate <= 0) {
      console.log('plannedHours because progressRate is 0', plannedHours);
      return plannedHours;
    }

    // 残り工数を計算
    const remainingWork = (100 - progressRate) / 100;

    console.log('methos is ', method);
    switch (method) {
      case 'conservative':
        // 保守的：実績ベースの推定（実績工数 / 進捗率 * 100）
        return progressRate > 0 ? (actualHours / progressRate) * 100 : plannedHours;

      case 'realistic':
        // 現実的：実績 + 残り予定の加重平均
        const estimatedFromActual = progressRate > 0 ? (actualHours / progressRate) * 100 : plannedHours; // 実績ベースの見通し
        const remainingPlanned = plannedHours * remainingWork; // 進捗率に基づく残り予定工数

        // 進捗率に応じて実績ベースと予定ベースを加重平均
        // 進捗率が高いほど実績ベースの重みを大きくする
        const actualWeight = progressRate / 100; // 進捗率を実績の重みとする
        const plannedWeight = 1 - actualWeight; // 残りを予定の重みとする

        // 加重平均を計算して返す
        // 実績ベースの見通し * 実績の重み + (実績工数 + 残り予定工数) * 予定の重み
        console.log(`${estimatedFromActual} * ${actualWeight} + (${actualHours} + ${remainingPlanned}) * ${plannedWeight}`);
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