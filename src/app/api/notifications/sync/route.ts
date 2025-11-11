import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserIdOrThrow } from '@/lib/get-current-user-id';
import { SYMBOL } from '@/types/symbol';

const notificationService = container.get<INotificationService>(SYMBOL.INotificationService);

/**
 * POST /api/notifications/sync - バックグラウンド同期
 * Service Workerから呼び出され、オフライン時に蓄積されたデータを同期する
 *
 * 現在は基本的な同期処理のみ。将来的にIndexedDBに保存された
 * 未送信データを処理する想定。
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOrThrow();

    // リクエストボディの取得（オプショナル）
    let syncData = null;
    try {
      const body = await request.json();
      syncData = body;
    } catch {
      // ボディがない場合は無視
    }

    console.log('[Background Sync]', {
      userId,
      timestamp: new Date().toISOString(),
      syncData,
    });

    // TODO: 実際の同期処理を実装
    // 例:
    // - 未送信の既読マークを処理
    // - オフライン時のアクションを処理
    // - ローカルストレージの未同期データを取得して処理

    // 現在の未読通知数を取得して返す（同期状態の確認用）
    const unreadCount = await notificationService.getUnreadCount(userId);

    return NextResponse.json({
      success: true,
      message: 'Background sync completed',
      data: {
        unreadCount,
        syncedAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Background sync failed:', error);

    return NextResponse.json(
      {
        error: 'Background sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/sync - 同期状態の取得
 * Service Workerから同期が必要かどうかを確認する
 */
export async function GET() {
  try {
    const userId = await getCurrentUserIdOrThrow();

    // 最新の通知データを取得
    const notifications = await notificationService.getNotifications({
      userId,
      page: 1,
      limit: 10,
      unreadOnly: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        unreadCount: notifications.totalCount,
        hasUnread: notifications.totalCount > 0,
        lastSyncAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Failed to get sync status:', error);

    return NextResponse.json(
      {
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
