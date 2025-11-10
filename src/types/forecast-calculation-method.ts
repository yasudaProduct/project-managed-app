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
  CONSERVATIVE: '【実績工数 / 進捗率】',
  REALISTIC: '【実績 * 進捗率 + (実績 + 進捗率に基づく残予定) * (1-進捗率)】',
  OPTIMISTIC: '【実績 + 予定 * (1-進捗率)】',
  PLANNED_OR_ACTUAL: '【予定 / 実績優先】',
};

/**
 * 見通し工数算出方式の説明
 */
export const FORECAST_CALCULATION_METHOD_DESCRIPTIONS: Record<ForecastCalculationMethod, string> = {
  CONSERVATIVE: '投入工数に比例して進んでいるとした場合の見通し(進捗率=実績工数/総工数⇒総工数=実績工数/進捗率)',
  REALISTIC: '実績ベースの見通しと予定ベースの見通しを進捗率に応じて加重平均した見通し',
  OPTIMISTIC: '実績 + 残り予定。予定通りに進むことを前提とした見通し',
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

