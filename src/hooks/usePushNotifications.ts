'use client';

import { useState, useEffect, useCallback } from 'react';
import { pushNotificationManager, type PushSubscriptionData } from '@/lib/push-notification';
import { useNotificationPreferences } from './useNotificationPreferences';

interface PushNotificationStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscriptionData | null;
  isServiceWorkerReady: boolean;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    subscription: null,
    isServiceWorkerReady: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { subscribeToPush, unsubscribeFromPush } = useNotificationPreferences();

  // ブラウザサポート状況をチェック
  const checkSupport = useCallback(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setStatus(prev => ({ ...prev, isSupported }));
    return isSupported;
  }, []);

  // 現在の状態を更新
  const updateStatus = useCallback(async () => {
    if (!checkSupport()) return;

    try {
      const permission = pushNotificationManager.getNotificationPermission();
      const subscriptionStatus = await pushNotificationManager.getSubscriptionStatus();
      
      setStatus({
        isSupported: true,
        permission,
        isSubscribed: subscriptionStatus.isSubscribed,
        subscription: subscriptionStatus.subscription,
        isServiceWorkerReady: true, // getSubscriptionStatusが成功すればSWは準備完了
      });
      
      setError(null);
    } catch (err) {
      console.error('Failed to update push notification status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      setStatus(prev => ({
        ...prev,
        permission: pushNotificationManager.getNotificationPermission(),
        isServiceWorkerReady: false,
      }));
    }
  }, [checkSupport]);

  // Service Workerを登録
  const registerServiceWorker = useCallback(async () => {
    if (!status.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    setIsLoading(true);
    setError(null);

    try {
      await pushNotificationManager.registerServiceWorker();
      await updateStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Service Worker registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [status.isSupported, updateStatus]);

  // Push通知に購読
  const subscribe = useCallback(async () => {
    if (!status.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Service Workerが登録されていなければ登録
      if (!status.isServiceWorkerReady) {
        await registerServiceWorker();
      }

      // Push通知に購読
      const subscriptionData = await pushNotificationManager.subscribeToPush();
      
      // サーバーに購読情報を保存
      subscribeToPush(subscriptionData);
      
      await updateStatus();
      
      return subscriptionData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Push subscription failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [status.isSupported, status.isServiceWorkerReady, registerServiceWorker, subscribeToPush, updateStatus]);

  // Push通知から購読解除
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await pushNotificationManager.unsubscribeFromPush();
      
      // サーバーから購読情報を削除
      unsubscribeFromPush();
      
      await updateStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unsubscribe failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [unsubscribeFromPush, updateStatus]);

  // 通知権限を要求
  const requestPermission = useCallback(async () => {
    if (!status.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    setIsLoading(true);
    setError(null);

    try {
      const permission = await pushNotificationManager.requestNotificationPermission();
      await updateStatus();
      return permission;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Permission request failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [status.isSupported, updateStatus]);

  // テスト通知を送信
  const sendTestNotification = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await pushNotificationManager.sendTestNotification();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test notification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期化
  useEffect(() => {
    updateStatus();
  }, [updateStatus]);

  // Service Workerの状態変化を監視
  useEffect(() => {
    if (!status.isSupported) return;

    const handleServiceWorkerUpdate = () => {
      console.log('Service Worker updated');
      updateStatus();
    };

    // Service Workerの更新を監視
    navigator.serviceWorker.addEventListener('controllerchange', handleServiceWorkerUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleServiceWorkerUpdate);
    };
  }, [status.isSupported, updateStatus]);

  // 権限変更の監視（ブラウザによってはサポートされていない）
  useEffect(() => {
    if (!status.isSupported) return;

    // 定期的に権限状態をチェック
    const interval = setInterval(() => {
      const currentPermission = pushNotificationManager.getNotificationPermission();
      if (currentPermission !== status.permission) {
        updateStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status.isSupported, status.permission, updateStatus]);

  // 便利な状態判定
  const canRequestPermission = status.isSupported && status.permission === 'default';
  const canSubscribe = status.isSupported && status.permission === 'granted' && !status.isSubscribed;
  const canUnsubscribe = status.isSupported && status.isSubscribed;
  const canSendTest = status.isSupported && status.permission === 'granted';

  return {
    // 状態
    ...status,
    isLoading,
    error,
    
    // 便利な判定
    canRequestPermission,
    canSubscribe,
    canUnsubscribe,
    canSendTest,
    
    // アクション
    registerServiceWorker,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification,
    updateStatus,
    
    // エラーのクリア
    clearError: useCallback(() => setError(null), []),
  };
}