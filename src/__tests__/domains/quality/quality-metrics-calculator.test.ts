import { QualityMetricsCalculator } from '@/domains/quality/quality-metrics-calculator';
import { QualityStatus } from '@/domains/quality/value-objects/quality-status';
import { QualityThreshold } from '@/domains/quality/value-objects/quality-threshold';

describe('QualityMetricsCalculator', () => {
  const calc = new QualityMetricsCalculator();

  describe('calcDensity', () => {
    it('分子を分母で割った値を返す', () => {
      expect(calc.calcDensity(10, 20)).toBeCloseTo(0.5);
    });

    it('scaleFactorを適用する', () => {
      expect(calc.calcDensity(5, 1000, 1000)).toBeCloseTo(5);
    });

    it('分母が0の場合はnullを返す', () => {
      expect(calc.calcDensity(10, 0)).toBeNull();
    });

    it('分子が0でも分母が正であれば0を返す', () => {
      expect(calc.calcDensity(0, 10)).toBe(0);
    });
  });

  describe('calcReviewDensity', () => {
    it('規模が正の場合、レビュー工数を規模で割った値を返す', () => {
      expect(calc.calcReviewDensity(10, 20)).toBeCloseTo(0.5);
    });

    it('規模が0の場合はnullを返す', () => {
      expect(calc.calcReviewDensity(10, 0)).toBeNull();
    });

    it('レビュー工数が0でも規模が正であれば0を返す', () => {
      expect(calc.calcReviewDensity(0, 10)).toBe(0);
    });
  });

  describe('calcDefectDensity', () => {
    it('指摘件数を規模で割った値を返す', () => {
      expect(calc.calcDefectDensity(5, 10)).toBeCloseTo(0.5);
    });

    it('規模が0の場合はnullを返す', () => {
      expect(calc.calcDefectDensity(5, 0)).toBeNull();
    });

    it('指摘が0件でも規模が正であれば0を返す', () => {
      expect(calc.calcDefectDensity(0, 10)).toBe(0);
    });
  });

  describe('calcReviewCompletionRate', () => {
    it('レビュー完了対象数を総対象数で割った割合を返す', () => {
      expect(calc.calcReviewCompletionRate(8, 10)).toBeCloseTo(0.8);
    });

    it('総対象数が0の場合はnullを返す', () => {
      expect(calc.calcReviewCompletionRate(0, 0)).toBeNull();
    });

    it('全て完了の場合は1を返す', () => {
      expect(calc.calcReviewCompletionRate(5, 5)).toBe(1);
    });
  });

  describe('evaluateStatus', () => {
    it('値が正常範囲内ならNORMALを返す', () => {
      const threshold: QualityThreshold = { warnThreshold: 1.0, dangerThreshold: 3.0, higherIsBetter: false };
      expect(calc.evaluateStatus(0.5, threshold)).toBe(QualityStatus.NORMAL);
    });

    it('値が警戒ラインを下回る場合WARNINGを返す（higherIsBetter=true）', () => {
      const threshold: QualityThreshold = { warnThreshold: 0.5, dangerThreshold: 0.2, higherIsBetter: true };
      expect(calc.evaluateStatus(0.4, threshold)).toBe(QualityStatus.WARNING);
    });

    it('値が危険ラインを超える場合DANGERを返す（higherIsBetter=false）', () => {
      const threshold: QualityThreshold = { warnThreshold: 1.0, dangerThreshold: 3.0, higherIsBetter: false };
      expect(calc.evaluateStatus(4.0, threshold)).toBe(QualityStatus.DANGER);
    });

    it('値がnullの場合はnullを返す', () => {
      const threshold: QualityThreshold = { warnThreshold: 0.3, dangerThreshold: 0.1, higherIsBetter: false };
      expect(calc.evaluateStatus(null, threshold)).toBeNull();
    });

    it('閾値がnullの場合はNORMALを返す', () => {
      expect(calc.evaluateStatus(0.5, null)).toBe(QualityStatus.NORMAL);
    });
  });
});
