/**
 * 見通し工数算出方式
 * タスクの見通し工数をどのように計算するかを定義
 */

import type { ForecastCalculationMethod as PrismaForecastCalculationMethod } from '@prisma/client';

// Prismaのenumをそのまま使用
export type ForecastCalculationMethod = PrismaForecastCalculationMethod;

/**
 * 見通し工数算出方式のラベル
 */
export const FORECAST_CALCULATION_METHOD_LABELS: Record<ForecastCalculationMethod, string> = {
  CONSERVATIVE: '保守的',
  REALISTIC: '現実的',
  OPTIMISTIC: '楽観的',
  PLANNED_OR_ACTUAL: '予定/実績優先',
};

/**
 * 見通し工数算出方式の説明
 */
export const FORECAST_CALCULATION_METHOD_DESCRIPTIONS: Record<ForecastCalculationMethod, string> = {
  CONSERVATIVE: '実績ベースの推定（実績工数 / 進捗率 * 100）。実績が悪い場合に最も保守的な見通しを提示します。',
  REALISTIC: '実績 + 残り予定の加重平均。進捗率に応じて実績ベースと予定ベースをバランスよく組み合わせます。',
  OPTIMISTIC: '実績 + 残り予定。予定通りに進むことを前提とした楽観的な見通しを提示します。',
  PLANNED_OR_ACTUAL: '予定 > 実績なら予定、予定 < 実績なら実績。進捗率に依存せず、予定と実績の大きい方を採用します。',
};

/**
 * ForecastCalculationMethodからForecastCalculationOptionsのmethodに変換
 */
export function toForecastMethodOption(
  method: ForecastCalculationMethod
): 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual' {
  switch (method) {
    case 'CONSERVATIVE':
      return 'conservative';
    case 'REALISTIC':
      return 'realistic';
    case 'OPTIMISTIC':
      return 'optimistic';
    case 'PLANNED_OR_ACTUAL':
      return 'plannedOrActual';
    default:
      return 'realistic';
  }
}

