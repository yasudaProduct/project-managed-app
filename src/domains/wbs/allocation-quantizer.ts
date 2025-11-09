/**
 * 工数の量子化を行うドメインサービス
 * ビジネスルール: 0.25単位で丸め、合計を保持する（ハミルトン方式）
 */
export class AllocationQuantizer {
  private readonly unit: number;

  constructor(unit: number = 0.25) {
    if (unit <= 0) {
      throw new Error('単位は0より大きい値である必要があります');
    }
    this.unit = unit;
  }

  /**
   * 按分結果を量子化
   * @param raw 元の按分結果
   * @returns 量子化後の按分結果
   *
   * @description
   * ハミルトン方式による量子化:
   * 1. 各月を指定単位で床取り
   * 2. 残りユニットを小数部の大きい順に配分
   * 3. 同値の場合は年月昇順で安定化
   * 4. 合計は元の按分結果の合計を保持
   */
  quantize(raw: Map<string, number>): Map<string, number> {
    if (raw.size === 0) return raw;

    // 合計を保持（ビジネスルール）
    const rawTotal = Array.from(raw.values()).reduce((a, b) => a + b, 0);
    const totalUnits = Math.round(rawTotal / this.unit);

    // 各月を床取り + 残りを小数部の大きい順に配分（ハミルトン方式）
    const entries = Array.from(raw.entries()).map(([month, hours]) => {
      const unitsRaw = hours / this.unit;
      const floorUnits = Math.floor(unitsRaw + 1e-9); // 計算誤差対策
      const frac = unitsRaw - floorUnits;
      return { month, hours, unitsRaw, floorUnits, frac };
    });

    const usedUnits = entries.reduce((sum, e) => sum + e.floorUnits, 0);
    let remaining = Math.max(0, totalUnits - usedUnits);

    // 小数部の大きい順、同値なら年月昇順
    entries.sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      return a.month.localeCompare(b.month);
    });

    // 残りユニットを配分
    for (let i = 0; i < entries.length && remaining > 0; i++) {
      entries[i].floorUnits += 1;
      remaining -= 1;
    }

    // 年月昇順で安定化
    entries.sort((a, b) => a.month.localeCompare(b.month));

    const result = new Map<string, number>();
    entries.forEach(e => {
      result.set(e.month, e.floorUnits * this.unit);
    });

    return result;
  }

  /**
   * 単位を取得
   */
  getUnit(): number {
    return this.unit;
  }
}
