import { NextRequest } from 'next/server';
import { container } from '@/lib/inversify.config';
import type { INotificationService } from '@/applications/notification/INotificationService';
import { getCurrentUserId } from '@/lib/auth';

const notificationService = container.get<INotificationService>('NotificationService');

/**
 * GET /api/notifications/stream - SSE（Server-Sent Events）エンドポイント
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    const encoder = new TextEncoder();
    
    const customReadable = new ReadableStream({
      start(controller) {
        // 接続確立メッセージを送信
        const connectMessage = `data: ${JSON.stringify({ 
          type: 'connected',
          timestamp: new Date().toISOString(),
          userId 
        })}\n\n`;
        controller.enqueue(encoder.encode(connectMessage));

        // ハートビート用のインターバル
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({ 
              type: 'heartbeat',
              timestamp: new Date().toISOString() 
            })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            console.error('Heartbeat error:', error);
            clearInterval(heartbeatInterval);
          }
        }, 30000); // 30秒ごと

        // 通知の変更を監視
        const unsubscribe = notificationService.subscribeToUpdates(userId, (notification) => {
          try {
            const data = `data: ${JSON.stringify({ 
              type: 'notification',
              payload: {
                id: notification.id,
                type: notification.type.getValue(),
                priority: notification.priority.getValue(),
                title: notification.title,
                message: notification.message,
                data: notification.data,
                isRead: notification.isRead,
                createdAt: notification.createdAt,
              }
            })}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('Notification stream error:', error);
          }
        });

        // 未読数の変更通知（定期的にチェック）
        let lastUnreadCount = 0;
        const countCheckInterval = setInterval(async () => {
          try {
            const currentCount = await notificationService.getUnreadCount(userId);
            if (currentCount !== lastUnreadCount) {
              lastUnreadCount = currentCount;
              const countUpdate = `data: ${JSON.stringify({ 
                type: 'unread-count-update',
                payload: { count: currentCount },
                timestamp: new Date().toISOString()
              })}\n\n`;
              controller.enqueue(encoder.encode(countUpdate));
            }
          } catch (error) {
            console.error('Count check error:', error);
          }
        }, 60000); // 1分ごと

        // クリーンアップ処理
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          clearInterval(countCheckInterval);
          unsubscribe();
          try {
            controller.close();
          } catch (error) {
            // 既に閉じられている場合はエラーを無視
          }
        };

        // クライアントが接続を切断した場合
        request.signal.addEventListener('abort', cleanup);

        // タイムアウト設定（15分で自動切断）
        setTimeout(() => {
          console.log('SSE connection timeout');
          cleanup();
        }, 15 * 60 * 1000);
      },

      cancel() {
        console.log('SSE connection cancelled');
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('SSE setup error:', error);
    
    return new Response(
      `data: ${JSON.stringify({ 
        type: 'error',
        message: 'Failed to establish SSE connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    );
  }
}