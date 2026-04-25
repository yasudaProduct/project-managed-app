import { QualityThresholdConfig } from '@/domains/quality/entities/quality-threshold-config';

describe('QualityThresholdConfig', () => {
  describe('create', () => {
    it('必須パラメータで作成できる', () => {
      const config = QualityThresholdConfig.create({
        wbsId: 1,
        metricKey: 'bugDensity',
      });

      expect(config.wbsId).toBe(1);
      expect(config.metricKey).toBe('bugDensity');
      expect(config.phaseCode).toBeUndefined();
    });

    it('閾値を設定できる', () => {
      const config = QualityThresholdConfig.create({
        wbsId: 1,
        metricKey: 'bugDensity',
        phaseCode: 'UT',
        upperLimit: 10.0,
        lowerLimit: 0.5,
        warnThreshold: 8.0,
        dangerThreshold: 12.0,
        referenceValue: 5.0,
        note: 'IPA基準値',
      });

      expect(config.phaseCode).toBe('UT');
      expect(config.upperLimit).toBe(10.0);
      expect(config.lowerLimit).toBe(0.5);
      expect(config.warnThreshold).toBe(8.0);
      expect(config.dangerThreshold).toBe(12.0);
      expect(config.referenceValue).toBe(5.0);
      expect(config.note).toBe('IPA基準値');
    });

    it('wbsIdは必須', () => {
      expect(() =>
        QualityThresholdConfig.create({ wbsId: 0, metricKey: 'bugDensity' })
      ).toThrow('wbsIdは必須です');
    });

    it('metricKeyは必須', () => {
      expect(() =>
        QualityThresholdConfig.create({ wbsId: 1, metricKey: '' })
      ).toThrow('metricKeyは必須です');
    });
  });

  describe('reconstruct', () => {
    it('IDを含めて復元できる', () => {
      const config = QualityThresholdConfig.reconstruct({
        id: 10,
        wbsId: 1,
        metricKey: 'reviewFindingDensity',
        phaseCode: 'DD',
        upperLimit: 5.0,
        lowerLimit: 1.0,
      });

      expect(config.id).toBe(10);
      expect(config.metricKey).toBe('reviewFindingDensity');
    });
  });

  describe('isInZone', () => {
    it('値が上限と下限の範囲内ならtrueを返す', () => {
      const config = QualityThresholdConfig.create({
        wbsId: 1,
        metricKey: 'bugDensity',
        upperLimit: 10.0,
        lowerLimit: 1.0,
      });

      expect(config.isInZone(5.0)).toBe(true);
    });

    it('値が上限を超えるとfalseを返す', () => {
      const config = QualityThresholdConfig.create({
        wbsId: 1,
        metricKey: 'bugDensity',
        upperLimit: 10.0,
        lowerLimit: 1.0,
      });

      expect(config.isInZone(11.0)).toBe(false);
    });

    it('値が下限を下回るとfalseを返す', () => {
      const config = QualityThresholdConfig.create({
        wbsId: 1,
        metricKey: 'bugDensity',
        upperLimit: 10.0,
        lowerLimit: 1.0,
      });

      expect(config.isInZone(0.5)).toBe(false);
    });

    it('上限・下限が未設定の場合は常にtrue', () => {
      const config = QualityThresholdConfig.create({
        wbsId: 1,
        metricKey: 'bugDensity',
      });

      expect(config.isInZone(100)).toBe(true);
    });
  });
});
