import { QualityFinding } from '@/domains/quality/entities/quality-finding';
import { FindingSource } from '@/domains/quality/value-objects/quality-enums';

describe('QualityFinding', () => {
  describe('create', () => {
    it('必須パラメータで作成できる', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        source: FindingSource.REVIEW,
        foundAt: new Date('2026-04-01'),
      });

      expect(finding.targetId).toBe(1);
      expect(finding.source).toBe(FindingSource.REVIEW);
      expect(finding.foundAt).toEqual(new Date('2026-04-01'));
    });

    it('全オプションパラメータを設定できる', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        source: FindingSource.TEST,
        injectionPhase: '基本設計',
        phenomenonType: 'アベンド',
        causeType: '単純ミス',
        category: 'ロジック',
        description: '条件分岐の誤り',
        foundAt: new Date('2026-04-01'),
      });

      expect(finding.injectionPhase).toBe('基本設計');
      expect(finding.phenomenonType).toBe('アベンド');
      expect(finding.causeType).toBe('単純ミス');
      expect(finding.category).toBe('ロジック');
      expect(finding.description).toBe('条件分岐の誤り');
    });

    it('sourceのデフォルトはREVIEW', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        foundAt: new Date('2026-04-01'),
      });
      expect(finding.source).toBe(FindingSource.REVIEW);
    });

    it('targetIdは必須', () => {
      expect(() =>
        QualityFinding.create({ targetId: 0, foundAt: new Date() })
      ).toThrow('targetIdは必須です');
    });

    it('resolvedAtはundefinedで作成される', () => {
      const finding = QualityFinding.create({
        targetId: 1,
        foundAt: new Date('2026-04-01'),
      });
      expect(finding.resolvedAt).toBeUndefined();
    });
  });

  describe('reconstruct', () => {
    it('resolvedAtを含めて復元できる', () => {
      const finding = QualityFinding.reconstruct({
        id: 1,
        targetId: 1,
        source: FindingSource.TEST,
        injectionPhase: '詳細設計',
        phenomenonType: '誤出力',
        causeType: '仕様齟齬',
        category: 'データ',
        description: '出力フォーマットの誤り',
        foundAt: new Date('2026-04-01'),
        resolvedAt: new Date('2026-04-05'),
      });

      expect(finding.id).toBe(1);
      expect(finding.resolvedAt).toEqual(new Date('2026-04-05'));
      expect(finding.injectionPhase).toBe('詳細設計');
    });
  });
});
