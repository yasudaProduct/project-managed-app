import { Notification } from '@/domains/notification/notification';
import { NotificationPreference } from '@/domains/notification/notification-preference';

export interface NotificationFilter {
  userId: string;
  type?: string;
  priority?: string;
  isRead?: boolean;
  scheduledBefore?: Date;
  scheduledAfter?: Date;
  createdBefore?: Date;
  createdAfter?: Date;
}

export interface NotificationListOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'priority' | 'scheduledAt';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationListResult {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface INotificationRepository {
  // 通知の基本操作
  findById(id: number): Promise<Notification | null>;
  findByUserId(userId: string, options?: NotificationListOptions): Promise<NotificationListResult>;
  findByFilter(filter: NotificationFilter, options?: NotificationListOptions): Promise<NotificationListResult>;
  create(notification: Notification): Promise<Notification>;
  createBatch(notifications: Notification[]): Promise<Notification[]>;
  update(notification: Notification): Promise<Notification>;
  delete(id: number): Promise<void>;
  markAsRead(userId: string, notificationIds: number[]): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  
  // 通知数の取得
  getUnreadCount(userId: string): Promise<number>;
  getCountByType(userId: string, type: string): Promise<number>;
  
  // スケジュール通知
  findScheduledNotifications(before: Date): Promise<Notification[]>;
  findOverdueNotifications(): Promise<Notification[]>;
  markAsSent(notificationIds: number[], sentAt: Date): Promise<void>;
  
  // 設定管理
  findPreferenceByUserId(userId: string): Promise<NotificationPreference | null>;
  savePreference(preference: NotificationPreference): Promise<NotificationPreference>;
  updatePreference(preference: NotificationPreference): Promise<NotificationPreference>;
  
  // Push通知購読管理
  savePushSubscription(userId: string, subscription: PushSubscriptionData): Promise<void>;
  findPushSubscriptionsByUserId(userId: string): Promise<PushSubscriptionData[]>;
  removePushSubscription(userId: string, endpoint?: string): Promise<void>;
  findActivePushSubscriptions(): Promise<Array<{ userId: string; subscription: PushSubscriptionData }>>;
  
  // クリーンアップ
  deleteOldNotifications(beforeDate: Date): Promise<number>;
  deleteReadNotifications(userId: string, beforeDate: Date): Promise<number>;
}