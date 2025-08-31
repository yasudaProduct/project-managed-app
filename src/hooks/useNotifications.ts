'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActionState } from 'react';
import {
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  sendTestNotification,
} from '@/app/actions/notification-actions';

export interface NotificationData {
  id: number;
  type: string;
  priority: string;
  title: string;
  message: string;
  data?: unknown;
  channels: string[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationListResult {
  data: NotificationData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UseNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
  priority?: string;
  enableRealtime?: boolean;
  autoRefresh?: boolean;
}

/**
 * 通知システムのフック
 * @param options オプション
 * @returns 通知システムのフック
 * @remarks 
 * - enableRealtime: リアルタイム更新を有効にするかどうか
 * - autoRefresh: 自動更新を有効にするかどうか
 * - page: ページ番号
 * - limit: ページあたりの通知数
 * - unreadOnly: 未読のみを取得するかどうか
 * - type: 通知の種類
 * - priority: 通知の優先度
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type,
    priority,
    autoRefresh = true
  } = options;

  const queryClient = useQueryClient();

  // クエリキーの生成
  const queryKey = ['notifications', { page, limit, unreadOnly, type, priority }];
  const countQueryKey = ['notifications', 'count'];

  // 通知一覧の取得
  const {
    data: notifications,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery<NotificationListResult>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        unreadOnly: unreadOnly.toString(),
      });

      if (type) params.append('type', type);
      if (priority) params.append('priority', priority);

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 30000, // 30秒間はフレッシュとみなす
    refetchInterval: autoRefresh ? 60000 : false, // 1分ごとに自動更新
  });

  // 未読数の取得
  const { data: unreadCountData } = useQuery<{ count: number; timestamp: string }>({
    queryKey: countQueryKey,
    queryFn: async () => {
      const response = await fetch('/api/notifications/count');
      if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 30000,
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Server Actions
  const [markAsReadState, markAsReadAction] = useActionState(
    markNotificationAsRead,
    null
  );
  const [markAllAsReadState, markAllAsReadAction] = useActionState(
    markAllAsRead,
    null
  );
  const [deleteState, deleteAction] = useActionState(
    deleteNotification,
    null
  );
  const [testNotificationState, testNotificationAction] = useActionState(
    sendTestNotification,
    null
  );



  // アクション完了後のキャッシュ更新
  useEffect(() => {
    if (markAsReadState?.success || deleteState?.success || markAllAsReadState?.success) {
      // 通知一覧とカウントを更新
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [
    markAsReadState?.success,
    deleteState?.success,
    markAllAsReadState?.success,
    queryClient
  ]);

  // 個別通知の既読処理
  const markAsRead = useCallback((notificationIds: string[]) => {
    markAsReadAction({ notificationIds });
  }, [markAsReadAction]);

  // 単一通知の既読処理
  const markSingleAsRead = useCallback((notificationId: string) => {
    markAsRead([notificationId]);
  }, [markAsRead]);

  // 通知削除
  const deleteNotificationById = useCallback((notificationId: string) => {
    deleteAction({ notificationId });
  }, [deleteAction]);

  // 全件既読
  const markAllNotificationsAsRead = useCallback(() => {
    markAllAsReadAction();
  }, [markAllAsReadAction]);

  // テスト通知送信
  const sendTestNotificationAction = useCallback(() => {
    testNotificationAction();
  }, [testNotificationAction]);

  // 手動更新
  const refresh = useCallback(() => {
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      refetch(),
    ]);
  }, [queryClient, refetch]);

  // 通知の優先度に基づくアイコン取得
  const getPriorityIcon = useCallback((priority: string) => {
    switch (priority) {
      case 'URGENT': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '📢';
      case 'LOW': return 'ℹ️';
      default: return '📢';
    }
  }, []);

  // 通知タイプに基づくアイコン取得
  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'TASK_DEADLINE_WARNING':
      case 'TASK_DEADLINE_OVERDUE':
        return '⏰';
      case 'TASK_MANHOUR_WARNING':
      case 'TASK_MANHOUR_EXCEEDED':
        return '📊';
      case 'TASK_ASSIGNED':
      case 'TASK_UPDATED':
        return '📋';
      case 'SCHEDULE_DELAY':
        return '⚠️';
      case 'PROJECT_STATUS_CHANGED':
        return '🚀';
      default:
        return '📢';
    }
  }, []);

  return {
    // データ
    notifications: notifications?.data || [],
    unreadCount: unreadCountData?.count || 0,
    totalPages: notifications?.totalPages || 0,
    hasNext: notifications?.hasNext || false,
    hasPrev: notifications?.hasPrev || false,
    total: notifications?.total || 0,

    // 状態
    isLoading,
    isFetching,
    error,

    // アクション関数
    markAsRead,
    markSingleAsRead,
    markAllNotificationsAsRead,
    deleteNotificationById,
    sendTestNotificationAction,
    refresh,
    refetch,

    // アクション状態
    markAsReadState,
    markAllAsReadState,
    deleteState,
    testNotificationState,

    // ユーティリティ関数
    getPriorityIcon,
    getTypeIcon,
  };
}