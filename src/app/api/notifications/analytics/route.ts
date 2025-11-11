import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserIdOrThrow } from '@/lib/get-current-user-id';

/**
 * POST /api/notifications/analytics - 通知のアナリティクスデータを記録
 * Service Workerから通知のインタラクション（閉じる、クリックなど）を記録する
 *
 * 現在は基本的なログ記録のみ。将来的にデータベースに保存する想定。
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（オプショナル：アナリティクスなので認証なしでも許容可能）
    let userId: string | null = null;
    try {
      userId = await getCurrentUserIdOrThrow();
    } catch {
      // 認証エラーは無視してログのみ記録
      console.warn('Analytics request without authentication');
    }

    const body = await request.json();

    // データのバリデーション
    const { action, notificationId, timestamp } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'action is required and must be a string' },
        { status: 400 }
      );
    }

    // アナリティクスデータをログに記録（将来的にはデータベースに保存）
    console.log('[Notification Analytics]', {
      userId,
      action,
      notificationId,
      timestamp: timestamp || new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
    });

    // TODO: データベースに保存する実装
    // await analyticsService.recordNotificationEvent({
    //   userId,
    //   action,
    //   notificationId,
    //   timestamp: new Date(timestamp),
    // });

    return NextResponse.json({
      success: true,
      message: 'Analytics data recorded'
    });

  } catch (error) {
    console.error('Failed to record analytics:', error);

    return NextResponse.json(
      {
        error: 'Failed to record analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
