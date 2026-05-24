import { NotificationChannelVO, NotificationChannel } from '@/domains/notification/notification-channel';

describe('NotificationChannelVO', () => {
  describe('create', () => {
    it('PUSH チャンネルを作成できる', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.PUSH);
      expect(channel.getValue()).toBe(NotificationChannel.PUSH);
    });

    it('IN_APP チャンネルを作成できる', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.IN_APP);
      expect(channel.getValue()).toBe(NotificationChannel.IN_APP);
    });

    it('EMAIL チャンネルを作成できる', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.EMAIL);
      expect(channel.getValue()).toBe(NotificationChannel.EMAIL);
    });
  });

  describe('fromString', () => {
    it('有効な文字列からインスタンスを作成できる', () => {
      const channel = NotificationChannelVO.fromString('PUSH');
      expect(channel.getValue()).toBe(NotificationChannel.PUSH);
    });

    it('無効な文字列で例外が発生する', () => {
      expect(() => NotificationChannelVO.fromString('INVALID')).toThrow(
        'Invalid notification channel: INVALID'
      );
    });
  });

  describe('isRealtime', () => {
    it('PUSH はリアルタイムと判定される', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.PUSH);
      expect(channel.isRealtime()).toBe(true);
    });

    it('IN_APP はリアルタイムと判定される', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.IN_APP);
      expect(channel.isRealtime()).toBe(true);
    });

    it('EMAIL はリアルタイムでないと判定される', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.EMAIL);
      expect(channel.isRealtime()).toBe(false);
    });
  });

  describe('requiresSubscription', () => {
    it('PUSH はサブスクリプションが必要', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.PUSH);
      expect(channel.requiresSubscription()).toBe(true);
    });

    it('IN_APP はサブスクリプション不要', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.IN_APP);
      expect(channel.requiresSubscription()).toBe(false);
    });

    it('EMAIL はサブスクリプション不要', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.EMAIL);
      expect(channel.requiresSubscription()).toBe(false);
    });
  });

  describe('equals', () => {
    it('同じチャンネル同士は等しい', () => {
      const a = NotificationChannelVO.create(NotificationChannel.PUSH);
      const b = NotificationChannelVO.create(NotificationChannel.PUSH);
      expect(a.equals(b)).toBe(true);
    });

    it('異なるチャンネル同士は等しくない', () => {
      const a = NotificationChannelVO.create(NotificationChannel.PUSH);
      const b = NotificationChannelVO.create(NotificationChannel.EMAIL);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('getDisplayName', () => {
    it('PUSH の表示名はデスクトップ通知', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.PUSH);
      expect(channel.getDisplayName()).toBe('デスクトップ通知');
    });

    it('IN_APP の表示名はアプリ内通知', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.IN_APP);
      expect(channel.getDisplayName()).toBe('アプリ内通知');
    });

    it('EMAIL の表示名はメール通知', () => {
      const channel = NotificationChannelVO.create(NotificationChannel.EMAIL);
      expect(channel.getDisplayName()).toBe('メール通知');
    });
  });

  describe('getDescription', () => {
    it('各チャンネルの説明が空でない', () => {
      const channels = NotificationChannelVO.getAllChannels();
      channels.forEach(channel => {
        expect(channel.getDescription().length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllChannels', () => {
    it('全チャンネルを返す', () => {
      const channels = NotificationChannelVO.getAllChannels();
      expect(channels).toHaveLength(3);

      const values = channels.map(c => c.getValue());
      expect(values).toContain(NotificationChannel.PUSH);
      expect(values).toContain(NotificationChannel.IN_APP);
      expect(values).toContain(NotificationChannel.EMAIL);
    });
  });
});
