import { injectable, inject } from 'inversify';
import webpush from 'web-push';
import { Notification } from '@/domains/notification/notification';
import type { INotificationRepository, PushSubscriptionData } from '@/applications/notification/INotificationRepository';

export interface PushPayload {
  title: string;
  message: string;
  type: string;
  priority: string;
  id?: number;
  actionUrl?: string;
  image?: string;
  tag?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

@injectable()
export class PushNotificationService {
  constructor(
    @inject('NotificationRepository') private notificationRepository: INotificationRepository
  ) {
    this.initializeWebPush();
  }

  private initializeWebPush(): void {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured. Push notifications will not work.');
      return;
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    console.log('WebPush initialized with VAPID keys');
  }

  /**
   * 指定ユーザーにPush通知を送信
   */
  async sendToUser(userId: string, notification: Notification): Promise<void> {
    try {
      const subscriptions = await this.notificationRepository.findPushSubscriptionsByUserId(userId);

      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user: ${userId}`);
        return;
      }

      const payload = this.createPayload(notification);
      const promises = subscriptions.map(subscription =>
        this.sendToSubscription(subscription, payload)
      );

      await Promise.allSettled(promises);
      console.log(`Push notification sent to ${subscriptions.length} subscriptions for user: ${userId}`);
    } catch (error) {
      console.error(`Failed to send push notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 複数ユーザーにPush通知を一括送信
   */
  async sendToMultipleUsers(userIds: string[], notification: Notification): Promise<void> {
    const promises = userIds.map(userId => this.sendToUser(userId, notification));
    await Promise.allSettled(promises);
  }

  /**
   * 全ユーザーにPush通知を送信（管理者用）
   */
  async sendToAllUsers(notification: Notification): Promise<void> {
    try {
      const allSubscriptions = await this.notificationRepository.findActivePushSubscriptions();

      if (allSubscriptions.length === 0) {
        console.log('No active push subscriptions found');
        return;
      }

      const payload = this.createPayload(notification);
      const promises = allSubscriptions.map(({ subscription }) =>
        this.sendToSubscription(subscription, payload)
      );

      const results = await Promise.allSettled(promises);
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Broadcast push notification sent: ${succeeded} succeeded, ${failed} failed`);
    } catch (error) {
      console.error('Failed to send broadcast push notification:', error);
      throw error;
    }
  }

  /**
   * 個別の購読にPush通知を送信
   */
  private async sendToSubscription(subscription: PushSubscriptionData, payload: PushPayload): Promise<void> {
    try {
      const webpushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
        },
      };

      const options = {
        TTL: 60 * 60 * 24, // 24時間
        urgency: this.getUrgency(payload.priority),
        topic: payload.type,
        headers: {},
      };

      await webpush.sendNotification(
        webpushSubscription,
        JSON.stringify(payload),
        options
      );

      console.log(`Push notification sent successfully to: ${subscription.endpoint.substring(0, 50)}...`);
    } catch (error) {
      await this.handleSendError(error, subscription);
    }
  }

  /**
   * Notificationオブジェクトからペイロードを作成
   */
  private createPayload(notification: Notification): PushPayload {
    return {
      title: notification.title,
      message: notification.message,
      type: notification.type.getValue(),
      priority: notification.priority.getValue(),
      id: notification.id,
      actionUrl: notification.getActionUrl(),
      tag: this.generateTag(notification),
      data: notification.data,
    };
  }

  /**
   * 通知の重要度からWebPushのurgencyを決定
   */
  private getUrgency(priority: string): 'very-low' | 'low' | 'normal' | 'high' {
    switch (priority) {
      case 'URGENT':
        return 'high';
      case 'HIGH':
        return 'normal';
      case 'MEDIUM':
        return 'low';
      case 'LOW':
      default:
        return 'very-low';
    }
  }

  /**
   * 通知のタグを生成（同じタグの通知は置き換わる）
   */
  private generateTag(notification: Notification): string {
    const type = notification.type.getValue();
    const data = notification.data;

    // タスク関連の通知は同じタスクの通知を置き換える
    if (type.startsWith('TASK_') && data?.taskId) {
      return `task-${data.taskId}-${type}`;
    }

    // プロジェクト関連の通知は同じプロジェクトの通知を置き換える
    if (type.startsWith('PROJECT_') && data?.projectId) {
      return `project-${data.projectId}-${type}`;
    }

    // その他はユニークなタグ
    return `notification-${notification.id}`;
  }

  /**
   * 送信エラーのハンドリング
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleSendError(error: any, subscription: PushSubscriptionData): Promise<void> {
    console.error('Push notification send error:', error);

    // 購読が無効になった場合（410 Gone、404 Not Foundなど）
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`Subscription expired or invalid, removing: ${subscription.endpoint}`);

      try {
        // 無効な購読をデータベースから削除
        await this.notificationRepository.removePushSubscription('', subscription.endpoint);
      } catch (removeError) {
        console.error('Failed to remove invalid subscription:', removeError);
      }
    }

    // レート制限の場合
    else if (error.statusCode === 429) {
      const retryAfter = error.headers?.['retry-after'];
      console.warn(`Push service rate limited. Retry after: ${retryAfter} seconds`);

      // TODO: レート制限対応（キューイングなど）
    }

    // その他のエラー
    else {
      console.error(`Push notification failed with status ${error.statusCode}:`, error.body);
    }

    throw error;
  }

  /**
   * Push サービスの利用可能性をチェック
   */
  async isAvailable(): Promise<boolean> {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    return !!(vapidPublicKey && vapidPrivateKey);
  }

  /**
   * Push通知のテスト送信
   */
  async sendTestNotification(userId: string): Promise<void> {
    const testNotification = Notification.create({
      userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: 'PROJECT_STATUS_CHANGED' as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priority: 'LOW' as any,
      title: 'テスト通知',
      message: 'プッシュ通知が正常に動作しています。この通知は自動的に消えます。',
      data: {
        testMode: true,
        timestamp: new Date().toISOString(),
      },
    });

    await this.sendToUser(userId, testNotification);
  }

  /**
   * Push通知の統計情報を取得
   */
  async getStatistics(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    recentSentCount: number;
  }> {
    try {
      const allSubscriptions = await this.notificationRepository.findActivePushSubscriptions();

      return {
        totalSubscriptions: allSubscriptions.length,
        activeSubscriptions: allSubscriptions.length,
        recentSentCount: 0, // TODO: 送信履歴から取得
      };
    } catch (error) {
      console.error('Failed to get push notification statistics:', error);
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        recentSentCount: 0,
      };
    }
  }
}