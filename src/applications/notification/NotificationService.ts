import { injectable, inject } from 'inversify';
import { Notification, NotificationData } from '@/domains/notification/notification';
import { NotificationPreference } from '@/domains/notification/notification-preference';
import { NotificationType } from '@/domains/notification/notification-type';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';
import { 
  INotificationService,
  CreateNotificationRequest,
  GetNotificationsOptions,
  NotificationUpdateCallback
} from './INotificationService';
import { 
  INotificationRepository,
  NotificationListResult,
  PushSubscriptionData,
  NotificationFilter
} from './INotificationRepository';
import { PushNotificationService } from '@/infrastructures/notification/PushNotificationService';

@injectable()
export class NotificationService implements INotificationService {
  private updateCallbacks: Map<string, NotificationUpdateCallback[]> = new Map();

  constructor(
    @inject('NotificationRepository') private notificationRepository: INotificationRepository,
    @inject('PushNotificationService') private pushNotificationService: PushNotificationService
  ) {}

  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    // ユーザーの通知設定を確認
    const preferences = await this.getPreferences(request.userId);
    
    // クワイエットアワーのチェック
    if (preferences.isInQuietHours()) {
      // クワイエットアワー中は送信時刻を調整
      const scheduledAt = this.calculateNextSendTime(preferences);
      request.scheduledAt = scheduledAt;
    }

    // 通知設定に応じてチャンネルを調整
    const enabledChannels = this.getEnabledChannels(request, preferences);
    
    const notification = Notification.create({
      ...request,
      channels: enabledChannels,
    });

    const savedNotification = await this.notificationRepository.create(notification);

    // リアルタイム通知の送信
    if (this.shouldSendImmediately(savedNotification, preferences)) {
      await this.sendNotification(savedNotification);
    }

    // リアルタイム更新の通知
    this.notifySubscribers(request.userId, savedNotification);

    return savedNotification;
  }

  async createBatchNotifications(userId: string, requests: CreateNotificationRequest[]): Promise<Notification[]> {
    const preferences = await this.getPreferences(userId);
    
    const notifications = requests.map(request => {
      const enabledChannels = this.getEnabledChannels(request, preferences);
      return Notification.create({
        ...request,
        channels: enabledChannels,
      });
    });

    const savedNotifications = await this.notificationRepository.createBatch(notifications);

    // リアルタイム更新の通知
    savedNotifications.forEach(notification => {
      this.notifySubscribers(userId, notification);
    });

    return savedNotifications;
  }

  async sendNotification(notification: Notification): Promise<void> {
    // 各チャンネルに送信
    const sendPromises = notification.channels.map(async (channel) => {
      try {
        switch (channel.getValue()) {
          case NotificationChannel.PUSH:
            await this.sendPushNotification(notification);
            break;
          case NotificationChannel.IN_APP:
            // アプリ内通知は既に作成済み
            break;
          case NotificationChannel.EMAIL:
            await this.sendEmailNotification(notification);
            break;
        }
      } catch (error) {
        console.error(`Failed to send notification via ${channel.getValue()}:`, error);
      }
    });

    await Promise.allSettled(sendPromises);
    
    // 送信済みマークを付ける
    await this.notificationRepository.markAsSent([notification.id!], new Date());
  }

  async sendScheduledNotifications(): Promise<void> {
    const scheduledNotifications = await this.notificationRepository.findScheduledNotifications(new Date());
    
    for (const notification of scheduledNotifications) {
      await this.sendNotification(notification);
    }
  }

  async getNotifications(options: GetNotificationsOptions): Promise<NotificationListResult> {
    const filter: NotificationFilter = {
      userId: options.userId,
    };

    if (options.unreadOnly) {
      filter.isRead = false;
    }

    if (options.type) {
      filter.type = options.type;
    }

    if (options.priority) {
      filter.priority = options.priority;
    }

    const listOptions = {
      page: options.page ?? 1,
      limit: options.limit ?? 20,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    return this.notificationRepository.findByFilter(filter, listOptions);
  }

  async getNotificationById(id: number): Promise<Notification | null> {
    return this.notificationRepository.findById(id);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    const ids = notificationIds.map(id => parseInt(id, 10));
    await this.notificationRepository.markAsRead(userId, ids);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const id = parseInt(notificationId, 10);
    // セキュリティチェック: ユーザーの通知のみ削除可能
    const notification = await this.notificationRepository.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or access denied');
    }
    
    await this.notificationRepository.delete(id);
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.notificationRepository.findPreferenceByUserId(userId);
    
    if (!preferences) {
      // デフォルト設定を作成
      preferences = NotificationPreference.createDefault(userId);
      preferences = await this.notificationRepository.savePreference(preferences);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string, 
    updates: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const currentPreferences = await this.getPreferences(userId);
    const updatedPreferences = currentPreferences.update(updates);
    
    return this.notificationRepository.updatePreference(updatedPreferences);
  }

  async savePushSubscription(userId: string, subscription: PushSubscriptionData): Promise<void> {
    await this.notificationRepository.savePushSubscription(userId, subscription);
  }

  async removePushSubscription(userId: string): Promise<void> {
    await this.notificationRepository.removePushSubscription(userId);
  }

  async sendTestNotification(userId: string): Promise<void> {
    const testNotification = await this.createNotification({
      userId,
      type: NotificationType.PROJECT_STATUS_CHANGED,
      priority: NotificationPriority.LOW,
      title: 'テスト通知',
      message: 'これはテスト通知です。通知設定が正常に動作しています。',
      data: {
        testMode: true,
      },
    });

    await this.sendNotification(testNotification);
  }

  subscribeToUpdates(userId: string, callback: NotificationUpdateCallback): () => void {
    if (!this.updateCallbacks.has(userId)) {
      this.updateCallbacks.set(userId, []);
    }
    
    this.updateCallbacks.get(userId)!.push(callback);
    
    // アンサブスクライブ関数を返す
    return () => {
      const callbacks = this.updateCallbacks.get(userId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        
        if (callbacks.length === 0) {
          this.updateCallbacks.delete(userId);
        }
      }
    };
  }

  async cleanupOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.notificationRepository.deleteOldNotifications(thirtyDaysAgo);
  }

  async processNotificationQueue(): Promise<void> {
    // 予定された通知の送信
    await this.sendScheduledNotifications();
    
    // 古い通知のクリーンアップ
    await this.cleanupOldNotifications();
  }

  private getEnabledChannels(
    request: CreateNotificationRequest, 
    preferences: NotificationPreference
  ): NotificationChannel[] {
    const requestedChannels = request.channels ?? [
      NotificationChannel.PUSH,
      NotificationChannel.IN_APP,
    ];

    const enabledChannels = requestedChannels.filter(channel => {
      switch (channel) {
        case NotificationChannel.PUSH:
          return preferences.enablePush;
        case NotificationChannel.IN_APP:
          return preferences.enableInApp;
        case NotificationChannel.EMAIL:
          return preferences.enableEmail;
        default:
          return true;
      }
    });

    // 最低でもアプリ内通知は有効にする
    if (enabledChannels.length === 0) {
      enabledChannels.push(NotificationChannel.IN_APP);
    }

    return enabledChannels;
  }

  private shouldSendImmediately(notification: Notification, preferences: NotificationPreference): boolean {
    // スケジュール済みの通知は後で送信
    if (notification.isScheduled()) {
      return false;
    }

    // クワイエットアワー中は送信しない
    if (preferences.isInQuietHours()) {
      return false;
    }

    return true;
  }

  private calculateNextSendTime(preferences: NotificationPreference): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // クワイエットアワー終了時刻に設定
    if (preferences.quietHoursEnd !== undefined) {
      tomorrow.setHours(preferences.quietHoursEnd, 0, 0, 0);
    } else {
      tomorrow.setHours(9, 0, 0, 0); // デフォルトは9時
    }
    
    return tomorrow;
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    try {
      await this.pushNotificationService.sendToUser(notification.userId, notification);
    } catch (error) {
      console.error('Failed to send push notification:', error);
      // Push通知の失敗はエラーとして扱わない（ベストエフォート）
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    // メール通知の実装は後のフェーズで行う
    console.log('Email notification would be sent:', notification);
  }

  private notifySubscribers(userId: string, notification: Notification): void {
    const callbacks = this.updateCallbacks.get(userId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          console.error('Error in notification callback:', error);
        }
      });
    }
  }
}