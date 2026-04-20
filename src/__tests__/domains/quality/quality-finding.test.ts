import { QualityFinding } from '@/domains/quality/quality-finding';
import { QualitySeverity } from '@/domains/quality/value-objects/quality-enums';

describe('QualityFinding', () => {
  describe('create', () => {
    it('有効なパラメータで指摘を作成できる', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        severity: QualitySeverity.MAJOR,
        category: '論理誤り',
        description: '条件分岐の誤り',
        foundAt: new Date('2026-04-01'),
      });

      expect(finding.targetId).toBe(1);
      expect(finding.severity).toBe(QualitySeverity.MAJOR);
      expect(finding.category).toBe('論理誤り');
      expect(finding.foundAt).toEqual(new Date('2026-04-01'));
    });

    it('カテゴリと説明は省略可能', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        severity: QualitySeverity.MINOR,
        foundAt: new Date('2026-04-01'),
      });

      expect(finding.category).toBeUndefined();
      expect(finding.description).toBeUndefined();
    });

    it('targetIdは必須', () => {
      expect(() =>
        QualityFinding.create({ targetId: 0, severity: QualitySeverity.MINOR, foundAt: new Date() })
      ).toThrow('targetIdは必須です');
    });
  });

  describe('isMajor', () => {
    it('重大度がMAJORの場合trueを返す', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        severity: QualitySeverity.MAJOR,
        foundAt: new Date(),
      });
      expect(finding.isMajor()).toBe(true);
    });

    it('重大度がMAJOR以外の場合falseを返す', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        severity: QualitySeverity.MINOR,
        foundAt: new Date(),
      });
      expect(finding.isMajor()).toBe(false);
    });
  });
});
