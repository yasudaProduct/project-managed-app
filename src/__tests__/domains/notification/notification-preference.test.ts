import { NotificationPreference } from '@/domains/notification/notification-preference';

describe('NotificationPreference', () => {
  describe('createDefault', () => {
    it('デフォルト設定でプリファレンスを作成する', () => {
      const pref = NotificationPreference.createDefault('user-1');

      expect(pref.userId).toBe('user-1');
      expect(pref.enablePush).toBe(true);
      expect(pref.enableInApp).toBe(true);
      expect(pref.enableEmail).toBe(false);
      expect(pref.taskDeadline).toEqual({ days: [3, 1, 0] });
      expect(pref.manhourThreshold).toEqual({ percentages: [80, 100, 120] });
      expect(pref.scheduleDelay).toBe(true);
      expect(pref.taskAssignment).toBe(true);
      expect(pref.projectStatusChange).toBe(true);
    });
  });

  describe('create', () => {
    it('カスタム設定でプリファレンスを作成する', () => {
      const pref = NotificationPreference.create({
        userId: 'user-1',
        enablePush: false,
        enableEmail: true,
        taskDeadline: { days: [7, 3, 1] },
      });

      expect(pref.enablePush).toBe(false);
      expect(pref.enableEmail).toBe(true);
      expect(pref.taskDeadline).toEqual({ days: [7, 3, 1] });
      // デフォルト値はそのまま
      expect(pref.enableInApp).toBe(true);
    });
  });

  describe('createFromDb', () => {
    it('DB値からプリファレンスを再構築する', () => {
      const now = new Date();
      const pref = NotificationPreference.createFromDb({
        id: 1,
        userId: 'user-1',
        enablePush: true,
        enableInApp: false,
        enableEmail: true,
        taskDeadline: { days: [5, 2] },
        manhourThreshold: { percentages: [90, 110] },
        scheduleDelay: false,
        taskAssignment: true,
        projectStatusChange: false,
        createdAt: now,
        updatedAt: now,
      });

      expect(pref.id).toBe(1);
      expect(pref.enableInApp).toBe(false);
      expect(pref.enableEmail).toBe(true);
      expect(pref.scheduleDelay).toBe(false);
    });
  });

  describe('update', () => {
    it('指定したフィールドだけ更新される', () => {
      const original = NotificationPreference.createDefault('user-1');
      const updated = original.update({ enableEmail: true });

      expect(updated.enableEmail).toBe(true);
      expect(updated.enablePush).toBe(true); // 変更なし
      expect(updated.userId).toBe('user-1');
      expect(original.enableEmail).toBe(false); // 元は変更されない
    });

    it('taskDeadlineを更新できる', () => {
      const original = NotificationPreference.createDefault('user-1');
      const updated = original.update({ taskDeadline: { days: [7, 5, 3, 1] } });

      expect(updated.taskDeadline.days).toEqual([7, 5, 3, 1]);
    });
  });

  describe('shouldNotifyForTaskDeadline', () => {
    it('設定された日数の場合trueを返す', () => {
      const pref = NotificationPreference.createDefault('user-1');

      expect(pref.shouldNotifyForTaskDeadline(3)).toBe(true);
      expect(pref.shouldNotifyForTaskDeadline(1)).toBe(true);
      expect(pref.shouldNotifyForTaskDeadline(0)).toBe(true);
    });

    it('設定にない日数の場合falseを返す', () => {
      const pref = NotificationPreference.createDefault('user-1');

      expect(pref.shouldNotifyForTaskDeadline(5)).toBe(false);
      expect(pref.shouldNotifyForTaskDeadline(2)).toBe(false);
    });
  });

  describe('shouldNotifyForManhourThreshold', () => {
    it('閾値の範囲内の場合trueを返す', () => {
      const pref = NotificationPreference.createDefault('user-1');
      // percentages: [80, 100, 120]

      expect(pref.shouldNotifyForManhourThreshold(80)).toBe(true);  // 80 >= 80 && 80 < 100
      expect(pref.shouldNotifyForManhourThreshold(99)).toBe(true);  // 99 >= 80 && 99 < 100
      expect(pref.shouldNotifyForManhourThreshold(100)).toBe(true); // 100 >= 100 && 100 < 120
      expect(pref.shouldNotifyForManhourThreshold(120)).toBe(true); // 120 >= 120 && 120 < 140
    });

    it('閾値の範囲外の場合falseを返す', () => {
      const pref = NotificationPreference.createDefault('user-1');

      expect(pref.shouldNotifyForManhourThreshold(50)).toBe(false);  // 50 < 80
      expect(pref.shouldNotifyForManhourThreshold(79)).toBe(false);  // 79 < 80
      expect(pref.shouldNotifyForManhourThreshold(140)).toBe(false); // 140 >= 140
    });
  });

  describe('getPushChannelsEnabled', () => {
    it('有効なチャネルのみ返す', () => {
      const pref = NotificationPreference.createDefault('user-1');
      const channels = pref.getPushChannelsEnabled();

      expect(channels).toContain('IN_APP');
      expect(channels).toContain('PUSH');
      expect(channels).not.toContain('EMAIL');
    });

    it('全チャネルが有効な場合3つ返す', () => {
      const pref = NotificationPreference.create({
        userId: 'user-1',
        enablePush: true,
        enableInApp: true,
        enableEmail: true,
      });

      expect(pref.getPushChannelsEnabled()).toHaveLength(3);
    });

    it('全チャネルが無効な場合空配列を返す', () => {
      const pref = NotificationPreference.create({
        userId: 'user-1',
        enablePush: false,
        enableInApp: false,
        enableEmail: false,
      });

      expect(pref.getPushChannelsEnabled()).toHaveLength(0);
    });
  });
});
