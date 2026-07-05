'use server';

import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { IForecastApplicationService } from '@/applications/forecast/forecast-application-service';
import type {
  ForecastCalculationOptions,
  ForecastCalculationResult,
} from '@/types/forecast-calculation';

const forecastApplicationService = container.get<IForecastApplicationService>(
  SYMBOL.IForecastApplicationService
);

/**
 * WBSタスクの見通し工数を計算
 */
export async function calculateTasksForecast(
  projectId: string,
  wbsId: number,
  options: ForecastCalculationOptions = { method: 'realistic' }
): Promise<ForecastCalculationResult[]> {
  try {
    void projectId;
    return await forecastApplicationService.calculateTasksForecast(wbsId, options);
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
    void projectId;
    return await forecastApplicationService.calculateSingleTaskForecast(
      wbsId,
      taskId,
      options
    );
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
  return forecastApplicationService.getForecastMethods();
}
