import {
  IpaMetricKey,
  IPA_METRIC_DEFINITIONS,
  getIpaMetricDefinition,
  getReviewMetrics,
  getTestMetrics,
  getSizeScaleFactor,
} from '@/domains/quality/value-objects/metric-definition';
import { QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';

describe('IPA MetricDefinition', () => {
  describe('IPA_METRIC_DEFINITIONS', () => {
    it('6つのIPA準拠指標が定義されている', () => {
      expect(Object.keys(IPA_METRIC_DEFINITIONS)).toHaveLength(6);
    });

    it.each([
      'reviewFindingDensity',
      'reviewEffortDensity',
      'reviewEfficiency',
      'bugDensity',
      'testDensity',
      'testEfficiency',
    ] as IpaMetricKey[])('%s が定義されている', (key) => {
      const def = IPA_METRIC_DEFINITIONS[key];
      expect(def).toBeDefined();
      expect(def.key).toBe(key);
      expect(def.label).toBeTruthy();
    });
  });

  describe('getIpaMetricDefinition', () => {
    it('存在するキーで定義を取得できる', () => {
      const def = getIpaMetricDefinition('bugDensity');
      expect(def.key).toBe('bugDensity');
      expect(def.label).toBe('バグ密度');
    });
  });

  describe('getReviewMetrics / getTestMetrics', () => {
    it('レビュー指標は3つ（指摘密度、工数密度、指摘効率）', () => {
      const metrics = getReviewMetrics();
      expect(metrics).toHaveLength(3);
      expect(metrics.map((m) => m.key)).toEqual([
        'reviewFindingDensity',
        'reviewEffortDensity',
        'reviewEfficiency',
      ]);
    });

    it('テスト指標は3つ（バグ密度、テスト密度、テスト効率）', () => {
      const metrics = getTestMetrics();
      expect(metrics).toHaveLength(3);
      expect(metrics.map((m) => m.key)).toEqual([
        'bugDensity',
        'testDensity',
        'testEfficiency',
      ]);
    });
  });

  describe('getSizeScaleFactor', () => {
    it('LOC選択時はKLOC換算（1000）', () => {
      expect(getSizeScaleFactor(QualitySizeUnit.LOC)).toBe(1000);
    });

    it('PAGE選択時は1', () => {
      expect(getSizeScaleFactor(QualitySizeUnit.PAGE)).toBe(1);
    });

    it('FP選択時は1', () => {
      expect(getSizeScaleFactor(QualitySizeUnit.FP)).toBe(1);
    });

    it('TEST_CASE選択時は1', () => {
      expect(getSizeScaleFactor(QualitySizeUnit.TEST_CASE)).toBe(1);
    });
  });

  describe('指標定義の計算式プロパティ', () => {
    it('レビュー指摘密度: 分子=レビュー指摘件数, 分母=規模', () => {
      const def = IPA_METRIC_DEFINITIONS.reviewFindingDensity;
      expect(def.numerator).toBe('reviewFindingCount');
      expect(def.denominator).toBe('size');
    });

    it('レビュー工数密度: 分子=レビュー工数, 分母=規模', () => {
      const def = IPA_METRIC_DEFINITIONS.reviewEffortDensity;
      expect(def.numerator).toBe('reviewEffort');
      expect(def.denominator).toBe('size');
    });

    it('レビュー指摘効率: 分子=レビュー指摘件数, 分母=レビュー工数', () => {
      const def = IPA_METRIC_DEFINITIONS.reviewEfficiency;
      expect(def.numerator).toBe('reviewFindingCount');
      expect(def.denominator).toBe('reviewEffort');
    });

    it('バグ密度: 分子=バグ数, 分母=規模', () => {
      const def = IPA_METRIC_DEFINITIONS.bugDensity;
      expect(def.numerator).toBe('bugCount');
      expect(def.denominator).toBe('size');
    });

    it('テスト密度: 分子=テスト項目数, 分母=規模', () => {
      const def = IPA_METRIC_DEFINITIONS.testDensity;
      expect(def.numerator).toBe('testCaseCount');
      expect(def.denominator).toBe('size');
    });

    it('テスト効率: 分子=バグ数, 分母=テスト項目数', () => {
      const def = IPA_METRIC_DEFINITIONS.testEfficiency;
      expect(def.numerator).toBe('bugCount');
      expect(def.denominator).toBe('testCaseCount');
    });
  });
});
