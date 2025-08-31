import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { NotificationEventDetector } from '@/applications/notification/NotificationEventDetector';

const notificationService = container.get<INotificationService>('NotificationService');
const eventDetector = container.get<NotificationEventDetector>('NotificationEventDetector');

/**
 * GET /api/cron/notifications - Cronジョブエンドポイント
 * 定期的な通知処理を実行
 */
export async function GET(request: NextRequest) {
  try {
    // Cron秘密キーによる認証
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json({
        error: 'Server configuration error'
      }, { status: 500 });
    }

    if (authHeader !== expectedAuth) {
      console.error('Unauthorized cron job access attempt');
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('Starting cron job execution...');

    const results = {
      scheduledNotifications: 0,
      cleanedUpNotifications: 0,
      errors: [] as string[],
      executedAt: new Date().toISOString(),
    };

    try {
      // スケジュール済み通知の送信
      await notificationService.sendScheduledNotifications();
      console.log('Scheduled notifications processed');

      results.scheduledNotifications = 0; // 仮の値  TODO: 実際の送信件数を取得する実装
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      results.errors.push(`Scheduled notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // 古い通知のクリーンアップ
      const cleanedCount = await notificationService.cleanupOldNotifications();
      results.cleanedUpNotifications = cleanedCount;
      console.log(`Cleaned up ${cleanedCount} old notifications`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      results.errors.push(`Cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // 通知キューの処理
      await notificationService.processNotificationQueue();
      console.log('Notification queue processed');
    } catch (error) {
      console.error('Error processing notification queue:', error);
      results.errors.push(`Queue processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // イベント検知処理の実行
    try {
      await Promise.allSettled([
        eventDetector.detectTaskDeadlines(), // タスク期限の検知と通知作成
        eventDetector.detectManhourExceeded(), // 工数超過の検知と通知作成
        eventDetector.detectScheduleDelays(), // スケジュール遅延の検知と通知作成
      ]);
      console.log('Event detection completed');
    } catch (error) {
      console.error('Error in event detection:', error);
      results.errors.push(`Event detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('Cron job execution completed', results);

    const status = results.errors.length > 0 ? 207 : 200; // Multi-Status if there are errors

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
      message: results.errors.length > 0
        ? `Completed with ${results.errors.length} errors`
        : 'All tasks completed successfully'
    }, { status });

  } catch (error) {
    console.error('Cron job failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Cron job execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      executedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/notifications - 手動でCronジョブをトリガー（開発・テスト用）
 */
export async function POST(request: NextRequest) {
  // 開発環境でのみ許可
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'Manual cron trigger is not allowed in production'
    }, { status: 403 });
  }

  console.log('Manual cron job triggered');

  // GETと同じ処理を実行
  return GET(request);
}