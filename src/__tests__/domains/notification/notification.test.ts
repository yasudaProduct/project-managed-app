import { Notification } from '@/domains/notification/notification';
import { NotificationType } from '@/types/notification';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel, NotificationChannelVO } from '@/domains/notification/notification-channel';

describe('Notification', () => {
  const createNotification = (overrides?: Partial<Parameters<typeof Notification.create>[0]>) =>
    Notification.create({
      userId: 'user-1',
      type: NotificationType.TASK_DEADLINE_WARNING,
      priority: NotificationPriority.MEDIUM,
      title: 'テスト通知',
      message: 'テストメッセージ',
      ...overrides,
    });

  describe('create', () => {
    it('通知を作成できる', () => {
      const notification = createNotification();

      expect(notification.userId).toBe('user-1');
      expect(notification.type.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
      expect(notification.priority.getValue()).toBe(NotificationPriority.MEDIUM);
      expect(notification.title).toBe('テスト通知');
      expect(notification.message).toBe('テストメッセージ');
      expect(notification.isRead).toBe(false);
    });

    it('チャンネル未指定時はPUSHとIN_APPがデフォルトで設定される', () => {
      const notification = createNotification();

      expect(notification.channels).toHaveLength(2);
      const channelValues = notification.channels.map(c => c.getValue());
      expect(channelValues).toContain(NotificationChannel.PUSH);
      expect(channelValues).toContain(NotificationChannel.IN_APP);
    });

    it('チャンネルを指定して作成できる', () => {
      const notification = createNotification({
        channels: [NotificationChannel.EMAIL],
      });

      expect(notification.channels).toHaveLength(1);
      expect(notification.channels[0].getValue()).toBe(NotificationChannel.EMAIL);
    });
  });

  describe('createFromDb', () => {
    it('DB値から通知を復元できる', () => {
      const now = new Date();
      const notification = Notification.createFromDb({
        id: 1,
        userId: 'user-1',
        type: 'TASK_ASSIGNED',
        priority: 'HIGH',
        title: 'タスク割当',
        message: 'テスト',
        channels: ['PUSH', 'IN_APP'],
        isRead: true,
        readAt: now,
        createdAt: now,
        updatedAt: now,
      });

      expect(notification.id).toBe(1);
      expect(notification.type.getValue()).toBe(NotificationType.TASK_ASSIGNED);
      expect(notification.priority.getValue()).toBe(NotificationPriority.HIGH);
      expect(notification.isRead).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('未読の通知を既読にできる', () => {
      const notification = createNotification();
      const readAt = new Date('2026-05-24T10:00:00Z');
      const read = notification.markAsRead(readAt);

      expect(read.isRead).toBe(true);
      expect(read.readAt).toBe(readAt);
    });

    it('既読の通知は同じインスタンスを返す', () => {
      const notification = createNotification();
      const read = notification.markAsRead();
      const readAgain = read.markAsRead();

      expect(readAgain).toBe(read);
    });

    it('元のインスタンスは変更されない（イミュータブル）', () => {
      const notification = createNotification();
      notification.markAsRead();

      expect(notification.isRead).toBe(false);
    });
  });

  describe('markAsSent', () => {
    it('送信済みにできる', () => {
      const notification = createNotification();
      const sentAt = new Date('2026-05-24T10:00:00Z');
      const sent = notification.markAsSent(sentAt);

      expect(sent.sentAt).toBe(sentAt);
    });
  });

  describe('isScheduled', () => {
    it('scheduledAtが未来の場合はtrueを返す', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1日後
      const notification = createNotification({ scheduledAt: futureDate });

      expect(notification.isScheduled()).toBe(true);
    });

    it('scheduledAtが過去の場合はfalseを返す', () => {
      const pastDate = new Date(Date.now() - 86400000); // 1日前
      const notification = createNotification({ scheduledAt: pastDate });

      expect(notification.isScheduled()).toBe(false);
    });

    it('scheduledAtが未設定の場合はfalseを返す', () => {
      const notification = createNotification();
      expect(notification.isScheduled()).toBe(false);
    });
  });

  describe('isSent', () => {
    it('sentAtが設定されている場合はtrueを返す', () => {
      const notification = createNotification();
      const sent = notification.markAsSent();

      expect(sent.isSent()).toBe(true);
    });

    it('sentAtが未設定の場合はfalseを返す', () => {
      const notification = createNotification();
      expect(notification.isSent()).toBe(false);
    });
  });

  describe('isPending', () => {
    it('未送信かつ未スケジュールの場合はtrueを返す', () => {
      const notification = createNotification();
      expect(notification.isPending()).toBe(true);
    });

    it('送信済みの場合はfalseを返す', () => {
      const notification = createNotification();
      const sent = notification.markAsSent();

      expect(sent.isPending()).toBe(false);
    });

    it('スケジュール済み（未来）の場合はfalseを返す', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const notification = createNotification({ scheduledAt: futureDate });

      expect(notification.isPending()).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('スケジュールが過去で未送信の場合はtrueを返す', () => {
      const pastDate = new Date(Date.now() - 86400000);
      const notification = createNotification({ scheduledAt: pastDate });

      expect(notification.isOverdue()).toBe(true);
    });

    it('スケジュールが未来の場合はfalseを返す', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const notification = createNotification({ scheduledAt: futureDate });

      expect(notification.isOverdue()).toBe(false);
    });

    it('送信済みの場合はfalseを返す', () => {
      const pastDate = new Date(Date.now() - 86400000);
      const notification = createNotification({ scheduledAt: pastDate });
      const sent = notification.markAsSent();

      expect(sent.isOverdue()).toBe(false);
    });

    it('scheduledAtが未設定の場合はfalseを返す', () => {
      const notification = createNotification();
      expect(notification.isOverdue()).toBe(false);
    });
  });

  describe('shouldSendToChannel', () => {
    it('通知のチャンネルリストに含まれる場合はtrueを返す', () => {
      const notification = createNotification({
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      });
      const pushChannel = NotificationChannelVO.create(NotificationChannel.PUSH);

      expect(notification.shouldSendToChannel(pushChannel)).toBe(true);
    });

    it('通知のチャンネルリストに含まれない場合はfalseを返す', () => {
      const notification = createNotification({
        channels: [NotificationChannel.PUSH],
      });
      const emailChannel = NotificationChannelVO.create(NotificationChannel.EMAIL);

      expect(notification.shouldSendToChannel(emailChannel)).toBe(false);
    });
  });

  describe('getActionUrl', () => {
    it('タスク系通知でtaskIdとprojectIdがある場合はタスクURLを返す', () => {
      const notification = createNotification({
        type: NotificationType.TASK_DEADLINE_WARNING,
        data: { taskId: 42, projectId: 'proj-1' },
      });

      expect(notification.getActionUrl()).toBe('/projects/proj-1/tasks/42');
    });

    it.each([
      NotificationType.TASK_DEADLINE_OVERDUE,
      NotificationType.TASK_MANHOUR_WARNING,
      NotificationType.TASK_MANHOUR_EXCEEDED,
      NotificationType.TASK_ASSIGNED,
      NotificationType.TASK_UPDATED,
    ])('%s でtaskIdとprojectIdがある場合はタスクURLを返す', (type) => {
      const notification = createNotification({
        type,
        data: { taskId: 1, projectId: 'p-1' },
      });

      expect(notification.getActionUrl()).toBe('/projects/p-1/tasks/1');
    });

    it('タスク系通知でtaskIdがない場合はundefinedを返す', () => {
      const notification = createNotification({
        type: NotificationType.TASK_ASSIGNED,
        data: { projectId: 'proj-1' },
      });

      expect(notification.getActionUrl()).toBeUndefined();
    });

    it('SCHEDULE_DELAY でprojectIdがある場合はプロジェクトURLを返す', () => {
      const notification = createNotification({
        type: NotificationType.SCHEDULE_DELAY,
        data: { projectId: 'proj-1' },
      });

      expect(notification.getActionUrl()).toBe('/projects/proj-1');
    });

    it('PROJECT_STATUS_CHANGED でprojectIdがある場合はプロジェクトURLを返す', () => {
      const notification = createNotification({
        type: NotificationType.PROJECT_STATUS_CHANGED,
        data: { projectId: 'proj-1' },
      });

      expect(notification.getActionUrl()).toBe('/projects/proj-1');
    });

    it('dataがundefinedの場合はundefinedを返す', () => {
      const notification = createNotification();
      expect(notification.getActionUrl()).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('同じidの通知は等しい', () => {
      const now = new Date();
      const a = Notification.createFromDb({
        id: 1, userId: 'u', type: 'TASK_ASSIGNED', priority: 'LOW',
        title: 'a', message: 'a', channels: ['PUSH'], isRead: false,
        createdAt: now, updatedAt: now,
      });
      const b = Notification.createFromDb({
        id: 1, userId: 'u', type: 'TASK_UPDATED', priority: 'HIGH',
        title: 'b', message: 'b', channels: ['EMAIL'], isRead: true,
        createdAt: now, updatedAt: now,
      });

      expect(a.equals(b)).toBe(true);
    });

    it('異なるidの通知は等しくない', () => {
      const now = new Date();
      const a = Notification.createFromDb({
        id: 1, userId: 'u', type: 'TASK_ASSIGNED', priority: 'LOW',
        title: 'a', message: 'a', channels: ['PUSH'], isRead: false,
        createdAt: now, updatedAt: now,
      });
      const b = Notification.createFromDb({
        id: 2, userId: 'u', type: 'TASK_ASSIGNED', priority: 'LOW',
        title: 'a', message: 'a', channels: ['PUSH'], isRead: false,
        createdAt: now, updatedAt: now,
      });

      expect(a.equals(b)).toBe(false);
    });

    it('idがundefinedの場合はfalseを返す', () => {
      const a = createNotification();
      const b = createNotification();

      expect(a.equals(b)).toBe(false);
    });
  });
});
