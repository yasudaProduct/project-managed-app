import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserIdOrThrow } from '@/lib/get-current-user-id';

const notificationService = container.get<INotificationService>('NotificationService');

/**
 * POST /api/notifications/subscribe - Push通知購読登録
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const subscription = await request.json();

    // 購読データのバリデーション
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json(
        { error: 'Missing required keys in subscription' },
        { status: 400 }
      );
    }

    await notificationService.savePushSubscription(userId, {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent: subscription.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved successfully'
    });

  } catch (error) {
    console.error('Failed to save push subscription:', error);

    return NextResponse.json(
      {
        error: 'Failed to save push subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/subscribe - Push通知購読解除
 */
export async function DELETE() {
  try {
    const userId = await getCurrentUserIdOrThrow();

    await notificationService.removePushSubscription(userId);

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully'
    });

  } catch (error) {
    console.error('Failed to remove push subscription:', error);

    return NextResponse.json(
      {
        error: 'Failed to remove push subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/subscribe - Push通知購読状態取得
 */
export async function GET() {
  try {
    await getCurrentUserIdOrThrow();

    // 購読状態の確認ロジック（実装省略）
    // 実際には購読データベースから状態を取得する

    return NextResponse.json({
      isSubscribed: true, // 実装時は実際の状態を返す
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5分キャッシュ
      },
    });

  } catch (error) {
    console.error('Failed to get subscription status:', error);

    return NextResponse.json(
      {
        error: 'Failed to get subscription status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}