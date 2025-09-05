'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActionState } from 'react';
import {
  updateNotificationPreferences,
  getNotificationPreferences,
  savePushSubscription,
  removePushSubscription,
  type NotificationActionResult
} from '@/app/actions/notification-actions';

export interface NotificationPreferences {
  id?: number;
  userId: string;
  enablePush: boolean;
  enableInApp: boolean;
  enableEmail: boolean;
  taskDeadline: {
    days: number[];
  };
  manhourThreshold: {
    percentages: number[];
  };
  scheduleDelay: boolean;
  taskAssignment: boolean;
  projectStatusChange: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 通知設定の取得
 * 通知設定の取得はユーザーの通知設定を取得します
 * 通知設定が存在しない場合はデフォルト設定を作成します
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const queryKey = ['notification-preferences'];

  // 設定の取得
  const { data: preferences, isLoading, error } = useQuery<NotificationPreferences>({
    queryKey,
    queryFn: async () => {
      const result = await getNotificationPreferences();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get preferences');
      }
    },
    staleTime: 5 * 60 * 1000, // 5分間はフレッシュとみなす
  });

  // Server Actions
  /**
   * 通知設定の更新
   * 通知設定の更新はupdateNotificationPreferencesを使用します
   */
  const [updateState, updateAction] = useActionState(
    async (prevState: NotificationActionResult | null, formData: FormData) => {
      const result = await updateNotificationPreferences(prevState, formData);

      // 成功時はキャッシュを更新
      if (result.success && result.data) {
        queryClient.setQueryData(queryKey, result.data);
      }

      return result;
    },
    null
  );

  const [pushSubscriptionState, pushSubscriptionAction] = useActionState(
    savePushSubscription,
    null
  );

  const [pushUnsubscriptionState, pushUnsubscriptionAction] = useActionState(
    removePushSubscription,
    null
  );

  // 設定更新のヘルパー関数
  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    const formData = new FormData();

    // 現在の設定をベースに更新
    const currentPrefs = preferences || {
      enablePush: true,
      enableInApp: true,
      enableEmail: false,
      taskDeadline: { days: [3, 1, 0] },
      manhourThreshold: { percentages: [80, 100, 120] },
      scheduleDelay: true,
      taskAssignment: true,
      projectStatusChange: true,
    };

    const newPrefs = { ...currentPrefs, ...updates };

    // FormDataに設定
    formData.set('enablePush', newPrefs.enablePush.toString());
    formData.set('enableInApp', newPrefs.enableInApp.toString());
    formData.set('enableEmail', newPrefs.enableEmail.toString());
    formData.set('taskDeadline', JSON.stringify(newPrefs.taskDeadline));
    formData.set('manhourThreshold', JSON.stringify(newPrefs.manhourThreshold));
    formData.set('scheduleDelay', newPrefs.scheduleDelay.toString());
    formData.set('taskAssignment', newPrefs.taskAssignment.toString());
    formData.set('projectStatusChange', newPrefs.projectStatusChange.toString());

    if (newPrefs.quietHoursStart !== undefined) {
      formData.set('quietHoursStart', newPrefs.quietHoursStart.toString());
    }
    if (newPrefs.quietHoursEnd !== undefined) {
      formData.set('quietHoursEnd', newPrefs.quietHoursEnd.toString());
    }

    updateAction(formData);
  }, [preferences, updateAction]);

  // 個別設定の更新関数
  const togglePushNotifications = useCallback((enabled: boolean) => {
    updatePreferences({ enablePush: enabled });
  }, [updatePreferences]);

  const toggleInAppNotifications = useCallback((enabled: boolean) => {
    updatePreferences({ enableInApp: enabled });
  }, [updatePreferences]);

  const toggleEmailNotifications = useCallback((enabled: boolean) => {
    updatePreferences({ enableEmail: enabled });
  }, [updatePreferences]);

  const updateTaskDeadlineDays = useCallback((days: number[]) => {
    updatePreferences({ taskDeadline: { days } });
  }, [updatePreferences]);

  const updateManhourThresholds = useCallback((percentages: number[]) => {
    updatePreferences({ manhourThreshold: { percentages } });
  }, [updatePreferences]);

  const toggleScheduleDelayNotifications = useCallback((enabled: boolean) => {
    updatePreferences({ scheduleDelay: enabled });
  }, [updatePreferences]);

  const toggleTaskAssignmentNotifications = useCallback((enabled: boolean) => {
    updatePreferences({ taskAssignment: enabled });
  }, [updatePreferences]);

  const toggleProjectStatusChangeNotifications = useCallback((enabled: boolean) => {
    updatePreferences({ projectStatusChange: enabled });
  }, [updatePreferences]);

  const setQuietHours = useCallback((start?: number, end?: number) => {
    updatePreferences({
      quietHoursStart: start,
      quietHoursEnd: end
    });
  }, [updatePreferences]);

  // Push通知購読管理
  const subscribeToPush = useCallback((subscriptionData: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }) => {
    pushSubscriptionAction(subscriptionData);
  }, [pushSubscriptionAction]);

  const unsubscribeFromPush = useCallback(() => {
    pushUnsubscriptionAction();
  }, [pushUnsubscriptionAction]);

  // 設定のリセット
  const resetToDefaults = useCallback(() => {
    updatePreferences({
      enablePush: true,
      enableInApp: true,
      enableEmail: false,
      taskDeadline: { days: [3, 1, 0] },
      manhourThreshold: { percentages: [80, 100, 120] },
      scheduleDelay: true,
      taskAssignment: true,
      projectStatusChange: true,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
    });
  }, [updatePreferences]);

  // バリデーション関数
  const validateQuietHours = useCallback((start?: number, end?: number) => {
    if ((start === undefined) !== (end === undefined)) {
      return false; // 片方だけが設定されているのは無効
    }

    if (start !== undefined && end !== undefined) {
      return start >= 0 && start <= 23 && end >= 0 && end <= 23;
    }

    return true;
  }, []);

  const isInQuietHours = useCallback((time: Date = new Date()) => {
    if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
      return false;
    }

    const currentHour = time.getHours();
    const startHour = preferences.quietHoursStart;
    const endHour = preferences.quietHoursEnd;

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }, [preferences]);

  // 手動更新
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient]);

  return {
    // データ
    preferences,

    // 状態
    isLoading,
    error,

    // 更新アクション
    updatePreferences,
    togglePushNotifications,
    toggleInAppNotifications,
    toggleEmailNotifications,
    updateTaskDeadlineDays,
    updateManhourThresholds,
    toggleScheduleDelayNotifications,
    toggleTaskAssignmentNotifications,
    toggleProjectStatusChangeNotifications,
    setQuietHours,
    resetToDefaults,

    // Push通知管理
    subscribeToPush,
    unsubscribeFromPush,

    // アクション状態
    updateState,
    pushSubscriptionState,
    pushUnsubscriptionState,

    // ユーティリティ
    validateQuietHours,
    isInQuietHours,
    refresh,
  };
}