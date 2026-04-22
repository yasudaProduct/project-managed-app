import { QualityFinding } from '@/domains/quality/quality-finding';
import { FindingSource } from '@/domains/quality/value-objects/quality-enums';

describe('QualityFinding', () => {
  describe('create', () => {
    it('有効なパラメータで指摘を作成できる', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        category: '論理誤り',
        description: '条件分岐の誤り',
        foundAt: new Date('2026-04-01'),
      });

      expect(finding.targetId).toBe(1);
      expect(finding.category).toBe('論理誤り');
      expect(finding.foundAt).toEqual(new Date('2026-04-01'));
    });

    it('カテゴリと説明は省略可能', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        foundAt: new Date('2026-04-01'),
      });

      expect(finding.category).toBeUndefined();
      expect(finding.description).toBeUndefined();
    });

    it('targetIdは必須', () => {
      expect(() =>
        QualityFinding.create({ targetId: 0, foundAt: new Date() })
      ).toThrow('targetIdは必須です');
    });

    it('sourceを省略した場合デフォルトでREVIEWになる', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        foundAt: new Date('2026-04-01'),
      });
      expect(finding.source).toBe(FindingSource.REVIEW);
    });

    it('sourceにTESTを指定できる', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        source: FindingSource.TEST,
        foundAt: new Date('2026-04-01'),
      });
      expect(finding.source).toBe(FindingSource.TEST);
    });
  });

  describe('reconstruct', () => {
    it('sourceを省略した場合デフォルトでREVIEWになる', () => {
      const finding = QualityFinding.reconstruct({
        id: 1,
        targetId: 1,
        foundAt: new Date(),
      });
      expect(finding.source).toBe(FindingSource.REVIEW);
    });

    it('sourceにTESTを指定できる', () => {
      const finding = QualityFinding.reconstruct({
        id: 1,
        targetId: 1,
        source: FindingSource.TEST,
        foundAt: new Date(),
      });
      expect(finding.source).toBe(FindingSource.TEST);
    });
  });
});
