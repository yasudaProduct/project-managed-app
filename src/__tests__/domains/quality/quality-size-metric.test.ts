import { QualitySizeMetric } from '@/domains/quality/quality-size-metric';
import { QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';

describe('QualitySizeMetric', () => {
  describe('create', () => {
    it('有効なパラメータで規模を作成できる', () => {
      const metric = QualitySizeMetric.create({
        targetId: 1,
        unit: QualitySizeUnit.PAGE,
        value: 15.5,
        measuredAt: new Date('2026-04-01'),
      });

      expect(metric.targetId).toBe(1);
      expect(metric.unit).toBe(QualitySizeUnit.PAGE);
      expect(metric.value).toBe(15.5);
      expect(metric.measuredAt).toEqual(new Date('2026-04-01'));
    });

    it('値が0以下の場合はエラー', () => {
      expect(() =>
        QualitySizeMetric.create({
          targetId: 1,
          unit: QualitySizeUnit.PAGE,
          value: 0,
          measuredAt: new Date(),
        })
      ).toThrow('規模の値は0より大きい必要があります');
    });

    it('負の値の場合もエラー', () => {
      expect(() =>
        QualitySizeMetric.create({
          targetId: 1,
          unit: QualitySizeUnit.PAGE,
          value: -1,
          measuredAt: new Date(),
        })
      ).toThrow('規模の値は0より大きい必要があります');
    });

    it('MAN_HOURは保存できない（都度集計）', () => {
      expect(() =>
        QualitySizeMetric.create({
          targetId: 1,
          unit: 'MAN_HOUR' as QualitySizeUnit,
          value: 10,
          measuredAt: new Date(),
        })
      ).toThrow('MAN_HOURは保存できません。実績工数は都度集計されます');
    });
  });
});
