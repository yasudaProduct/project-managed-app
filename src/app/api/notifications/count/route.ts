import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId } from '@/lib/auth';

const notificationService = container.get<INotificationService>('NotificationService');

/**
 * GET /api/notifications/count - 未読通知数取得
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
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