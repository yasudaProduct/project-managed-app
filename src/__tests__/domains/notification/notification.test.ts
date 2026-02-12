import { Notification } from '@/domains/notification/notification';
import { NotificationType } from '@/types/notification';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel, NotificationChannelVO } from '@/domains/notification/notification-channel';

describe('Notification', () => {
  const createTestNotification = (overrides = {}) => {
    return Notification.create({
      userId: 'user-1',
      type: NotificationType.TASK_DEADLINE_WARNING,
      priority: NotificationPriority.HIGH,
      title: 'タスク期限警告',
      message: 'タスクの期限が近づいています',
      data: { taskId: 1, projectId: 'proj-1' },
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      ...overrides,
    });
  };

  describe('create', () => {
    it('通知を作成できる', () => {
      const notification = createTestNotification();

      expect(notification.userId).toBe('user-1');
      expect(notification.type.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
      expect(notification.priority.getValue()).toBe(NotificationPriority.HIGH);
      expect(notification.title).toBe('タスク期限警告');
      expect(notification.message).toBe('タスクの期限が近づいています');
      expect(notification.isRead).toBe(false);
      expect(notification.channels).toHaveLength(2);
    });

    it('チャネル未指定の場合、PUSHとIN_APPがデフォルト', () => {
      const notification = Notification.create({
        userId: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.MEDIUM,
        title: 'test',
        message: 'test',
      });

      expect(notification.channels).toHaveLength(2);
      expect(notification.channels[0].getValue()).toBe(NotificationChannel.PUSH);
      expect(notification.channels[1].getValue()).toBe(NotificationChannel.IN_APP);
    });
  });

  describe('createFromDb', () => {
    it('DB値からNotificationを再構築できる', () => {
      const now = new Date();
      const notification = Notification.createFromDb({
        id: 1,
        userId: 'user-1',
        type: 'TASK_DEADLINE_WARNING',
        priority: 'HIGH',
        title: 'テスト',
        message: 'テストメッセージ',
        channels: ['PUSH', 'IN_APP'],
        isRead: true,
        readAt: now,
        createdAt: now,
        updatedAt: now,
      });

      expect(notification.id).toBe(1);
      expect(notification.isRead).toBe(true);
      expect(notification.readAt).toBe(now);
    });
  });

  describe('markAsRead', () => {
    it('未読通知を既読にする', () => {
      const notification = createTestNotification();
      const readAt = new Date('2026-03-01T00:00:00.000Z');
      const read = notification.markAsRead(readAt);

      expect(read.isRead).toBe(true);
      expect(read.readAt).toBe(readAt);
      expect(notification.isRead).toBe(false); // 元のオブジェクトは変更されない
    });

    it('既読通知を再度markAsReadしても変更しない', () => {
      const notification = createTestNotification();
      const read = notification.markAsRead();
      const readAgain = read.markAsRead();

      expect(readAgain).toBe(read); // 同じインスタンスを返す
    });
  });

  describe('markAsSent', () => {
    it('送信済みにする', () => {
      const notification = createTestNotification();
      const sentAt = new Date('2026-03-01T00:00:00.000Z');
      const sent = notification.markAsSent(sentAt);

      expect(sent.sentAt).toBe(sentAt);
    });
  });

  describe('isScheduled', () => {
    it('未来のスケジュール日時がある場合trueを返す', () => {
      const notification = createTestNotification({
        scheduledAt: new Date('2099-01-01T00:00:00.000Z'),
      });

      expect(notification.isScheduled()).toBe(true);
    });

    it('スケジュール日時がない場合falseを返す', () => {
      const notification = createTestNotification();

      expect(notification.isScheduled()).toBe(false);
    });
  });

  describe('isSent', () => {
    it('送信済みの場合trueを返す', () => {
      const notification = createTestNotification();
      const sent = notification.markAsSent();

      expect(sent.isSent()).toBe(true);
    });

    it('未送信の場合falseを返す', () => {
      const notification = createTestNotification();

      expect(notification.isSent()).toBe(false);
    });
  });

  describe('isPending', () => {
    it('未送信かつスケジュールなしの場合trueを返す', () => {
      const notification = createTestNotification();

      expect(notification.isPending()).toBe(true);
    });

    it('送信済みの場合falseを返す', () => {
      const notification = createTestNotification();
      const sent = notification.markAsSent();

      expect(sent.isPending()).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('スケジュール日時を過ぎて未送信の場合trueを返す', () => {
      const notification = createTestNotification({
        scheduledAt: new Date('2020-01-01T00:00:00.000Z'),
      });

      expect(notification.isOverdue()).toBe(true);
    });

    it('スケジュール日時がない場合falseを返す', () => {
      const notification = createTestNotification();

      expect(notification.isOverdue()).toBe(false);
    });
  });

  describe('shouldSendToChannel', () => {
    it('指定チャネルが含まれている場合trueを返す', () => {
      const notification = createTestNotification();
      const push = NotificationChannelVO.create(NotificationChannel.PUSH);

      expect(notification.shouldSendToChannel(push)).toBe(true);
    });

    it('指定チャネルが含まれていない場合falseを返す', () => {
      const notification = createTestNotification();
      const email = NotificationChannelVO.create(NotificationChannel.EMAIL);

      expect(notification.shouldSendToChannel(email)).toBe(false);
    });
  });

  describe('getActionUrl', () => {
    it('タスク関連通知のURLを生成する', () => {
      const notification = createTestNotification({
        type: NotificationType.TASK_DEADLINE_WARNING,
        data: { taskId: 42, projectId: 'proj-1' },
      });

      expect(notification.getActionUrl()).toBe('/projects/proj-1/tasks/42');
    });

    it('プロジェクト関連通知のURLを生成する', () => {
      const notification = createTestNotification({
        type: NotificationType.SCHEDULE_DELAY,
        data: { projectId: 'proj-1' },
      });

      expect(notification.getActionUrl()).toBe('/projects/proj-1');
    });

    it('dataがない場合undefinedを返す', () => {
      const notification = Notification.create({
        userId: 'user-1',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.HIGH,
        title: 'test',
        message: 'test',
      });

      expect(notification.getActionUrl()).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('同じIDの場合trueを返す', () => {
      const now = new Date();
      const a = Notification.createFromDb({
        id: 1, userId: 'u1', type: 'TASK_ASSIGNED', priority: 'LOW',
        title: 'a', message: 'a', channels: ['PUSH'], isRead: false,
        createdAt: now, updatedAt: now,
      });
      const b = Notification.createFromDb({
        id: 1, userId: 'u2', type: 'TASK_UPDATED', priority: 'HIGH',
        title: 'b', message: 'b', channels: ['EMAIL'], isRead: true,
        createdAt: now, updatedAt: now,
      });

      expect(a.equals(b)).toBe(true);
    });

    it('IDがundefinedの場合falseを返す', () => {
      const a = createTestNotification();
      const b = createTestNotification();

      expect(a.equals(b)).toBe(false);
    });
  });
});
