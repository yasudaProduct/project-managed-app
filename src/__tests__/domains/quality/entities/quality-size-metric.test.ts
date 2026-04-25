import { QualitySizeMetric } from '@/domains/quality/entities/quality-size-metric';
import { QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';

describe('QualitySizeMetric', () => {
  describe('create', () => {
    it('有効なパラメータで作成できる', () => {
      const metric = QualitySizeMetric.create({
        targetId: 1,
        unit: QualitySizeUnit.PAGE,
        value: 50,
        measuredAt: new Date('2026-04-01'),
      });

      expect(metric.targetId).toBe(1);
      expect(metric.unit).toBe(QualitySizeUnit.PAGE);
      expect(metric.value).toBe(50);
    });

    it('FP単位で作成できる', () => {
      const metric = QualitySizeMetric.create({
        targetId: 1,
        unit: QualitySizeUnit.FP,
        value: 100,
        measuredAt: new Date('2026-04-01'),
      });

      expect(metric.unit).toBe(QualitySizeUnit.FP);
    });

    it('LOC単位で作成できる', () => {
      const metric = QualitySizeMetric.create({
        targetId: 1,
        unit: QualitySizeUnit.LOC,
        value: 5000,
        measuredAt: new Date('2026-04-01'),
      });

      expect(metric.unit).toBe(QualitySizeUnit.LOC);
    });

    it('noteを設定できる', () => {
      const metric = QualitySizeMetric.create({
        targetId: 1,
        unit: QualitySizeUnit.PAGE,
        value: 50,
        measuredAt: new Date('2026-04-01'),
        note: '初回計測',
      });

      expect(metric.note).toBe('初回計測');
    });

    it('値が0以下の場合エラー', () => {
      expect(() =>
        QualitySizeMetric.create({
          targetId: 1,
          unit: QualitySizeUnit.PAGE,
          value: 0,
          measuredAt: new Date(),
        })
      ).toThrow('規模の値は0より大きい必要があります');
    });
  });

  describe('reconstruct', () => {
    it('IDを含めて復元できる', () => {
      const metric = QualitySizeMetric.reconstruct({
        id: 5,
        targetId: 1,
        unit: QualitySizeUnit.FP,
        value: 200,
        measuredAt: new Date('2026-04-01'),
        note: 'テスト',
      });

      expect(metric.id).toBe(5);
      expect(metric.unit).toBe(QualitySizeUnit.FP);
    });
  });
});
