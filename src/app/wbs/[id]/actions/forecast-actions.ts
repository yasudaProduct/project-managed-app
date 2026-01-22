'use server';

import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IWbsQueryRepository } from '@/applications/wbs/query/wbs-query-repository';
import {
  ForecastCalculationService,
  ForecastCalculationOptions,
  ForecastCalculationResult
} from '@/domains/forecast/forecast-calculation.service';

/**
 * WBSタスクの見通し工数を計算
 */
export async function calculateTasksForecast(
  projectId: string,
  wbsId: number,
  options: ForecastCalculationOptions = { method: 'realistic' }
): Promise<ForecastCalculationResult[]> {
  try {
    const wbsQueryRepository = container.get<IWbsQueryRepository>(SYMBOL.IWbsQueryRepository);

    // WBSタスクデータを取得
    const tasks = await wbsQueryRepository.getWbsTasks(wbsId);

    // 見通し工数を計算
    const forecastResults = ForecastCalculationService.calculateMultipleTasksForecast(
      tasks,
      options
    );

    return forecastResults;
  } catch (error) {
    console.error('見通し工数計算エラー:', error);
    throw new Error(
      error instanceof Error
        ? `見通し工数の計算に失敗しました: ${error.message}`
        : '見通し工数の計算に失敗しました'
    );
  }
}

/**
 * 単一タスクの見通し工数を計算
 */
export async function calculateSingleTaskForecast(
  projectId: string,
  wbsId: number,
  taskId: string,
  options: ForecastCalculationOptions = { method: 'realistic' }
): Promise<ForecastCalculationResult | null> {
  try {
    const wbsQueryRepository = container.get<IWbsQueryRepository>(SYMBOL.IWbsQueryRepository);

    // WBSタスクデータを取得
    const tasks = await wbsQueryRepository.getWbsTasks(wbsId);
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      return null;
    }

    // 見通し工数を計算
    const forecastResult = ForecastCalculationService.calculateTaskForecast(task, options);

    return forecastResult;
  } catch (error) {
    console.error('単一タスク見通し工数計算エラー:', error);
    throw new Error(
      error instanceof Error
        ? `見通し工数の計算に失敗しました: ${error.message}`
        : '見通し工数の計算に失敗しました'
    );
  }
}

/**
 * 見通し工数計算メソッドの一覧を取得
 */
export async function getForecastMethods() {
  return [
    { value: 'conservative', label: '保守的', description: '実績ベースの推定（高めの見積もり）' },
    { value: 'realistic', label: '現実的', description: '実績と予定の加重平均' },
    { value: 'optimistic', label: '楽観的', description: '実績 + 残り予定' },
  ] as const;
}