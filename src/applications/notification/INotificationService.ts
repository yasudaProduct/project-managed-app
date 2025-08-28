import { Notification, NotificationData } from '@/domains/notification/notification';
import { NotificationPreference } from '@/domains/notification/notification-preference';
import { NotificationType } from '@/domains/notification/notification-type';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';
import { NotificationListResult, PushSubscriptionData } from './INotificationRepository';

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: NotificationData;
  channels?: NotificationChannel[];
  scheduledAt?: Date;
}

export interface GetNotificationsOptions {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
  priority?: string;
}

export interface NotificationUpdateCallback {
  (notification: Notification): void;
}

export interface INotificationService {
  // 通知の作成と送信
  createNotification(request: CreateNotificationRequest): Promise<Notification>;
  createBatchNotifications(userId: string, requests: CreateNotificationRequest[]): Promise<Notification[]>;
  sendNotification(notification: Notification): Promise<void>;
  sendScheduledNotifications(): Promise<void>;
  
  // 通知の取得と管理
  getNotifications(options: GetNotificationsOptions): Promise<NotificationListResult>;
  getNotificationById(id: number): Promise<Notification | null>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(userId: string, notificationIds: string[]): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(userId: string, notificationId: string): Promise<void>;
  
  // 設定管理
  getPreferences(userId: string): Promise<NotificationPreference>;
  updatePreferences(userId: string, preferences: Partial<NotificationPreference>): Promise<NotificationPreference>;
  
  // Push通知管理
  savePushSubscription(userId: string, subscription: PushSubscriptionData): Promise<void>;
  removePushSubscription(userId: string): Promise<void>;
  
  // テスト・デバッグ
  sendTestNotification(userId: string): Promise<void>;
  
  // リアルタイム更新
  subscribeToUpdates(userId: string, callback: NotificationUpdateCallback): () => void;
  
  // バッチ処理
  cleanupOldNotifications(): Promise<number>;
  processNotificationQueue(): Promise<void>;
}