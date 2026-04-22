import { getMetricDefinitions, shouldShowReviewCompletionRate } from '@/domains/quality/value-objects/metric-definition';
import { QualitySizeUnit, FindingSource } from '@/domains/quality/value-objects/quality-enums';

describe('MetricDefinition', () => {
  describe('getMetricDefinitions', () => {
    it('PAGE → レビュー密度・指摘密度の2定義', () => {
      const defs = getMetricDefinitions(QualitySizeUnit.PAGE);
      expect(defs).toHaveLength(2);
      expect(defs[0].key).toBe('reviewDensity');
      expect(defs[0].label).toBe('レビュー密度');
      expect(defs[0].unitSuffix).toBe('/page');
      expect(defs[0].numerator.source).toBe('reviewManHours');
      expect(defs[0].denominator.source).toBe('selectedSize');
      expect(defs[1].key).toBe('defectDensity');
      expect(defs[1].label).toBe('指摘密度');
      expect(defs[1].numerator.findingSource).toBe(FindingSource.REVIEW);
    });

    it('LINES_OF_CODE → レビュー密度・指摘密度の2定義（KLOC単位）', () => {
      const defs = getMetricDefinitions(QualitySizeUnit.LINES_OF_CODE);
      expect(defs).toHaveLength(2);
      expect(defs[0].key).toBe('reviewDensity');
      expect(defs[0].unitSuffix).toBe('/KLOC');
      expect(defs[0].scaleFactor).toBe(1000);
      expect(defs[1].key).toBe('defectDensity');
      expect(defs[1].scaleFactor).toBe(1000);
    });

    it('TEST_CASE → バグ密度・テスト密度の2定義', () => {
      const defs = getMetricDefinitions(QualitySizeUnit.TEST_CASE);
      expect(defs).toHaveLength(2);
      expect(defs[0].key).toBe('bugDensity');
      expect(defs[0].label).toBe('バグ密度');
      expect(defs[0].unitSuffix).toBe('/TC');
      expect(defs[0].numerator.source).toBe('findingCount');
      expect(defs[0].numerator.findingSource).toBe(FindingSource.TEST);
      expect(defs[1].key).toBe('testDensity');
      expect(defs[1].label).toBe('テスト密度');
      expect(defs[1].unitSuffix).toBe('/KLOC');
      expect(defs[1].numerator.source).toBe('sizeMetric');
      expect(defs[1].numerator.sizeUnit).toBe(QualitySizeUnit.TEST_CASE);
      expect(defs[1].denominator.source).toBe('sizeMetric');
      expect(defs[1].denominator.sizeUnit).toBe(QualitySizeUnit.LINES_OF_CODE);
      expect(defs[1].higherIsBetter).toBe(true);
    });

    it('MAN_HOUR → レビュー密度・指摘密度の2定義', () => {
      const defs = getMetricDefinitions('MAN_HOUR');
      expect(defs).toHaveLength(2);
      expect(defs[0].key).toBe('reviewDensity');
      expect(defs[0].unitSuffix).toBe('/h');
      expect(defs[1].key).toBe('defectDensity');
      expect(defs[1].unitSuffix).toBe('/h');
    });
  });

  describe('shouldShowReviewCompletionRate', () => {
    it('TEST_CASE以外ではtrueを返す', () => {
      expect(shouldShowReviewCompletionRate(QualitySizeUnit.PAGE)).toBe(true);
      expect(shouldShowReviewCompletionRate(QualitySizeUnit.LINES_OF_CODE)).toBe(true);
      expect(shouldShowReviewCompletionRate('MAN_HOUR')).toBe(true);
    });

    it('TEST_CASEではfalseを返す', () => {
      expect(shouldShowReviewCompletionRate(QualitySizeUnit.TEST_CASE)).toBe(false);
    });
  });
});
