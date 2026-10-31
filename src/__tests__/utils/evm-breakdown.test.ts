import { sortEvmBreakdownRows } from '@/utils/evm-breakdown';

/**
 * EVM内訳の影響度順ソート。
 * 比率（SPI/CPI）だけでは影響の大きさが分からないため、
 * SV/CV（絶対値の差異）で「悪い順」に並べられるようにする。
 */
describe('sortEvmBreakdownRows', () => {
  const rows = [
    { key: 'a', name: '設計', sv: -10, cv: 5 },
    { key: 'b', name: '実装', sv: -40, cv: -20 },
    { key: 'c', name: 'テスト', sv: 5, cv: -30 },
    { key: 'unlinked', name: '未紐付け・削除済み', sv: 0, cv: -50, isUnlinked: true },
  ];

  it('default は元の並び順を保つ', () => {
    expect(sortEvmBreakdownRows(rows, 'default').map((r) => r.key)).toEqual([
      'a',
      'b',
      'c',
      'unlinked',
    ]);
  });

  it('sv はSVの小さい順（遅れの大きい順）に並べる', () => {
    expect(sortEvmBreakdownRows(rows, 'sv').map((r) => r.key)).toEqual([
      'b',
      'a',
      'c',
      'unlinked',
    ]);
  });

  it('cv はCVの小さい順（超過の大きい順）に並べ、未紐付け行は常に末尾', () => {
    expect(sortEvmBreakdownRows(rows, 'cv').map((r) => r.key)).toEqual([
      'c',
      'b',
      'a',
      'unlinked',
    ]);
  });

  it('元の配列を変更しない', () => {
    const original = rows.map((r) => r.key);
    sortEvmBreakdownRows(rows, 'sv');
    expect(rows.map((r) => r.key)).toEqual(original);
  });
});
