# 通知システム ハイブリッドアーキテクチャ詳細設計

## 1. アーキテクチャ概要

通知システムにおいて、Server ActionsとAPI Routesを適切に使い分けることで、型安全性とシステム拡張性を両立したハイブリッドアプローチを採用します。

## 2. Server Actions実装詳細

### 2.1 通知操作系Server Actions

```typescript
// src/app/actions/notification-actions.ts
'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId } from '@/lib/auth';

const notificationService = container.get<INotificationService>('NotificationService');

// 通知既読処理
const MarkAsReadSchema = z.object({
  notificationIds: z.array(z.string()),
});

export async function markNotificationAsRead(
  prevState: any,
  formData: FormData | { notificationIds: string[] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    
    let data;
    if (formData instanceof FormData) {
      data = MarkAsReadSchema.parse({
        notificationIds: formData.getAll('notificationId') as string[],
      });
    } else {
      data = MarkAsReadSchema.parse(formData);
    }

    await notificationService.markAsRead(userId, data.notificationIds);
    
    revalidateTag('notifications');
    return { success: true };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

// 通知削除
const DeleteNotificationSchema = z.object({
  notificationId: z.string(),
});

export async function deleteNotification(
  prevState: any,
  formData: FormData | { notificationId: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    
    let data;
    if (formData instanceof FormData) {
      data = DeleteNotificationSchema.parse({
        notificationId: formData.get('notificationId') as string,
      });
    } else {
      data = DeleteNotificationSchema.parse(formData);
    }

    await notificationService.deleteNotification(userId, data.notificationId);
    
    revalidateTag('notifications');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return { success: false, error: 'Failed to delete notification' };
  }
}

// 通知設定更新
const PreferencesSchema = z.object({
  enablePush: z.boolean().default(true),
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
  quietHoursStart: z.number().min(0).max(23).nullable(),
  quietHoursEnd: z.number().min(0).max(23).nullable(),
});

export async function updateNotificationPreferences(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    
    const rawData = {
      enablePush: formData.get('enablePush') === 'true',
      enableEmail: formData.get('enableEmail') === 'true',
      taskDeadline: JSON.parse(formData.get('taskDeadline') as string || '{"days":[3,1,0]}'),
      manhourThreshold: JSON.parse(formData.get('manhourThreshold') as string || '{"percentages":[80,100,120]}'),
      scheduleDelay: formData.get('scheduleDelay') === 'true',
      taskAssignment: formData.get('taskAssignment') === 'true',
      projectStatusChange: formData.get('projectStatusChange') === 'true',
      quietHoursStart: formData.get('quietHoursStart') ? Number(formData.get('quietHoursStart')) : null,
      quietHoursEnd: formData.get('quietHoursEnd') ? Number(formData.get('quietHoursEnd')) : null,
    };

    const data = PreferencesSchema.parse(rawData);
    await notificationService.updatePreferences(userId, data);
    
    revalidateTag('notification-preferences');
    return { success: true };
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return { success: false, error: 'Failed to update notification preferences' };
  }
}

// テスト通知送信
export async function sendTestNotification(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    
    await notificationService.sendTestNotification(userId);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return { success: false, error: 'Failed to send test notification' };
  }
}

// 全件既読処理
export async function markAllAsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    
    await notificationService.markAllAsRead(userId);
    
    revalidateTag('notifications');
    return { success: true };
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    return { success: false, error: 'Failed to mark all notifications as read' };
  }
}
```

### 2.2 Server Components連携

```typescript
// src/app/notifications/page.tsx
import { Suspense } from 'react';
import { getCurrentUserId } from '@/lib/auth';
import { container } from '@/lib/inversify.config';
import { INotificationService } from '@/applications/notification/INotificationService';
import { NotificationList } from '@/components/notification/NotificationList';
import { NotificationSkeleton } from '@/components/notification/NotificationSkeleton';

const notificationService = container.get<INotificationService>('NotificationService');

async function NotificationData({ userId }: { userId: string }) {
  const notifications = await notificationService.getNotifications({
    userId,
    page: 1,
    limit: 20,
    unreadOnly: false,
  });

  return <NotificationList notifications={notifications} />;
}

export default async function NotificationsPage() {
  const userId = await getCurrentUserId();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">通知</h1>
      
      <Suspense fallback={<NotificationSkeleton />}>
        <NotificationData userId={userId} />
      </Suspense>
    </div>
  );
}
```

## 3. API Routes実装詳細

### 3.1 通知データ取得API

```typescript
// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId } from '@/lib/auth';

const notificationService = container.get<INotificationService>('NotificationService');

// GET /api/notifications - 通知一覧取得（ページネーション、フィルタリング対応）
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    
    const notifications = await notificationService.getNotifications({
      userId,
      page,
      limit,
      unreadOnly,
      type: type as any,
      priority: priority as any,
    });
    
    return NextResponse.json(notifications, {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}
```

### 3.2 未読数取得API

```typescript
// src/app/api/notifications/count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId } from '@/lib/auth';

const notificationService = container.get<INotificationService>('NotificationService');

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    const count = await notificationService.getUnreadCount(userId);
    
    return NextResponse.json({ count }, {
      headers: {
        'Cache-Control': 'private, max-age=30', // 30秒キャッシュ
      },
    });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return NextResponse.json(
      { error: 'Failed to get unread count' },
      { status: 500 }
    );
  }
}
```

### 3.3 Push通知購読管理API

```typescript
// src/app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId } from '@/lib/auth';

const notificationService = container.get<INotificationService>('NotificationService');

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const subscription = await request.json();
    
    await notificationService.savePushSubscription(userId, subscription);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    await notificationService.removePushSubscription(userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}
```

### 3.4 Cronジョブエンドポイント

```typescript
// src/app/api/cron/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { NotificationEventDetector } from '@/applications/notification/NotificationEventDetector';

const eventDetector = container.get<NotificationEventDetector>('NotificationEventDetector');

export async function GET(request: NextRequest) {
  try {
    // Cron秘密キーによる認証
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 各種イベント検知を並行実行
    await Promise.allSettled([
      eventDetector.detectTaskDeadlines(),
      eventDetector.detectManhourExceeded(),
      eventDetector.detectScheduleDelays(),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
```

### 3.5 SSE（Server-Sent Events）実装

```typescript
// src/app/api/notifications/stream/route.ts
import { NextRequest } from 'next/server';
import { container } from '@/lib/inversify.config';
import { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId } from '@/lib/auth';

const notificationService = container.get<INotificationService>('NotificationService');

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  
  const encoder = new TextEncoder();
  
  const customReadable = new ReadableStream({
    start(controller) {
      // 初期データ送信
      const data = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(encoder.encode(data));
      
      // 通知の変更を監視（実装は通知サービスに委任）
      const unsubscribe = notificationService.subscribeToUpdates(userId, (notification) => {
        const data = `data: ${JSON.stringify({ 
          type: 'notification',
          payload: notification 
        })}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
      
      // クリーンアップ
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## 4. フロントエンド統合

### 4.1 ハイブリッドフック実装

```typescript
// src/hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActionState } from 'react';
import { markNotificationAsRead, deleteNotification, markAllAsRead } from '@/app/actions/notification-actions';

interface UseNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  enableRealtime?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { page = 1, limit = 20, unreadOnly = false, enableRealtime = true } = options;
  const queryClient = useQueryClient();
  
  // API Routesを使用したデータ取得
  const { data: notifications, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', { page, limit, unreadOnly }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        unreadOnly: unreadOnly.toString(),
      });
      
      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    staleTime: 30000, // 30秒間はフレッシュとみなす
  });
  
  // 未読数取得
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/count');
      if (!response.ok) throw new Error('Failed to fetch unread count');
      const data = await response.json();
      return data.count;
    },
    refetchInterval: 60000, // 1分ごとに更新
  });
  
  // Server Actionsを使用した操作
  const [markAsReadState, markAsReadAction] = useActionState(markNotificationAsRead, { success: false });
  const [deleteState, deleteAction] = useActionState(deleteNotification, { success: false });
  const [markAllAsReadState, markAllAsReadAction] = useActionState(markAllAsRead, { success: false });
  
  // SSE接続でリアルタイム更新
  useEffect(() => {
    if (!enableRealtime) return;
    
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        // 新しい通知を受信したらキャッシュを無効化
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };
    
    return () => {
      eventSource.close();
    };
  }, [queryClient, enableRealtime]);
  
  // アクション完了後のキャッシュ更新
  useEffect(() => {
    if (markAsReadState.success || deleteState.success || markAllAsReadState.success) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [markAsReadState.success, deleteState.success, markAllAsReadState.success, queryClient]);
  
  return {
    notifications: notifications?.data || [],
    unreadCount: unreadCount || 0,
    totalPages: notifications?.totalPages || 0,
    isLoading,
    error,
    refetch,
    // Server Actions
    markAsRead: markAsReadAction,
    deleteNotification: deleteAction,
    markAllAsRead: markAllAsReadAction,
    // States
    markAsReadState,
    deleteState,
    markAllAsReadState,
  };
}
```

### 4.2 通知設定用フック

```typescript
// src/hooks/useNotificationPreferences.ts
import { useQuery } from '@tanstack/react-query';
import { useActionState } from 'react';
import { updateNotificationPreferences } from '@/app/actions/notification-actions';

export function useNotificationPreferences() {
  // Server Componentsから初期データを取得し、必要に応じてAPI Routesで更新
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      // 必要に応じてAPI Routes経由で取得
      // 通常はServer Componentsから初期データを受け取る
      return null;
    },
    enabled: false, // 通常はServer Componentsから初期データを受け取るため無効化
  });
  
  const [updateState, updateAction] = useActionState(updateNotificationPreferences, { success: false });
  
  return {
    preferences,
    isLoading,
    updatePreferences: updateAction,
    updateState,
  };
}
```

## 5. コンポーネント実装例

### 5.1 通知アイテムコンポーネント

```tsx
// src/components/notification/NotificationItem.tsx
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Bell, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    isRead: boolean;
    createdAt: Date;
    data?: any;
  };
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleMarkAsRead = async () => {
    if (notification.isRead) return;
    
    setIsProcessing(true);
    await markAsRead({ notificationIds: [notification.id] });
    setIsProcessing(false);
  };
  
  const handleDelete = async () => {
    setIsProcessing(true);
    await deleteNotification({ notificationId: notification.id });
    setIsProcessing(false);
  };
  
  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'URGENT': return 'border-red-500 bg-red-50';
      case 'HIGH': return 'border-orange-500 bg-orange-50';
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 bg-white';
    }
  };
  
  return (
    <div className={`
      p-4 border-l-4 rounded-lg mb-3 
      ${getPriorityColor()}
      ${!notification.isRead ? 'shadow-md' : 'opacity-75'}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Bell className={`w-5 h-5 mt-1 ${notification.isRead ? 'text-gray-400' : 'text-blue-500'}`} />
          <div className="flex-1">
            <h4 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </h4>
            <p className={`text-sm mt-1 ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
              {notification.message}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {formatDistanceToNow(new Date(notification.createdAt), { 
                addSuffix: true, 
                locale: ja 
              })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAsRead}
              disabled={isProcessing}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isProcessing}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## 6. パフォーマンス最適化

### 6.1 キャッシュ戦略

```typescript
// src/lib/cache-config.ts
export const notificationCacheConfig = {
  // Server Actions結果のキャッシュ
  serverActions: {
    revalidateTags: ['notifications', 'notification-preferences'],
    revalidatePaths: ['/notifications'],
  },
  
  // API Routes応答のキャッシュ
  apiRoutes: {
    notifications: 'private, max-age=30', // 30秒キャッシュ
    count: 'private, max-age=60', // 1分キャッシュ
    preferences: 'private, max-age=300', // 5分キャッシュ
  },
  
  // React Query設定
  reactQuery: {
    staleTime: 30000, // 30秒間はフレッシュ
    cacheTime: 300000, // 5分間キャッシュ保持
    refetchInterval: 60000, // 1分ごとにバックグラウンド更新
  },
};
```

### 6.2 バッチ処理最適化

```typescript
// src/applications/notification/NotificationBatchProcessor.ts
export class NotificationBatchProcessor {
  private queue: NotificationRequest[] = [];
  private processing = false;
  
  async addToQueue(request: NotificationRequest): Promise<void> {
    this.queue.push(request);
    
    if (!this.processing) {
      await this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    try {
      // 同じユーザーの通知をグルーピング
      const groupedByUser = this.groupByUser(this.queue);
      
      // 各ユーザーの通知を並行処理
      await Promise.allSettled(
        Object.entries(groupedByUser).map(([userId, notifications]) =>
          this.processBatchForUser(userId, notifications)
        )
      );
    } finally {
      this.queue = [];
      this.processing = false;
    }
  }
  
  private groupByUser(requests: NotificationRequest[]): Record<string, NotificationRequest[]> {
    return requests.reduce((groups, request) => {
      if (!groups[request.userId]) {
        groups[request.userId] = [];
      }
      groups[request.userId].push(request);
      return groups;
    }, {} as Record<string, NotificationRequest[]>);
  }
  
  private async processBatchForUser(userId: string, notifications: NotificationRequest[]): Promise<void> {
    // 重複通知を除去
    const deduplicated = this.deduplicateNotifications(notifications);
    
    // 優先度でソート
    const sorted = deduplicated.sort((a, b) => this.comparePriority(a.priority, b.priority));
    
    // バッチで作成
    await this.notificationService.createBatchNotifications(userId, sorted);
  }
}
```

このハイブリッドアプローチにより、型安全性を保ちながらシステム間連携も柔軟に対応できる通知システムを構築できます。