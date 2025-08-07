import { WbsProgressHistory, RecordType } from '../../../domains/wbs-progress-history/wbs-progress-history';

describe('WbsProgressHistory', () => {
  describe('constructor', () => {
    it('正常なプロパティで進捗履歴を作成できる', () => {
      const props = {
        wbsId: 1,
        recordedAt: new Date(),
        recordType: RecordType.AUTO,
        totalTaskCount: 10,
        completedCount: 3,
        inProgressCount: 4,
        notStartedCount: 3,
        completionRate: 30,
        plannedManHours: 100,
        actualManHours: 80,
        varianceManHours: -20,
      };

      const history = new WbsProgressHistory(props);

      expect(history.wbsId).toBe(1);
      expect(history.recordType).toBe(RecordType.AUTO);
      expect(history.totalTaskCount).toBe(10);
      expect(history.completedCount).toBe(3);
      expect(history.completionRate).toBe(30);
    });

    it('手動スナップショットの場合、スナップショット名が必須', () => {
      const props = {
        wbsId: 1,
        recordedAt: new Date(),
        recordType: RecordType.MANUAL_SNAPSHOT,
        totalTaskCount: 10,
        completedCount: 3,
        inProgressCount: 4,
        notStartedCount: 3,
        completionRate: 30,
        plannedManHours: 100,
        actualManHours: 80,
        varianceManHours: -20,
      };

      expect(() => new WbsProgressHistory(props)).toThrow('手動スナップショットの場合、スナップショット名は必須です');
    });

    it('タスク数の合計が一致しない場合はエラー', () => {
      const props = {
        wbsId: 1,
        recordedAt: new Date(),
        recordType: RecordType.AUTO,
        totalTaskCount: 10,
        completedCount: 3,
        inProgressCount: 4,
        notStartedCount: 2, // 合計が9になってしまう
        completionRate: 30,
        plannedManHours: 100,
        actualManHours: 80,
        varianceManHours: -20,
      };

      expect(() => new WbsProgressHistory(props)).toThrow('タスク数の合計が一致しません');
    });

    it('負の値は許可されない', () => {
      const props = {
        wbsId: 1,
        recordedAt: new Date(),
        recordType: RecordType.AUTO,
        totalTaskCount: 10,
        completedCount: -1, // 負の値
        inProgressCount: 4,
        notStartedCount: 7,
        completionRate: 30,
        plannedManHours: 100,
        actualManHours: 80,
        varianceManHours: -20,
      };

      expect(() => new WbsProgressHistory(props)).toThrow('完了タスク数は0以上である必要があります');
    });

    it('完了率が範囲外の場合はエラー', () => {
      const props = {
        wbsId: 1,
        recordedAt: new Date(),
        recordType: RecordType.AUTO,
        totalTaskCount: 10,
        completedCount: 3,
        inProgressCount: 4,
        notStartedCount: 3,
        completionRate: 150, // 100を超える
        plannedManHours: 100,
        actualManHours: 80,
        varianceManHours: -20,
      };

      expect(() => new WbsProgressHistory(props)).toThrow('完了率は0から100の範囲である必要があります');
    });
  });

  describe('ビジネスロジック', () => {
    let history: WbsProgressHistory;

    beforeEach(() => {
      history = new WbsProgressHistory({
        wbsId: 1,
        recordedAt: new Date(),
        recordType: RecordType.MANUAL_SNAPSHOT,
        snapshotName: 'テストスナップショット',
        totalTaskCount: 10,
        completedCount: 3,
        inProgressCount: 4,
        notStartedCount: 3,
        completionRate: 30,
        plannedManHours: 100,
        actualManHours: 120,
        varianceManHours: 20,
      });
    });

    it('手動スナップショットかどうかを判定できる', () => {
      expect(history.isManualSnapshot()).toBe(true);
      expect(history.isAutoRecord()).toBe(false);
    });

    it('差異の割合を計算できる', () => {
      expect(history.getVariancePercentage()).toBe(20); // (20/100) * 100
    });

    it('遅れているかどうかを判定できる', () => {
      expect(history.isDelayed()).toBe(true);
      expect(history.isAheadOfSchedule()).toBe(false);
    });
  });

  describe('静的ファクトリーメソッド', () => {
    it('自動記録を作成できる', () => {
      const history = WbsProgressHistory.createAutoRecord(
        1, 10, 3, 4, 3, 30, 100, 80, -20
      );

      expect(history.recordType).toBe(RecordType.AUTO);
      expect(history.wbsId).toBe(1);
      expect(history.totalTaskCount).toBe(10);
      expect(history.isAutoRecord()).toBe(true);
    });

    it('手動スナップショットを作成できる', () => {
      const history = WbsProgressHistory.createManualSnapshot(
        1, 'テストスナップショット', 10, 3, 4, 3, 30, 100, 80, -20
      );

      expect(history.recordType).toBe(RecordType.MANUAL_SNAPSHOT);
      expect(history.snapshotName).toBe('テストスナップショット');
      expect(history.isManualSnapshot()).toBe(true);
    });
  });
});