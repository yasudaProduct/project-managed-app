'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId, getCurrentUserIdOrThrow } from '@/lib/get-current-user-id';

const notificationService = container.get<INotificationService>('NotificationService');

// バリデーションスキーマ
const MarkAsReadSchema = z.object({
  notificationIds: z.array(z.string()),
});

const DeleteNotificationSchema = z.object({
  notificationId: z.string(),
});

const PreferencesSchema = z.object({
  enablePush: z.boolean().default(true),
  enableInApp: z.boolean().default(true),
  enableEmail: z.boolean().default(false),
  taskDeadline: z.object({
    days: z.array(z.number()).default([3, 1, 0]),
  }),
  manhourThreshold: z.object({
    percentages: z.array(z.number()).default([80, 100, 120]),
  }),
  scheduleDelay: z.boolean().default(true),
  taskAssignment: z.boolean().default(true),
  projectStatusChange: z.boolean().default(true),
  quietHoursStart: z.number().min(0).max(23).nullable().optional(),
  quietHoursEnd: z.number().min(0).max(23).nullable().optional(),
});

// 型定義
export type NotificationActionResult = {
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};

/**
 * 通知を既読にマークする
 */
export async function markNotificationAsRead(
  prevState: NotificationActionResult | null,
  formDataOrIds: FormData | { notificationIds: string[] }
): Promise<NotificationActionResult> {
  try {
    const userId = await getCurrentUserIdOrThrow();

    let data;
    if (formDataOrIds instanceof FormData) {
      const formData = formDataOrIds;
      data = MarkAsReadSchema.parse({
        notificationIds: formData.getAll('notificationId') as string[],
      });
    } else {
      data = MarkAsReadSchema.parse(formDataOrIds);
    }

    await notificationService.markAsRead(userId, data.notificationIds);

    // キャッシュを無効化
    revalidateTag('notifications');
    revalidateTag(`notifications-${userId}`);

    return {
      success: true,
      data: { markedCount: data.notificationIds.length }
    };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark notification as read'
    };
  }
}

/**
 * 全ての通知を既読にマークする
 */
export async function markAllAsRead(
  prevState?: NotificationActionResult | null
): Promise<NotificationActionResult> {
  try {
    const userId = await getCurrentUserIdOrThrow();

    await notificationService.markAllAsRead(userId);

    // キャッシュを無効化
    revalidateTag('notifications');
    revalidateTag(`notifications-${userId}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark all notifications as read'
    };
  }
}

/**
 * 通知を削除する
 */
export async function deleteNotification(
  prevState: NotificationActionResult | null,
  formDataOrId: FormData | { notificationId: string }
): Promise<NotificationActionResult> {
  try {
    const userId = await getCurrentUserIdOrThrow();

    let data;
    if (formDataOrId instanceof FormData) {
      const formData = formDataOrId;
      data = DeleteNotificationSchema.parse({
        notificationId: formData.get('notificationId') as string,
      });
    } else {
      data = DeleteNotificationSchema.parse(formDataOrId);
    }

    await notificationService.deleteNotification(userId, data.notificationId);

    // キャッシュを無効化
    revalidateTag('notifications');
    revalidateTag(`notifications-${userId}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete notification'
    };
  }
}

/**
 * 通知設定を更新する
 */
export async function updateNotificationPreferences(
  prevState: NotificationActionResult | null,
  formData: FormData
): Promise<NotificationActionResult> {
  console.log('updateNotificationPreferences');
  try {
    const userId = await getCurrentUserIdOrThrow();

    // FormDataから設定データを解析
    const rawData = {
      enablePush: formData.get('enablePush') === 'true',
      enableInApp: formData.get('enableInApp') === 'true',
      enableEmail: formData.get('enableEmail') === 'true',
      taskDeadline: JSON.parse(formData.get('taskDeadline') as string || '{"days":[3,1,0]}'),
      manhourThreshold: JSON.parse(formData.get('manhourThreshold') as string || '{"percentages":[80,100,120]}'),
      scheduleDelay: formData.get('scheduleDelay') === 'true',
      taskAssignment: formData.get('taskAssignment') === 'true',
      projectStatusChange: formData.get('projectStatusChange') === 'true',
      quietHoursStart: formData.get('quietHoursStart') ? Number(formData.get('quietHoursStart')) : null,
      quietHoursEnd: formData.get('quietHoursEnd') ? Number(formData.get('quietHoursEnd')) : null,
    };

    const validatedData = PreferencesSchema.parse(rawData);
    const payload = {
      ...validatedData,
      quietHoursStart: validatedData.quietHoursStart ?? undefined,
      quietHoursEnd: validatedData.quietHoursEnd ?? undefined,
    };

    const updatedPreferences = await notificationService.updatePreferences(userId, payload);

    // キャッシュを無効化
    revalidateTag('notification-preferences');
    revalidateTag(`notification-preferences-${userId}`);

    return {
      success: true,
      data: updatedPreferences
    };
  } catch (error) {
    console.error('Failed to update preferences:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update notification preferences'
    };
  }
}

/**
 * テスト通知を送信する
 */
export async function sendTestNotification(
  prevState?: NotificationActionResult | null
): Promise<NotificationActionResult> {
  try {
    const userId = await getCurrentUserIdOrThrow();

    await notificationService.sendTestNotification(userId);

    return {
      success: true,
      data: { message: 'Test notification sent successfully' }
    };
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test notification'
    };
  }
}

/**
 * 通知の未読数を取得する
 */
export async function getUnreadCount(): Promise<NotificationActionResult> {
  try {
    const userId = await getCurrentUserIdOrThrow();

    const count = await notificationService.getUnreadCount(userId);

    return {
      success: true,
      data: { count }
    };
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get unread count'
    };
  }
}

/**
 * 通知設定を取得する
 */
export async function getNotificationPreferences(): Promise<NotificationActionResult> {
  console.log('getNotificationPreferences');
  try {
    const userId = await getCurrentUserIdOrThrow();

    const preferences = await notificationService.getPreferences(userId);
    console.log('preferences', preferences);

    return {
      success: true,
      data: preferences
    };
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notification preferences'
    };
  }
}

/**
 * Push通知の購読情報を保存する
 */
export async function savePushSubscription(
  prevState: NotificationActionResult | null,
  subscriptionData: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    userAgent?: string;
  }
): Promise<NotificationActionResult> {
  try {
    const userId = await getCurrentUserIdOrThrow();

    await notificationService.savePushSubscription(userId, subscriptionData);

    return {
      success: true,
      data: { message: 'Push subscription saved successfully' }
    };
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save push subscription'
    };
  }
}

/**
 * Push通知の購読を解除する
 */
export async function removePushSubscription(
  prevState?: NotificationActionResult | null
): Promise<NotificationActionResult> {
  try {
    const userId = await getCurrentUserIdOrThrow();

    await notificationService.removePushSubscription(userId);

    return {
      success: true,
      data: { message: 'Push subscription removed successfully' }
    };
  } catch (error) {
    console.error('Failed to remove push subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove push subscription'
    };
  }
}