import { QualityReviewer } from '@/domains/quality/entities/quality-reviewer';

describe('QualityReviewer', () => {
  describe('create', () => {
    it('必須パラメータで作成できる', () => {
      const reviewer = QualityReviewer.create({
        targetId: 1,
        reviewerUserId: 'user-1',
        reviewTaskNo: 'T-001-R1',
      });

      expect(reviewer.targetId).toBe(1);
      expect(reviewer.reviewerUserId).toBe('user-1');
      expect(reviewer.reviewTaskNo).toBe('T-001-R1');
      expect(reviewer.reviewHours).toBeUndefined();
    });

    it('reviewHoursを設定できる', () => {
      const reviewer = QualityReviewer.create({
        targetId: 1,
        reviewerUserId: 'user-1',
        reviewTaskNo: 'T-001-R1',
        reviewHours: 2.5,
      });

      expect(reviewer.reviewHours).toBe(2.5);
    });

    it('reviewHoursが負の場合エラー', () => {
      expect(() =>
        QualityReviewer.create({
          targetId: 1,
          reviewerUserId: 'user-1',
          reviewTaskNo: 'T-001-R1',
          reviewHours: -1,
        })
      ).toThrow('reviewHoursは0以上である必要があります');
    });
  });

  describe('reconstruct', () => {
    it('IDを含めて復元できる', () => {
      const reviewer = QualityReviewer.reconstruct({
        id: 3,
        targetId: 1,
        reviewerUserId: 'user-1',
        reviewTaskNo: 'T-001-R1',
        reviewHours: 3.0,
      });

      expect(reviewer.id).toBe(3);
      expect(reviewer.reviewHours).toBe(3.0);
    });
  });
});
