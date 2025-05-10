import { PeriodType } from "@/domains/task/value-object/period-type";

describe('PeriodType', () => {
  describe('constructor', () => {
    it('KIJUN型で初期化できること', () => {
      const periodType = new PeriodType({ type: 'KIJUN' });
      expect(periodType.type).toBe('KIJUN');
    });

    it('YOTEI型で初期化できること', () => {
      const periodType = new PeriodType({ type: 'YOTEI' });
      expect(periodType.type).toBe('YOTEI');
    });

    it('JISSEKI型で初期化できること', () => {
      const periodType = new PeriodType({ type: 'JISSEKI' });
      expect(periodType.type).toBe('JISSEKI');
    });
  });
});