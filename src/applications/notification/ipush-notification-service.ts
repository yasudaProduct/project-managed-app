import { Notification } from '@/domains/notification/notification';

export interface IPushNotificationService {
  sendToUser(userId: string, notification: Notification): Promise<void>;
  sendToMultipleUsers(userIds: string[], notification: Notification): Promise<void>;
  sendToAllUsers(notification: Notification): Promise<void>;
  isAvailable(): Promise<boolean>;
  sendTestNotification(userId: string): Promise<void>;
  getStatistics(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    recentSentCount: number;
  }>;
}
