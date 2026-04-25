import { QualityMetricsCalculator, MetricInput } from '@/domains/quality/services/quality-metrics-calculator';
import { QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';
import { QualityStatus } from '@/domains/quality/value-objects/quality-status';

describe('QualityMetricsCalculator', () => {
  const calc = new QualityMetricsCalculator();

  describe('calcMetric（汎用密度計算）', () => {
    it('分子を分母で割った値を返す', () => {
      expect(calc.calcMetric(10, 20)).toBeCloseTo(0.5);
    });

    it('scaleFactorを適用する', () => {
      expect(calc.calcMetric(5, 1000, 1000)).toBeCloseTo(5);
    });

    it('分母が0の場合はnullを返す', () => {
      expect(calc.calcMetric(10, 0)).toBeNull();
    });

    it('分子が0でも分母が正であれば0を返す', () => {
      expect(calc.calcMetric(0, 10)).toBe(0);
    });
  });

  describe('calcAllMetrics（6指標一括計算）', () => {
    const baseInput: MetricInput = {
      reviewFindingCount: 15,
      reviewEffort: 10,
      bugCount: 8,
      testCaseCount: 200,
      size: 50,
      sizeUnit: QualitySizeUnit.PAGE,
    };

    it('PAGE単位で6指標を計算する', () => {
      const result = calc.calcAllMetrics(baseInput);

      // レビュー指摘密度 = 15 / 50 = 0.3
      expect(result.reviewFindingDensity).toBeCloseTo(0.3);
      // レビュー工数密度 = 10 / 50 = 0.2
      expect(result.reviewEffortDensity).toBeCloseTo(0.2);
      // レビュー指摘効率 = 15 / 10 = 1.5
      expect(result.reviewEfficiency).toBeCloseTo(1.5);
      // バグ密度 = 8 / 50 = 0.16
      expect(result.bugDensity).toBeCloseTo(0.16);
      // テスト密度 = 200 / 50 = 4.0
      expect(result.testDensity).toBeCloseTo(4.0);
      // テスト効率 = 8 / 200 = 0.04
      expect(result.testEfficiency).toBeCloseTo(0.04);
    });

    it('LOC単位ではKLOC換算される', () => {
      const input: MetricInput = {
        reviewFindingCount: 15,
        reviewEffort: 10,
        bugCount: 8,
        testCaseCount: 200,
        size: 5000,
        sizeUnit: QualitySizeUnit.LOC,
      };
      const result = calc.calcAllMetrics(input);

      // レビュー指摘密度 = 15 / (5000/1000) = 15 / 5 = 3.0
      expect(result.reviewFindingDensity).toBeCloseTo(3.0);
      // レビュー工数密度 = 10 / 5 = 2.0
      expect(result.reviewEffortDensity).toBeCloseTo(2.0);
      // バグ密度 = 8 / 5 = 1.6
      expect(result.bugDensity).toBeCloseTo(1.6);
      // テスト密度 = 200 / 5 = 40
      expect(result.testDensity).toBeCloseTo(40);
    });

    it('FP単位でも計算できる', () => {
      const input: MetricInput = {
        reviewFindingCount: 10,
        reviewEffort: 5,
        bugCount: 3,
        testCaseCount: 100,
        size: 20,
        sizeUnit: QualitySizeUnit.FP,
      };
      const result = calc.calcAllMetrics(input);

      // レビュー指摘密度 = 10 / 20 = 0.5
      expect(result.reviewFindingDensity).toBeCloseTo(0.5);
    });

    it('規模が0の場合、規模依存の指標はnull', () => {
      const input: MetricInput = {
        reviewFindingCount: 15,
        reviewEffort: 10,
        bugCount: 8,
        testCaseCount: 200,
        size: 0,
        sizeUnit: QualitySizeUnit.PAGE,
      };
      const result = calc.calcAllMetrics(input);

      expect(result.reviewFindingDensity).toBeNull();
      expect(result.reviewEffortDensity).toBeNull();
      expect(result.bugDensity).toBeNull();
      expect(result.testDensity).toBeNull();
      // レビュー指摘効率とテスト効率は規模に依存しない
      expect(result.reviewEfficiency).toBeCloseTo(1.5);
      expect(result.testEfficiency).toBeCloseTo(0.04);
    });

    it('レビュー工数が0の場合、レビュー指摘効率はnull', () => {
      const input: MetricInput = {
        ...baseInput,
        reviewEffort: 0,
      };
      const result = calc.calcAllMetrics(input);

      expect(result.reviewEfficiency).toBeNull();
      // 他の指標は正常に計算される
      expect(result.reviewFindingDensity).toBeCloseTo(0.3);
    });

    it('テスト項目数が0の場合、テスト効率はnull', () => {
      const input: MetricInput = {
        ...baseInput,
        testCaseCount: 0,
      };
      const result = calc.calcAllMetrics(input);

      expect(result.testEfficiency).toBeNull();
      expect(result.testDensity).toBeCloseTo(0);
    });
  });

  describe('evaluateStatus', () => {
    it('閾値範囲内ならNORMAL', () => {
      expect(
        calc.evaluateStatus(5.0, { warnThreshold: 8, dangerThreshold: 12 })
      ).toBe(QualityStatus.NORMAL);
    });

    it('warnThresholdを超えたらWARNING', () => {
      expect(
        calc.evaluateStatus(9.0, { warnThreshold: 8, dangerThreshold: 12 })
      ).toBe(QualityStatus.WARNING);
    });

    it('dangerThresholdを超えたらDANGER', () => {
      expect(
        calc.evaluateStatus(13.0, { warnThreshold: 8, dangerThreshold: 12 })
      ).toBe(QualityStatus.DANGER);
    });

    it('値がnullの場合はnullを返す', () => {
      expect(
        calc.evaluateStatus(null, { warnThreshold: 8, dangerThreshold: 12 })
      ).toBeNull();
    });

    it('閾値がundefinedの場合はNORMALを返す', () => {
      expect(calc.evaluateStatus(5.0, undefined)).toBe(QualityStatus.NORMAL);
    });
  });
});
