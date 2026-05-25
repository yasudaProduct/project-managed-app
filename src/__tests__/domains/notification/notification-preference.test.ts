import { NotificationPreference } from '@/domains/notification/notification-preference';

describe('NotificationPreference', () => {
  describe('createDefault', () => {
    it('デフォルト値が正しく設定される', () => {
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

  describe('shouldNotifyForTaskDeadline', () => {
    let pref: NotificationPreference;

    beforeEach(() => {
      pref = NotificationPreference.createDefault('user-1');
    });

    it('デフォルト設定で3日前は通知対象', () => {
      expect(pref.shouldNotifyForTaskDeadline(3)).toBe(true);
    });

    it('デフォルト設定で1日前は通知対象', () => {
      expect(pref.shouldNotifyForTaskDeadline(1)).toBe(true);
    });

    it('デフォルト設定で当日（0日）は通知対象', () => {
      expect(pref.shouldNotifyForTaskDeadline(0)).toBe(true);
    });

    it('デフォルト設定で2日前は通知対象外', () => {
      expect(pref.shouldNotifyForTaskDeadline(2)).toBe(false);
    });

    it('デフォルト設定で5日前は通知対象外', () => {
      expect(pref.shouldNotifyForTaskDeadline(5)).toBe(false);
    });

    it('カスタム設定の日数で通知判定できる', () => {
      const customPref = NotificationPreference.create({
        userId: 'user-1',
        taskDeadline: { days: [7, 3] },
      });

      expect(customPref.shouldNotifyForTaskDeadline(7)).toBe(true);
      expect(customPref.shouldNotifyForTaskDeadline(3)).toBe(true);
      expect(customPref.shouldNotifyForTaskDeadline(1)).toBe(false);
    });
  });

  describe('shouldNotifyForManhourThreshold', () => {
    let pref: NotificationPreference;

    beforeEach(() => {
      pref = NotificationPreference.createDefault('user-1');
    });

    it('80%は通知対象（80閾値の範囲内）', () => {
      expect(pref.shouldNotifyForManhourThreshold(80)).toBe(true);
    });

    it('99%は通知対象（80閾値の+20%範囲内）', () => {
      expect(pref.shouldNotifyForManhourThreshold(99)).toBe(true);
    });

    it('100%は通知対象（100閾値の範囲内）', () => {
      expect(pref.shouldNotifyForManhourThreshold(100)).toBe(true);
    });

    it('120%は通知対象（120閾値の範囲内）', () => {
      expect(pref.shouldNotifyForManhourThreshold(120)).toBe(true);
    });

    it('79%は通知対象外', () => {
      expect(pref.shouldNotifyForManhourThreshold(79)).toBe(false);
    });

    it('140%は通知対象外（120閾値の+20%範囲外）', () => {
      expect(pref.shouldNotifyForManhourThreshold(140)).toBe(false);
    });
  });

  describe('getPushChannelsEnabled', () => {
    it('デフォルト設定ではIN_APPとPUSHが有効', () => {
      const pref = NotificationPreference.createDefault('user-1');
      const channels = pref.getPushChannelsEnabled();

      expect(channels).toContain('IN_APP');
      expect(channels).toContain('PUSH');
      expect(channels).not.toContain('EMAIL');
    });

    it('全チャンネル有効時は3つ返す', () => {
      const pref = NotificationPreference.create({
        userId: 'user-1',
        enablePush: true,
        enableInApp: true,
        enableEmail: true,
      });

      expect(pref.getPushChannelsEnabled()).toHaveLength(3);
    });

    it('全チャンネル無効時は空配列を返す', () => {
      const pref = NotificationPreference.create({
        userId: 'user-1',
        enablePush: false,
        enableInApp: false,
        enableEmail: false,
      });

      expect(pref.getPushChannelsEnabled()).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('指定したフィールドのみ更新される', () => {
      const pref = NotificationPreference.createDefault('user-1');
      const updated = pref.update({ enableEmail: true });

      expect(updated.enableEmail).toBe(true);
      expect(updated.enablePush).toBe(true); // 変更なし
      expect(updated.enableInApp).toBe(true); // 変更なし
      expect(updated.userId).toBe('user-1');
    });

    it('複数フィールドを同時に更新できる', () => {
      const pref = NotificationPreference.createDefault('user-1');
      const updated = pref.update({
        enablePush: false,
        scheduleDelay: false,
        taskDeadline: { days: [7, 5, 3, 1] },
      });

      expect(updated.enablePush).toBe(false);
      expect(updated.scheduleDelay).toBe(false);
      expect(updated.taskDeadline).toEqual({ days: [7, 5, 3, 1] });
      expect(updated.enableInApp).toBe(true); // 変更なし
    });

    it('元のインスタンスは変更されない（イミュータブル）', () => {
      const pref = NotificationPreference.createDefault('user-1');
      pref.update({ enablePush: false });

      expect(pref.enablePush).toBe(true);
    });
  });
});
