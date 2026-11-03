/**
 * 悪化トレンドの検知（ドメインサービス）。
 * 進捗確認サイクルの単位で、指標（SPI / CPI など、大きいほど良いもの）が N 期連続で下がったかを見る。
 * 「悪い」より「悪化し続けている」方が手を打つ判断に直結するため（要件整理 §4 原則2）。
 */

/** 何期連続の悪化で知らせるか */
export const TREND_DETERIORATION_PERIODS = 3;

/** これ未満の低下は計算誤差とみなし、悪化に数えない */
const DECLINE_EPSILON = 0.001;

/**
 * 値（古い順）の直近 periods 期がすべて前の期より下がっていれば true。
 * periods 期の悪化には periods + 1 点が必要で、未定義（null）を含む場合は判定しない（false）。
 */
export function detectConsecutiveDecline(
  values: ReadonlyArray<number | null>,
  periods: number
): boolean {
  if (values.length < periods + 1) return false;
  const recent = values.slice(-(periods + 1));
  for (let i = 1; i < recent.length; i++) {
    const previous = recent[i - 1];
    const current = recent[i];
    if (previous === null || current === null) return false;
    if (!(current < previous - DECLINE_EPSILON)) return false;
  }
  return true;
}
