import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserIdOrThrow } from '@/lib/get-current-user-id';
import { SYMBOL } from '@/types/symbol';

const notificationService = container.get<INotificationService>(SYMBOL.INotificationService);

/**
 * POST /api/notifications/mark-read - 通知を既読にマークする
 * Service Workerから呼び出されることを想定
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const body = await request.json();

    // notificationIds のバリデーション
    const notificationIds = body.notificationIds;
    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds must be an array' },
        { status: 400 }
      );
    }

    if (notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notificationIds cannot be empty' },
        { status: 400 }
      );
    }

    // 既読処理を実行
    await notificationService.markAsRead(userId, notificationIds);

    return NextResponse.json({
      success: true,
      message: `${notificationIds.length} notification(s) marked as read`
    });

  } catch (error) {
    console.error('Failed to mark notifications as read:', error);

    return NextResponse.json(
      {
        error: 'Failed to mark notifications as read',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
