import { NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserIdOrThrow } from '@/lib/get-current-user-id';
import { SYMBOL } from '@/types/symbol';

const notificationService = container.get<INotificationService>(SYMBOL.INotificationService);

/**
 * GET /api/notifications/count - 未読通知数取得
 */
export async function GET() {
  try {
    const userId = await getCurrentUserIdOrThrow();

    const count = await notificationService.getUnreadCount(userId);

    return NextResponse.json({
      count,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30', // 30秒キャッシュ
      },
    });
  } catch (error) {
    console.error('Failed to get unread count:', error);

    return NextResponse.json(
      {
        error: 'Failed to get unread count',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}