import { injectable, inject } from 'inversify';
import { Notification } from '@/domains/notification/notification';
import { NotificationPreference } from '@/domains/notification/notification-preference';
import { NotificationType } from '@/types/notification';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';
import {
  INotificationService,
  CreateNotificationRequest,
  GetNotificationsOptions,
  NotificationPreferencePlain,
  NotificationPlain,
  NotificationListResultPlain,
} from './INotificationService';
import type {
  INotificationRepository,
  PushSubscriptionData,
  NotificationFilter
} from './INotificationRepository';
import { PushNotificationService } from '@/infrastructures/notification/PushNotificationService';

@injectable()
export class NotificationService implements INotificationService {


  constructor(
    @inject('NotificationRepository') private notificationRepository: INotificationRepository,
    @inject('PushNotificationService') private pushNotificationService: PushNotificationService
  ) { }

  /**
   * 通知の作成
   * 通知の作成は通知設定に応じてチャンネルを調整します
   * @param request: {CreateNotificationRequest} 通知の作成リクエスト
   * @param request.userId: {string} ユーザーID
   * @param request.type: {NotificationType} 通知タイプ
   * @param request.priority: {NotificationPriority} 通知優先度
   * @param request.title: {string} 通知タイトル
   * @param request.message: {string} 通知メッセージ
   * @param request.data: {NotificationData} 通知データ
   * @param request.channels: {NotificationChannel[]} 通知チャンネル
   * @param request.scheduledAt: {Date} 通知スケジュール時間
   * @returns {Promise<Notification>} 作成された通知
   */
  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    // ユーザーの通知設定を確認
    const preferences = await this.getPreferencesDomain(request.userId);

    // 通知設定に応じてチャンネルを調整
    const enabledChannels = this.getEnabledChannels(request.channels, preferences);

    const notification = Notification.create({
      ...request,
      channels: enabledChannels,
    });

    // 通知の作成
    const savedNotification = await this.notificationRepository.create(notification);

    // リアルタイム通知の送信
    if (this.shouldSendImmediately(savedNotification)) {
      // リアルタイム通知の送信
      await this.sendNotification(savedNotification);
    }



    return savedNotification;
  }

  async createBatchNotifications(userId: string, requests: CreateNotificationRequest[]): Promise<Notification[]> {
    const preferences = await this.getPreferencesDomain(userId);

    const notifications = requests.map(request => {
      const enabledChannels = this.getEnabledChannels(request.channels, preferences);
      return Notification.create({
        ...request,
        channels: enabledChannels,
      });
    });

    const savedNotifications = await this.notificationRepository.createBatch(notifications);



    return savedNotifications;
  }

  /**
   * 通知の送信
   * 通知の送信は各チャンネルに送信します
   */
  async sendNotification(notification: Notification): Promise<void> {
    // 各チャンネルに送信
    const sendPromises = notification.channels.map(async (channel) => {
      try {
        switch (channel.getValue()) {
          case NotificationChannel.PUSH: // デスクトップ通知
            await this.sendPushNotification(notification);
            break;
          case NotificationChannel.IN_APP: // アプリ内通知
            // アプリ内通知は既に作成済み
            break;
          case NotificationChannel.EMAIL: // メール通知
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

  /**
   * スケジュール済み通知の送信
   * 通知の送信はsendNotificationを使用します
   */
  async sendScheduledNotifications(): Promise<void> {
    // スケジュール済み通知の取得
    const scheduledNotifications = await this.notificationRepository.findScheduledNotifications(new Date());

    for (const notification of scheduledNotifications) {
      // 通知の送信
      await this.sendNotification(notification);
    }
  }

  /**
   * 通知の取得
   */
  async getNotifications(options: GetNotificationsOptions): Promise<NotificationListResultPlain> {
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

    const result = await this.notificationRepository.findByFilter(filter, listOptions);

    return {
      notifications: result.data.map(notification => this.convertNotificationToPlain(notification)),
      totalCount: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async getNotificationById(id: number): Promise<NotificationPlain | null> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      return null;
    }
    return this.convertNotificationToPlain(notification);
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

  /**
   * 通知設定の取得
   */
  async getPreferences(userId: string): Promise<NotificationPreferencePlain> {
    const preferences = await this.getPreferencesDomain(userId);
    return this.convertToResult(preferences);
  }

  /**
   * 通知設定の取得（内部用: ドメインモデルを返す）
   */
  private async getPreferencesDomain(userId: string): Promise<NotificationPreference> {
    let preferences = await this.notificationRepository.findPreferenceByUserId(userId);

    if (!preferences) {
      // 存在しない場合はデフォルト設定を作成
      preferences = NotificationPreference.createDefault(userId);
      preferences = await this.notificationRepository.savePreference(preferences);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreference>
  ): Promise<NotificationPreferencePlain> {
    const currentPreferences = await this.getPreferencesDomain(userId);
    const updatedPreferences = currentPreferences.update(updates);

    const savedPreferences = await this.notificationRepository.updatePreference(updatedPreferences);

    // ドメインモデルをプレーンオブジェクトに変換して返却
    const plainObject = this.convertToResult(savedPreferences);

    return plainObject;
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


  /**
   * 古い通知のクリーンアップ
   * 古い通知のクリーンアップは30日以上古い既読の通知を削除します
   */
  async cleanupOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.notificationRepository.deleteOldNotifications(thirtyDaysAgo);
  }

  /**
   * 通知キューの処理
   * 通知キューの処理は予定された通知の送信と古い通知のクリーンアップを行います
   */
  async processNotificationQueue(): Promise<void> {
    // 予定された通知の送信
    await this.sendScheduledNotifications();

    // 古い通知のクリーンアップ
    await this.cleanupOldNotifications();
  }

  /**
   * 通知の有効なチャンネルを取得
   * @param requestedChannels {NotificationChannel[]} 要求されたチャンネル
   * @param preferences {NotificationPreference} 通知設定
   * @returns {NotificationChannel[]} 有効なチャンネル
   * @description 要求されたチャンネルが有効な場合はそのまま返し、有効でない場合は通知設定に応じて有効なチャンネルを返します
   */
  private getEnabledChannels(
    requestedChannels: NotificationChannel[] | undefined,
    preferences: NotificationPreference
  ): NotificationChannel[] {
    const channels = requestedChannels ?? [
      NotificationChannel.PUSH,
      NotificationChannel.IN_APP,
    ];

    const enabledChannels = channels.filter(channel => {
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

  private shouldSendImmediately(notification: Notification): boolean {
    // スケジュール済みの通知は後で送信
    if (notification.isScheduled()) {
      return false;
    }

    // クワイエットアワー機能は廃止

    return true;
  }

  /**
   * 通知設定のドメインモデルをプレーンオブジェクトに変換
   * @param preferences 通知設定のドメインモデル
   * @returns プレーンオブジェクト
   */
  private convertToResult(preferences: NotificationPreference): NotificationPreferencePlain {
    const plainObject = {
      id: preferences.id,
      userId: preferences.userId,
      enablePush: preferences.enablePush,
      enableInApp: preferences.enableInApp,
      enableEmail: preferences.enableEmail,
      taskDeadline: preferences.taskDeadline,
      manhourThreshold: preferences.manhourThreshold,
      scheduleDelay: preferences.scheduleDelay,
      taskAssignment: preferences.taskAssignment,
      projectStatusChange: preferences.projectStatusChange,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };

    // 通常のプレーンオブジェクトとして返す（nullプロトタイプは使用しない）
    return plainObject;
  }

  /**
   * 通知のドメインモデルをプレーンオブジェクトに変換
   * @param notification 通知のドメインモデル
   * @returns プレーンオブジェクト
   */
  private convertNotificationToPlain(notification: Notification): NotificationPlain {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type.getValue(),
      priority: notification.priority.getValue(),
      title: notification.title,
      message: notification.message,
      data: notification.data,
      channels: notification.channels.map(channel => channel.getValue()),
      isRead: notification.isRead,
      isSent: notification.sentAt !== undefined,
      scheduledAt: notification.scheduledAt,
      createdAt: notification.createdAt!,
      updatedAt: notification.updatedAt!,
    };
  }

  private calculateNextSendTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // クワイエットアワー機能は廃止。既定の翌日9時に設定
    tomorrow.setHours(9, 0, 0, 0);
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
    // TODO: メール通知の実装を行う
    console.log('Email notification would be sent:', notification);
  }


}