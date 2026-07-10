/**
 * EVM予測計算方式
 * EVM指標のEAC/ETC/VACをどの方式で算出するかを定義
 */

/**
 * Prisma の EvmForecastMethod enum と値を一致させた独立 union 型。
 * Prisma enum との相互変換は Infrastructure 層でのみ行う。
 */
export type EvmForecastMethod = 'CPI_ONLY' | 'CPI_SPI' | 'PLANNED';

export const EVM_FORECAST_METHODS: EvmForecastMethod[] = ['CPI_ONLY', 'CPI_SPI', 'PLANNED'];

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
