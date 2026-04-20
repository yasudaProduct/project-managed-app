import { QualityReviewTarget } from '@/domains/quality/quality-review-target';
import { QualityDocumentType, QualityReviewType } from '@/domains/quality/value-objects/quality-enums';

describe('QualityReviewTarget', () => {
  describe('create', () => {
    it('有効なパラメータで評価対象を作成できる', () => {
      const target = QualityReviewTarget.create({
        wbsId: 1,
        taskNo: 'T-001',
        name: '基本設計書',
        documentType: QualityDocumentType.DESIGN,
        reviewType: QualityReviewType.FORMAL,
      });

      expect(target.wbsId).toBe(1);
      expect(target.taskNo).toBe('T-001');
      expect(target.name).toBe('基本設計書');
      expect(target.documentType).toBe(QualityDocumentType.DESIGN);
      expect(target.reviewType).toBe(QualityReviewType.FORMAL);
      expect(target.isActive).toBe(true);
    });

    it('デフォルト値が設定される', () => {
      const target = QualityReviewTarget.create({
        wbsId: 1,
        taskNo: 'T-001',
        name: 'テスト',
      });

      expect(target.documentType).toBe(QualityDocumentType.OTHER);
      expect(target.reviewType).toBe(QualityReviewType.PEER);
      expect(target.isActive).toBe(true);
    });

    it('wbsIdが必須', () => {
      expect(() =>
        QualityReviewTarget.create({ wbsId: 0, taskNo: 'T-001', name: 'テスト' })
      ).toThrow('wbsIdは必須です');
    });

    it('taskNoが必須', () => {
      expect(() =>
        QualityReviewTarget.create({ wbsId: 1, taskNo: '', name: 'テスト' })
      ).toThrow('taskNoは必須です');
    });

    it('nameが必須', () => {
      expect(() =>
        QualityReviewTarget.create({ wbsId: 1, taskNo: 'T-001', name: '' })
      ).toThrow('nameは必須です');
    });
  });

  describe('deactivate', () => {
    it('isActiveをfalseにできる', () => {
      const target = QualityReviewTarget.create({
        wbsId: 1,
        taskNo: 'T-001',
        name: 'テスト',
      });

      target.deactivate();
      expect(target.isActive).toBe(false);
    });
  });

  describe('reconstruct', () => {
    it('既存データから再構成できる', () => {
      const target = QualityReviewTarget.reconstruct({
        id: 10,
        wbsId: 1,
        taskNo: 'T-001',
        name: '詳細設計書',
        documentType: QualityDocumentType.DESIGN,
        reviewType: QualityReviewType.INSPECTION,
        isActive: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-10T00:00:00Z'),
      });

      expect(target.id).toBe(10);
      expect(target.isActive).toBe(false);
      expect(target.reviewType).toBe(QualityReviewType.INSPECTION);
    });
  });
});
