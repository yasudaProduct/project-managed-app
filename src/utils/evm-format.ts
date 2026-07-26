import type { EvmCalculationMode } from '@/types/evm';

/**
 * EVM指標の表示フォーマットと、SPI/CPIのしきい値色分けを提供する共通ユーティリティ。
 *
 * カード・チャート・時系列・内訳・CSVで別々に実装されていたため、金額の丸め桁が
 * 食い違っていた（カード等は丸めなし、内訳とCSVはMath.round）。数字の不一致は
 * 信頼を損なうため、ここを唯一の表示フォーマット基準とする。
 */

/** SPI/CPIの色分けしきい値（0〜1の比率。プロジェクト設定のパーセント値/100） */
export type EvmThresholds = {
  healthy: number;
  warning: number;
};

/** プロジェクト設定の既定値（evmHealthyThresholdPct=90 / evmWarningThresholdPct=80）に対応 */
export const DEFAULT_EVM_THRESHOLDS: EvmThresholds = {
  healthy: 0.9,
  warning: 0.8,
};

/**
 * EVM値を画面表示用にフォーマットする。
 * 金額は円未満を四捨五入する（円未満の桁は意味を持たず、表示箇所ごとの桁ズレを生むため）。
 */
export function formatEvmValue(
  value: number,
  calculationMode: EvmCalculationMode
): string {
  if (calculationMode === 'cost') {
    return `¥${Math.round(value).toLocaleString()}`;
  }
  return `${value.toFixed(1)}h`;
}

/**
 * EVM値をCSV出力用にフォーマットする（単位記号・桁区切りなし）。
 * 丸め基準は画面表示（formatEvmValue）と一致させる。
 */
export function formatEvmCsvValue(
  value: number,
  calculationMode: EvmCalculationMode
): string {
  if (calculationMode === 'cost') {
    return String(Math.round(value));
  }
  return value.toFixed(1);
}

/** しきい値の段階を判定する（ヘルス判定 EvmMetrics.healthStatus と同じ境界） */
function resolveIndexLevel(
  value: number,
  thresholds: EvmThresholds
): 'healthy' | 'warning' | 'critical' {
  if (value >= thresholds.healthy) return 'healthy';
  if (value >= thresholds.warning) return 'warning';
  return 'critical';
}

/** SPI/CPIの文字色クラス（内訳表など）。nullはミュート表示 */
export function evmIndexTextColorClass(
  value: number | null,
  thresholds: EvmThresholds = DEFAULT_EVM_THRESHOLDS
): string {
  if (value === null) return 'text-muted-foreground';
  switch (resolveIndexLevel(value, thresholds)) {
    case 'healthy':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'critical':
      return 'text-red-600';
  }
}

/** SPI/CPIのバー色クラス（メトリクスカードのゲージ） */
export function evmIndexBarColorClass(
  value: number,
  thresholds: EvmThresholds = DEFAULT_EVM_THRESHOLDS
): string {
  switch (resolveIndexLevel(value, thresholds)) {
    case 'healthy':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'critical':
      return 'bg-red-500';
  }
}
