import { Notification, NotificationData } from '@/domains/notification/notification';
import { NotificationPreference } from '@/domains/notification/notification-preference';
import { NotificationType } from '@/types/notification';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';
import { PushSubscriptionData } from './INotificationRepository';

// 通知設定の詳細型定義
export interface TaskDeadlineSettings {
  days: number[];
}

export interface ManhourThresholdSettings {
  percentages: number[];
}

// 通知設定のプレーンオブジェクト型
export interface NotificationPreferencePlain {
  id?: number;
  userId: string;
  enablePush: boolean;
  enableInApp: boolean;
  enableEmail: boolean;
  taskDeadline: TaskDeadlineSettings;
  manhourThreshold: ManhourThresholdSettings;
  scheduleDelay: boolean;
  taskAssignment: boolean;
  projectStatusChange: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// プレゼンテーション層用の通知型
export interface NotificationPlain {
  id?: number;
  userId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: string[];
  isRead: boolean;
  isSent: boolean;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// プレゼンテーション層用の通知リスト結果型
export interface NotificationListResultPlain {
  notifications: NotificationPlain[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

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



export interface INotificationService {
  // 通知の作成と送信
  createNotification(request: CreateNotificationRequest): Promise<Notification>;
  createBatchNotifications(userId: string, requests: CreateNotificationRequest[]): Promise<Notification[]>;
  sendNotification(notification: Notification): Promise<void>;
  sendScheduledNotifications(): Promise<void>;

  // 通知の取得と管理
  getNotifications(options: GetNotificationsOptions): Promise<NotificationListResultPlain>;
  getNotificationById(id: number): Promise<NotificationPlain | null>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(userId: string, notificationIds: string[]): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(userId: string, notificationId: string): Promise<void>;

  // 設定管理
  getPreferences(userId: string): Promise<NotificationPreferencePlain>;
  updatePreferences(userId: string, preferences: Partial<NotificationPreference>): Promise<NotificationPreferencePlain>;

  // Push通知管理
  savePushSubscription(userId: string, subscription: PushSubscriptionData): Promise<void>;
  removePushSubscription(userId: string): Promise<void>;

  // テスト・デバッグ
  sendTestNotification(userId: string): Promise<void>;



  // バッチ処理
  cleanupOldNotifications(): Promise<number>;
  processNotificationQueue(): Promise<void>;
}