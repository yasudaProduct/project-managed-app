export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export class PushNotificationManager {
  private static instance: PushNotificationManager;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  private constructor() {}

  public static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager();
    }
    return PushNotificationManager.instance;
  }

  /**
   * Service Workerを登録する
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker is not supported in this browser');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('Service Worker registered successfully:', this.registration);

      // Service Workerの更新をチェック
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New Service Worker installed, reload required');
              // ユーザーに更新を通知するロジック
              this.notifyUpdate();
            }
          });
        }
      });

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Push通知の許可を要求し、購読を開始する
   */
  async subscribeToPush(): Promise<PushSubscriptionData> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    // 通知の許可を要求
    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // VAPID公開キーの確認
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      throw new Error('VAPID public key is not configured');
    }

    try {
      // 既存の購読があるかチェック
      let subscription = await this.registration!.pushManager.getSubscription();
      
      if (!subscription) {
        // 新しい購読を作成
        subscription = await this.registration!.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      this.subscription = subscription;

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        },
        userAgent: navigator.userAgent
      };

      // サーバーに購読情報を送信
      await this.sendSubscriptionToServer(subscriptionData);

      console.log('Push subscription successful:', subscriptionData);
      return subscriptionData;

    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  /**
   * Push通知の購読を解除する
   */
  async unsubscribeFromPush(): Promise<void> {
    if (!this.registration) {
      console.log('No service worker registration found');
      return;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      
      if (subscription) {
        const success = await subscription.unsubscribe();
        if (success) {
          console.log('Push subscription cancelled successfully');
          this.subscription = null;
          
          // サーバーに購読解除を通知
          await this.removeSubscriptionFromServer();
        } else {
          throw new Error('Failed to unsubscribe from push');
        }
      } else {
        console.log('No push subscription found');
      }
    } catch (error) {
      console.error('Unsubscribe from push failed:', error);
      throw error;
    }
  }

  /**
   * 現在の購読状態を取得
   */
  async getSubscriptionStatus(): Promise<{
    isSubscribed: boolean;
    subscription: PushSubscriptionData | null;
    permission: NotificationPermission;
  }> {
    const permission = this.getNotificationPermission();
    
    if (!this.registration) {
      return {
        isSubscribed: false,
        subscription: null,
        permission
      };
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      
      if (subscription) {
        const subscriptionData: PushSubscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
          },
          userAgent: navigator.userAgent
        };

        return {
          isSubscribed: true,
          subscription: subscriptionData,
          permission
        };
      }

      return {
        isSubscribed: false,
        subscription: null,
        permission
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return {
        isSubscribed: false,
        subscription: null,
        permission
      };
    }
  }

  /**
   * 通知権限を要求
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported in this browser');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permission has been denied by the user');
    }

    // 許可を要求
    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * 現在の通知権限を取得
   */
  getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * テスト通知を送信
   */
  async sendTestNotification(): Promise<void> {
    const permission = await this.requestNotificationPermission();
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // ローカル通知でテスト
    const notification = new Notification('テスト通知', {
      body: 'プッシュ通知が正常に動作しています！',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'test-notification'
    });

    notification.onclick = () => {
      console.log('Test notification clicked');
      notification.close();
      window.focus();
    };

    // 5秒後に自動で閉じる
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  /**
   * Service Workerにメッセージを送信
   */
  async postMessage(message: any): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker is not registered');
    }

    if (this.registration.active) {
      this.registration.active.postMessage(message);
    }
  }

  // プライベートメソッド

  private async sendSubscriptionToServer(subscription: PushSubscriptionData): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save subscription: ${error}`);
      }

      console.log('Subscription saved successfully');
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to remove subscription: ${error}`);
      }

      console.log('Subscription removed successfully');
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      throw error;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private notifyUpdate(): void {
    // Service Workerの更新をユーザーに通知
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('アップデート利用可能', {
        body: 'アプリケーションを更新してください。',
        icon: '/icon-192x192.png',
        tag: 'app-update',
        requireInteraction: true,
        actions: [
          {
            action: 'update',
            title: '更新する'
          },
          {
            action: 'later',
            title: '後で'
          }
        ]
      });

      notification.onclick = () => {
        window.location.reload();
      };
    }
  }
}

// シングルトンインスタンスをエクスポート
export const pushNotificationManager = PushNotificationManager.getInstance();