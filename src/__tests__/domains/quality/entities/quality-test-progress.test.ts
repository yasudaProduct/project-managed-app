import { QualityTestProgress } from '@/domains/quality/entities/quality-test-progress';

describe('QualityTestProgress', () => {
  describe('create', () => {
    it('有効なパラメータで作成できる', () => {
      const progress = QualityTestProgress.create({
        targetId: 1,
        date: new Date('2026-04-01'),
        plannedTotal: 100,
        executedTotal: 50,
        passedTotal: 45,
        failedTotal: 5,
        blockedTotal: 0,
      });

      expect(progress.targetId).toBe(1);
      expect(progress.date).toEqual(new Date('2026-04-01'));
      expect(progress.plannedTotal).toBe(100);
      expect(progress.executedTotal).toBe(50);
      expect(progress.passedTotal).toBe(45);
      expect(progress.failedTotal).toBe(5);
      expect(progress.blockedTotal).toBe(0);
    });

    it('テスト消化残を計算できる', () => {
      const progress = QualityTestProgress.create({
        targetId: 1,
        date: new Date('2026-04-01'),
        plannedTotal: 100,
        executedTotal: 60,
        passedTotal: 55,
        failedTotal: 5,
        blockedTotal: 2,
      });

      expect(progress.remainingCount).toBe(40); // 100 - 60
    });

    it('負の値を許可しない', () => {
      expect(() =>
        QualityTestProgress.create({
          targetId: 1,
          date: new Date('2026-04-01'),
          plannedTotal: -1,
          executedTotal: 0,
          passedTotal: 0,
          failedTotal: 0,
          blockedTotal: 0,
        })
      ).toThrow('テスト進捗の値は0以上である必要があります');
    });

    it('消化累計がテスト項目総数を超える場合エラー', () => {
      expect(() =>
        QualityTestProgress.create({
          targetId: 1,
          date: new Date('2026-04-01'),
          plannedTotal: 100,
          executedTotal: 101,
          passedTotal: 101,
          failedTotal: 0,
          blockedTotal: 0,
        })
      ).toThrow('消化累計がテスト項目総数を超えています');
    });
  });

  describe('reconstruct', () => {
    it('IDを含めて復元できる', () => {
      const progress = QualityTestProgress.reconstruct({
        id: 5,
        targetId: 1,
        date: new Date('2026-04-01'),
        plannedTotal: 100,
        executedTotal: 50,
        passedTotal: 45,
        failedTotal: 5,
        blockedTotal: 0,
      });

      expect(progress.id).toBe(5);
      expect(progress.remainingCount).toBe(50);
    });
  });
});
