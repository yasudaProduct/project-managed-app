import { AllocationQuantizer } from '@/domains/wbs/allocation-quantizer';

describe('AllocationQuantizer', () => {
  describe('constructor', () => {
    it('デフォルトの単位（0.25）でインスタンスを作成できる', () => {
      const quantizer = new AllocationQuantizer();
      expect(quantizer.getUnit()).toBe(0.25);
    });

    it('カスタムの単位でインスタンスを作成できる', () => {
      const quantizer = new AllocationQuantizer(0.5);
      expect(quantizer.getUnit()).toBe(0.5);
    });

    it('単位が0以下の場合はエラーをthrowする', () => {
      expect(() => new AllocationQuantizer(0)).toThrow('単位は0より大きい値である必要があります');
      expect(() => new AllocationQuantizer(-0.25)).toThrow('単位は0より大きい値である必要があります');
    });
  });

  describe('quantize', () => {
    it('空のMapの場合はそのまま返す', () => {
      const quantizer = new AllocationQuantizer();
      const raw = new Map<string, number>();
      const result = quantizer.quantize(raw);
      expect(result.size).toBe(0);
    });

    it('0.25単位に量子化できる（単純な場合）', () => {
      const quantizer = new AllocationQuantizer(0.25);
      const raw = new Map<string, number>([
        ['2025/01', 1.0],
        ['2025/02', 2.0],
        ['2025/03', 3.0],
      ]);

      const result = quantizer.quantize(raw);

      expect(result.get('2025/01')).toBe(1.0);
      expect(result.get('2025/02')).toBe(2.0);
      expect(result.get('2025/03')).toBe(3.0);
    });

    it('0.25単位に量子化して合計を保持する（ハミルトン方式）', () => {
      const quantizer = new AllocationQuantizer(0.25);
      const raw = new Map<string, number>([
        ['2025/01', 1.1],  // floor: 1.0, frac: 0.4
        ['2025/02', 2.2],  // floor: 2.0, frac: 0.8
        ['2025/03', 3.3],  // floor: 3.25, frac: 0.2
      ]);

      const rawTotal = 1.1 + 2.2 + 3.3; // 6.6
      const expectedTotalUnits = Math.round(rawTotal / 0.25); // 26 units (6.5)

      const result = quantizer.quantize(raw);

      // 合計が保持されているか確認
      const resultTotal = Array.from(result.values()).reduce((a, b) => a + b, 0);
      expect(resultTotal).toBe(expectedTotalUnits * 0.25); // 6.5

      // フラクションが大きい順に配分されているか確認
      // 2025/02 が最も大きいフラクション (0.8) なので +1 unit
      expect(result.get('2025/02')).toBe(2.25);
    });

    it('小数部が同じ場合は年月昇順で安定化する', () => {
      const quantizer = new AllocationQuantizer(0.25);
      const raw = new Map<string, number>([
        ['2025/03', 1.1],  // frac: 0.4
        ['2025/01', 1.1],  // frac: 0.4 (同じ)
        ['2025/02', 1.1],  // frac: 0.4 (同じ)
      ]);

      const result = quantizer.quantize(raw);

      // 年月昇順で処理されるため、2025/01 が最初に +1 unit される
      expect(result.get('2025/01')).toBe(1.25);
      expect(result.get('2025/02')).toBe(1.0);
      expect(result.get('2025/03')).toBe(1.0);

      // 合計が保持されているか確認
      const resultTotal = Array.from(result.values()).reduce((a, b) => a + b, 0);
      expect(resultTotal).toBeCloseTo(3.25, 2);
    });

    it('複雑な量子化ケース: 多くの月にまたがる場合', () => {
      const quantizer = new AllocationQuantizer(0.25);
      const raw = new Map<string, number>([
        ['2025/01', 0.33],  // floor: 0.25, frac: 0.32
        ['2025/02', 0.33],  // floor: 0.25, frac: 0.32
        ['2025/03', 0.34],  // floor: 0.25, frac: 0.36
      ]);

      const result = quantizer.quantize(raw);

      // 合計が保持されているか確認
      const resultTotal = Array.from(result.values()).reduce((a, b) => a + b, 0);
      expect(resultTotal).toBe(1.0);

      // フラクションが最も大きい 2025/03 が +1 unit
      expect(result.get('2025/03')).toBe(0.5);
      expect(result.get('2025/01')).toBe(0.25);
      expect(result.get('2025/02')).toBe(0.25);
    });

    it('0.5単位に量子化できる', () => {
      const quantizer = new AllocationQuantizer(0.5);
      const raw = new Map<string, number>([
        ['2025/01', 1.3],  // floor: 1.0, frac: 0.6
        ['2025/02', 2.2],  // floor: 2.0, frac: 0.4
      ]);

      const result = quantizer.quantize(raw);

      // 合計が保持されているか確認
      const resultTotal = Array.from(result.values()).reduce((a, b) => a + b, 0);
      expect(resultTotal).toBe(3.5);

      // フラクションが大きい 2025/01 が +1 unit (0.5)
      expect(result.get('2025/01')).toBe(1.5);
      expect(result.get('2025/02')).toBe(2.0);
    });

    it('計算誤差に対応できる', () => {
      const quantizer = new AllocationQuantizer(0.25);
      // 浮動小数点演算の誤差を含むケース
      const raw = new Map<string, number>([
        ['2025/01', 0.1 + 0.2],  // 0.30000000000000004 になる可能性
        ['2025/02', 0.7],
      ]);

      const result = quantizer.quantize(raw);

      // エラーなく量子化できる
      expect(result.size).toBe(2);

      // 合計が保持されているか確認
      const resultTotal = Array.from(result.values()).reduce((a, b) => a + b, 0);
      expect(resultTotal).toBeCloseTo(1.0, 2);
    });

    it('既存の get-wbs-summary-handler のロジックと同じ結果になる', () => {
      // 既存実装の quantizeAllocatedHours と同じテストケース
      const quantizer = new AllocationQuantizer(0.25);
      const raw = new Map<string, number>([
        ['2025/01', 1.15],
        ['2025/02', 2.35],
        ['2025/03', 1.50],
      ]);

      const result = quantizer.quantize(raw);

      // 合計が保持されているか確認
      const resultTotal = Array.from(result.values()).reduce((a, b) => a + b, 0);
      expect(resultTotal).toBe(5.0);

      // 各月の量子化結果を確認
      expect(result.get('2025/01')).toBe(1.25); // floor 1.0 + 1 unit (frac 0.6)
      expect(result.get('2025/02')).toBe(2.25); // floor 2.25, frac 0.4
      expect(result.get('2025/03')).toBe(1.5);  // floor 1.5, frac 0.0
    });
  });
});
