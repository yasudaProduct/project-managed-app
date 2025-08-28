import { Notification } from '@/domains/notification/notification';
import { NotificationType } from '@/domains/notification/notification-type';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';

describe('Notification Domain', () => {
  describe('create', () => {
    it('should create notification with required properties', () => {
      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.HIGH,
        title: 'タスクの期限が近づいています',
        message: 'プロジェクトAのタスクBの期限が明日です。',
      });

      expect(notification.userId).toBe('user1');
      expect(notification.type.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
      expect(notification.priority.getValue()).toBe(NotificationPriority.HIGH);
      expect(notification.title).toBe('タスクの期限が近づいています');
      expect(notification.message).toBe('プロジェクトAのタスクBの期限が明日です。');
      expect(notification.isRead).toBe(false);
    });

    it('should create notification with data and custom channels', () => {
      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.NORMAL,
        title: 'タスクが割り当てられました',
        message: 'プロジェクトAのタスクBが割り当てられました。',
        data: {
          taskId: 123,
          projectId: 456,
          taskNo: 'TASK-001',
          projectName: 'プロジェクトA',
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      });

      expect(notification.data?.taskId).toBe(123);
      expect(notification.data?.projectId).toBe(456);
      expect(notification.channels).toHaveLength(2);
      expect(notification.channels[0].getValue()).toBe(NotificationChannel.EMAIL);
      expect(notification.channels[1].getValue()).toBe(NotificationChannel.IN_APP);
    });
  });

  describe('createFromDb', () => {
    it('should create notification from database data', () => {
      const dbData = {
        id: 1,
        userId: 'user1',
        type: 'TASK_DEADLINE_WARNING',
        priority: 'HIGH',
        title: 'タスクの期限が近づいています',
        message: 'プロジェクトAのタスクBの期限が明日です。',
        data: { taskId: 123 },
        channels: ['PUSH', 'IN_APP'],
        isRead: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const notification = Notification.createFromDb(dbData);

      expect(notification.id).toBe(1);
      expect(notification.userId).toBe('user1');
      expect(notification.type.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
      expect(notification.priority.getValue()).toBe(NotificationPriority.HIGH);
      expect(notification.isRead).toBe(false);
      expect(notification.data?.taskId).toBe(123);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.HIGH,
        title: 'タスクの期限が近づいています',
        message: 'プロジェクトAのタスクBの期限が明日です。',
      });

      expect(notification.isRead).toBe(false);
      
      const readNotification = notification.markAsRead();
      
      expect(readNotification.isRead).toBe(true);
      expect(readNotification.readAt).toBeDefined();
    });

    it('should not change read status if already read', () => {
      const readNotification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.HIGH,
        title: 'タスクの期限が近づいています',
        message: 'プロジェクトAのタスクBの期限が明日です。',
      }).markAsRead();

      expect(readNotification.isRead).toBe(true);
      
      const stillReadNotification = readNotification.markAsRead();
      
      expect(stillReadNotification.isRead).toBe(true);
      expect(stillReadNotification).toBe(readNotification); // 同じインスタンスが返される
    });
  });

  describe('status methods', () => {
    it('should check if notification is scheduled', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.HIGH,
        title: 'タスクの期限が近づいています',
        message: 'プロジェクトAのタスクBの期限が明日です。',
        scheduledAt: futureDate,
      });

      expect(notification.isScheduled()).toBe(true);
      expect(notification.isPending()).toBe(false);
      expect(notification.isOverdue()).toBe(false);
    });

    it('should check if notification is sent', () => {
      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.HIGH,
        title: 'タスクの期限が近づいています',
        message: 'プロジェクトAのタスクBの期限が明日です。',
      });

      expect(notification.isSent()).toBe(false);
      
      const sentNotification = notification.markAsSent();
      
      expect(sentNotification.isSent()).toBe(true);
      expect(sentNotification.sentAt).toBeDefined();
    });

    it('should check if notification is overdue', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.HIGH,
        title: 'タスクの期限が近づいています',
        message: 'プロジェクトAのタスクBの期限が明日です。',
        scheduledAt: pastDate,
      });

      expect(notification.isOverdue()).toBe(true);
    });
  });

  describe('getActionUrl', () => {
    it('should generate task action URL for task-related notifications', () => {
      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.NORMAL,
        title: 'タスクが割り当てられました',
        message: 'プロジェクトAのタスクBが割り当てられました。',
        data: {
          taskId: 123,
          projectId: 456,
        },
      });

      expect(notification.getActionUrl()).toBe('/projects/456/tasks/123');
    });

    it('should generate project action URL for project-related notifications', () => {
      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.PROJECT_STATUS_CHANGED,
        priority: NotificationPriority.NORMAL,
        title: 'プロジェクトステータスが変更されました',
        message: 'プロジェクトAのステータスが変更されました。',
        data: {
          projectId: 456,
        },
      });

      expect(notification.getActionUrl()).toBe('/projects/456');
    });

    it('should return undefined when no data is provided', () => {
      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.NORMAL,
        title: 'タスクが割り当てられました',
        message: 'プロジェクトAのタスクBが割り当てられました。',
      });

      expect(notification.getActionUrl()).toBeUndefined();
    });
  });
});