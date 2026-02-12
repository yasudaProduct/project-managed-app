import { NotificationChannel, NotificationChannelVO } from '@/domains/notification/notification-channel';

describe('NotificationChannelVO', () => {
  describe('create', () => {
    it('各チャネルのVOを作成できる', () => {
      const push = NotificationChannelVO.create(NotificationChannel.PUSH);
      const inApp = NotificationChannelVO.create(NotificationChannel.IN_APP);
      const email = NotificationChannelVO.create(NotificationChannel.EMAIL);

      expect(push.getValue()).toBe(NotificationChannel.PUSH);
      expect(inApp.getValue()).toBe(NotificationChannel.IN_APP);
      expect(email.getValue()).toBe(NotificationChannel.EMAIL);
    });
  });

  describe('fromString', () => {
    it('文字列からVOを作成できる', () => {
      const vo = NotificationChannelVO.fromString('PUSH');
      expect(vo.getValue()).toBe(NotificationChannel.PUSH);
    });

    it('無効な文字列の場合エラーを投げる', () => {
      expect(() => NotificationChannelVO.fromString('INVALID'))
        .toThrow('Invalid notification channel: INVALID');
    });
  });

  describe('getDisplayName', () => {
    it.each([
      [NotificationChannel.PUSH, 'デスクトップ通知'],
      [NotificationChannel.IN_APP, 'アプリ内通知'],
      [NotificationChannel.EMAIL, 'メール通知'],
    ])('%s の表示名は "%s"', (channel, expected) => {
      const vo = NotificationChannelVO.create(channel);
      expect(vo.getDisplayName()).toBe(expected);
    });
  });

  describe('getDescription', () => {
    it.each([
      [NotificationChannel.PUSH, 'ブラウザのプッシュ通知でお知らせします'],
      [NotificationChannel.IN_APP, 'アプリケーション内で通知を表示します'],
      [NotificationChannel.EMAIL, '登録されたメールアドレスに通知を送信します'],
    ])('%s の説明は "%s"', (channel, expected) => {
      const vo = NotificationChannelVO.create(channel);
      expect(vo.getDescription()).toBe(expected);
    });
  });

  describe('getAllChannels', () => {
    it('全チャネルを返す', () => {
      const channels = NotificationChannelVO.getAllChannels();
      expect(channels).toHaveLength(3);
    });
  });

  describe('equals', () => {
    it('同じチャネルの場合trueを返す', () => {
      const a = NotificationChannelVO.create(NotificationChannel.PUSH);
      const b = NotificationChannelVO.create(NotificationChannel.PUSH);
      expect(a.equals(b)).toBe(true);
    });

    it('異なるチャネルの場合falseを返す', () => {
      const a = NotificationChannelVO.create(NotificationChannel.PUSH);
      const b = NotificationChannelVO.create(NotificationChannel.EMAIL);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('isRealtime', () => {
    it('PUSHはリアルタイム', () => {
      expect(NotificationChannelVO.create(NotificationChannel.PUSH).isRealtime()).toBe(true);
    });

    it('IN_APPはリアルタイム', () => {
      expect(NotificationChannelVO.create(NotificationChannel.IN_APP).isRealtime()).toBe(true);
    });

    it('EMAILはリアルタイムではない', () => {
      expect(NotificationChannelVO.create(NotificationChannel.EMAIL).isRealtime()).toBe(false);
    });
  });

  describe('requiresSubscription', () => {
    it('PUSHはサブスクリプション必要', () => {
      expect(NotificationChannelVO.create(NotificationChannel.PUSH).requiresSubscription()).toBe(true);
    });

    it('IN_APPはサブスクリプション不要', () => {
      expect(NotificationChannelVO.create(NotificationChannel.IN_APP).requiresSubscription()).toBe(false);
    });

    it('EMAILはサブスクリプション不要', () => {
      expect(NotificationChannelVO.create(NotificationChannel.EMAIL).requiresSubscription()).toBe(false);
    });
  });
});
