/**
 * EVM予測計算方式
 * EVM指標のEAC/ETC/VACをどの方式で算出するかを定義
 */

import type { EvmForecastMethod as PrismaEvmForecastMethod } from '@prisma/client';

export type EvmForecastMethod = PrismaEvmForecastMethod;

/**
 * EVM予測計算方式のラベル
 */
export const EVM_FORECAST_METHOD_LABELS: Record<EvmForecastMethod, string> = {
  CPI_ONLY: 'CPI法',
  CPI_SPI: 'CPI×SPI法',
  PLANNED: '計画法',
};

/**
 * EVM予測計算方式の説明
 */
export const EVM_FORECAST_METHOD_DESCRIPTIONS: Record<EvmForecastMethod, string> = {
  CPI_ONLY: 'EAC = AC + (BAC - EV) / CPI — 現在のコスト効率が今後も継続すると仮定',
  CPI_SPI: 'EAC = AC + (BAC - EV) / (CPI × SPI) — スケジュール遅延もコストに反映',
  PLANNED: 'EAC = AC + (BAC - EV) — 残りの作業は計画通りのコストで完了すると仮定',
};
