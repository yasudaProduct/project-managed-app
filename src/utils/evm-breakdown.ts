/**
 * EVM内訳（フェーズ別・担当者別）の並び替え。
 * 比率（SPI/CPI）だけでは影響の大きさが分からないため、SV/CV（絶対値の差異）で
 * 「悪い順」に並べる。未紐付け・削除済み行は比較対象外として常に末尾に置く。
 */

export const EVM_BREAKDOWN_SORT_KEYS = ['default', 'sv', 'cv'] as const;
export type EvmBreakdownSortKey = (typeof EVM_BREAKDOWN_SORT_KEYS)[number];

export const EVM_BREAKDOWN_SORT_LABELS: Record<EvmBreakdownSortKey, string> = {
  default: '既定の順',
  sv: '遅れの大きい順（SV）',
  cv: '超過の大きい順（CV）',
};

type SortableBreakdownRow = {
  sv: number;
  cv: number;
  isUnlinked?: boolean;
};

export function sortEvmBreakdownRows<T extends SortableBreakdownRow>(
  rows: ReadonlyArray<T>,
  sortKey: EvmBreakdownSortKey
): T[] {
  const linked = rows.filter((row) => !row.isUnlinked);
  const unlinked = rows.filter((row) => row.isUnlinked);
  if (sortKey !== 'default') {
    linked.sort((a, b) => a[sortKey] - b[sortKey]);
  }
  return [...linked, ...unlinked];
}
