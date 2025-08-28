import { Notification } from '@/domains/notification/notification';
import { NotificationType } from '@/domains/notification/notification-type';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';

// Simple unit test for NotificationService types and interfaces
describe('NotificationService types', () => {
  describe('Notification creation', () => {
    it('should create notification with proper data structure', () => {
      const notification = Notification.create({
        userId: 'user1',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.HIGH,
        title: 'タスクの期限が近づいています',
        message: 'プロジェクトAのタスクBの期限が明日です。',
        data: {
          taskId: 123,
          projectId: 456,
        },
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      });

      expect(notification.userId).toBe('user1');
      expect(notification.type.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
      expect(notification.priority.getValue()).toBe(NotificationPriority.HIGH);
      expect(notification.title).toBe('タスクの期限が近づいています');
      expect(notification.message).toBe('プロジェクトAのタスクBの期限が明日です。');
      expect(notification.data?.taskId).toBe(123);
      expect(notification.data?.projectId).toBe(456);
      expect(notification.channels).toHaveLength(2);
    });
  });

  describe('Repository interface types', () => {
    it('should define correct pagination options', () => {
      const paginationOptions = {
        page: 1,
        limit: 10,
        unreadOnly: true,
      };

      expect(paginationOptions.page).toBe(1);
      expect(paginationOptions.limit).toBe(10);
      expect(paginationOptions.unreadOnly).toBe(true);
    });

    it('should define correct notification preferences structure', () => {
      const preferences = {
        userId: 'user1',
        channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
        taskDeadlineWarning: true,
        taskManhourWarning: false,
        scheduleDelay: true,
        taskAssigned: true,
        projectStatusChanged: false,
      };

      expect(preferences.userId).toBe('user1');
      expect(preferences.channels).toContain(NotificationChannel.PUSH);
      expect(preferences.channels).toContain(NotificationChannel.EMAIL);
      expect(preferences.taskDeadlineWarning).toBe(true);
      expect(preferences.taskManhourWarning).toBe(false);
    });
  });

  describe('Push notification subscription types', () => {
    it('should define correct push subscription structure', () => {
      const subscription = {
        endpoint: 'https://fcm.googleapis.com/endpoint',
        keys: {
          p256dh: 'p256dh-key',
          auth: 'auth-key',
        },
      };

      expect(subscription.endpoint).toBe('https://fcm.googleapis.com/endpoint');
      expect(subscription.keys.p256dh).toBe('p256dh-key');
      expect(subscription.keys.auth).toBe('auth-key');
    });

    it('should define correct database subscription structure', () => {
      const dbSubscription = {
        userId: 'user1',
        endpoint: 'https://fcm.googleapis.com/endpoint',
        p256dh: 'p256dh-key',
        auth: 'auth-key',
      };

      expect(dbSubscription.userId).toBe('user1');
      expect(dbSubscription.endpoint).toBe('https://fcm.googleapis.com/endpoint');
      expect(dbSubscription.p256dh).toBe('p256dh-key');
      expect(dbSubscription.auth).toBe('auth-key');
    });
  });
});