import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId } from '@/lib/auth';

const notificationService = container.get<INotificationService>('NotificationService');

/**
 * GET /api/notifications - 通知一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    
    const page = Number(searchParams.get('page')) || 1;
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100); // 最大100件
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    
    const options = {
      userId,
      page,
      limit,
      unreadOnly,
      type: type || undefined,
      priority: priority || undefined,
    };

    const notifications = await notificationService.getNotifications(options);
    
    return NextResponse.json(notifications, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications - 新しい通知作成（管理者用）
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    
    // 管理者権限のチェック（実装は省略、必要に応じて追加）
    // const isAdmin = await checkAdminPermission(userId);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    // }

    const notification = await notificationService.createNotification({
      userId: body.targetUserId || userId,
      type: body.type,
      priority: body.priority || 'MEDIUM',
      title: body.title,
      message: body.message,
      data: body.data,
      channels: body.channels,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: notification
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create notification:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}