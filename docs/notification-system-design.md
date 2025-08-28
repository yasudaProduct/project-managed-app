# プロジェクト管理アプリ通知システム設計書

## 1. 概要

本ドキュメントは、プロジェクト管理アプリケーションにおける通知システムの設計について記載します。
タスクの期限、工数超過、スケジュール遅延などの重要なイベントをユーザーにリアルタイムで通知し、プロジェクトの円滑な進行を支援します。

## 2. 通知要件

### 2.1 通知対象イベント

#### タスク関連
- **タスク期限アラート**
  - タスク期限の3日前
  - タスク期限の1日前
  - タスク期限当日
  - タスク期限超過時

- **工数超過アラート**
  - 予定工数の80%到達時
  - 予定工数の100%到達時
  - 予定工数の120%超過時

- **担当タスクアラート**
  - 自分に担当タスクが割り当てられた時
  - 自分の担当タスクが更新された時

#### スケジュール関連
- **スケジュール遅延アラート**
  - プロジェクト全体の遅延検知時
  - フェーズ完了予定日超過時
  - 依存タスクの遅延による影響発生時

#### プロジェクト関連
- **プロジェクトステータス変更**
  - プロジェクト開始
  - プロジェクト完了
  - プロジェクト一時停止/再開

#### アサイン関連
- **新規タスクアサイン**
  - 自分に新しいタスクが割り当てられた時
  - 自分のタスクが再割り当てされた時

### 2.2 通知チャネル

1. **デスクトップ通知（Web Push Notification）**
   - ブラウザのPush API使用
   - リアルタイム通知
   - オフライン対応

2. **メール通知（将来実装）**
   - 重要度の高い通知のみ
   - ダイジェスト送信オプション

## 3. システムアーキテクチャ

### 3.1 全体構成

```
┌─────────────────────┐
│   Next.js Client    │
│  (React Components) │
└──────────┬──────────┘
           │
      Push API / 
    Service Worker
           │
┌──────────▼──────────┐
│   Notification      │
│     Service         │
│  (Application Layer)│
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Notification       │
│   Domain Logic      │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Event Detection   │
│     Service         │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│    Database         │
│  (Notifications)    │
└─────────────────────┘
```

### 3.2 レイヤー構成（クリーンアーキテクチャ準拠）

#### Domain Layer
```typescript
// src/domains/notification/
├── notification.ts              // 通知エンティティ
├── notification-type.ts         // 通知タイプ定義
├── notification-priority.ts     // 優先度定義
├── notification-channel.ts      // 通知チャネル定義
├── notification-rule.ts         // 通知ルール
└── notification-preference.ts   // ユーザー通知設定
```

#### Application Layer
```typescript
// src/applications/notification/
├── INotificationService.ts      // 通知サービスインターフェース
├── NotificationService.ts       // 通知サービス実装
├── INotificationRepository.ts   // リポジトリインターフェース
├── NotificationEventDetector.ts // イベント検知サービス
└── NotificationScheduler.ts     // 定期チェックスケジューラー
```

#### Infrastructure Layer
```typescript
// src/infrastructures/notification/
├── NotificationRepository.ts    // Prismaリポジトリ実装
├── PushNotificationService.ts   // Web Push実装
├── ServiceWorkerManager.ts      // Service Worker管理
└── NotificationQueue.ts         // 通知キュー管理
```

#### UI Layer
```typescript
// src/components/notification/
├── NotificationCenter.tsx       // 通知センターコンポーネント
├── NotificationBell.tsx         // 通知ベルアイコン
├── NotificationList.tsx         // 通知リスト
├── NotificationItem.tsx         // 個別通知表示
└── NotificationSettings.tsx     // 通知設定画面
```

## 4. データモデル

### 4.1 通知テーブル（Prisma Schema）

```prisma
model Notification {
  id            Int                  @id @default(autoincrement())
  userId        String
  type          NotificationType
  priority      NotificationPriority
  title         String
  message       String
  data          Json?                // 関連データ（タスクID、プロジェクトID等）
  channels      NotificationChannel[]
  isRead        Boolean              @default(false)
  readAt        DateTime?
  scheduledAt   DateTime?            // 予定送信時刻
  sentAt        DateTime?            // 実際の送信時刻
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  
  user          User                 @relation(fields: [userId], references: [id])
  
  @@index([userId, isRead])
  @@index([scheduledAt])
}

enum NotificationType {
  TASK_DEADLINE_WARNING     // タスク期限警告
  TASK_DEADLINE_OVERDUE     // タスク期限超過
  TASK_MANHOUR_WARNING      // 工数警告
  TASK_MANHOUR_EXCEEDED     // 工数超過
  SCHEDULE_DELAY            // スケジュール遅延
  TASK_ASSIGNED             // タスクアサイン
  PROJECT_STATUS_CHANGED    // プロジェクトステータス変更
}

enum NotificationPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum NotificationChannel {
  PUSH      // デスクトップ通知
  EMAIL     // メール通知
}

model NotificationPreference {
  id                    Int      @id @default(autoincrement())
  userId                String   @unique
  enablePush            Boolean  @default(true)
  enableInApp           Boolean  @default(true)
  enableEmail           Boolean  @default(false)
  
  // 通知タイプ別の設定
  taskDeadline          Json     @default("{\"days\": [3, 1, 0]}")
  manhourThreshold      Json     @default("{\"percentages\": [80, 100, 120]}")
  scheduleDelay         Boolean  @default(true)
  taskAssignment        Boolean  @default(true)
  projectStatusChange   Boolean  @default(true)
  
  // 通知時間帯設定
  quietHoursStart       Int?     // 通知停止開始時刻（0-23）
  quietHoursEnd         Int?     // 通知停止終了時刻（0-23）
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  user                  User     @relation(fields: [userId], references: [id])
}
```

## 5. 実装詳細

### 5.1 Web Push Notification実装

#### Service Worker登録
```typescript
// public/service-worker.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id,
      type: data.type
    },
    actions: [
      {
        action: 'view',
        title: '詳細を見る',
      },
      {
        action: 'dismiss',
        title: '閉じる',
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/notifications/' + event.notification.data.primaryKey)
    );
  }
});
```

#### Push Subscription管理
```typescript
// src/lib/push-notification.ts
export class PushNotificationManager {
  async subscribeToPush(): Promise<PushSubscription> {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
    });
    
    // サーバーに購読情報を送信
    await this.sendSubscriptionToServer(subscription);
    
    return subscription;
  }
  
  async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription)
    });
  }
}
```

### 5.2 イベント検知とスケジューリング

#### 定期チェック実装
```typescript
// src/applications/notification/NotificationEventDetector.ts
export class NotificationEventDetector {
  constructor(
    private taskRepository: ITaskRepository,
    private notificationService: INotificationService,
    private userRepository: IUserRepository
  ) {}
  
  async detectTaskDeadlines(): Promise<void> {
    const tasks = await this.taskRepository.getUpcomingDeadlineTasks();
    
    for (const task of tasks) {
      const daysUntilDeadline = this.calculateDaysUntilDeadline(task.period.endDate);
      
      if ([3, 1, 0].includes(daysUntilDeadline)) {
        await this.notificationService.createNotification({
          userId: task.assignee.userId,
          type: NotificationType.TASK_DEADLINE_WARNING,
          priority: daysUntilDeadline === 0 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
          title: `タスク期限通知`,
          message: `「${task.name}」の期限が${daysUntilDeadline}日後です`,
          data: {
            taskId: task.id,
            taskNo: task.taskNo.value,
            projectId: task.wbsId,
            daysRemaining: daysUntilDeadline
          }
        });
      }
    }
  }
  
  async detectManhourExceeded(): Promise<void> {
    const tasks = await this.taskRepository.getActiveTasks();
    
    for (const task of tasks) {
      const actualHours = task.workRecords?.reduce((sum, record) => sum + record.hours, 0) || 0;
      const plannedHours = task.manHour?.value || 0;
      const percentage = (actualHours / plannedHours) * 100;
      
      const thresholds = [80, 100, 120];
      for (const threshold of thresholds) {
        if (percentage >= threshold && percentage < threshold + 20) {
          await this.notificationService.createNotification({
            userId: task.assignee.userId,
            type: percentage >= 100 
              ? NotificationType.TASK_MANHOUR_EXCEEDED 
              : NotificationType.TASK_MANHOUR_WARNING,
            priority: percentage >= 120 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
            title: `工数${percentage >= 100 ? '超過' : '警告'}`,
            message: `「${task.name}」の実績工数が予定の${Math.floor(percentage)}%に達しました`,
            data: {
              taskId: task.id,
              actualHours,
              plannedHours,
              percentage
            }
          });
        }
      }
    }
  }
  
  async detectScheduleDelays(): Promise<void> {
    const projects = await this.projectRepository.getActiveProjects();
    
    for (const project of projects) {
      const delayedTasks = await this.taskRepository.getDelayedTasksByProject(project.id);
      
      if (delayedTasks.length > 0) {
        const projectManager = await this.userRepository.getProjectManager(project.id);
        
        await this.notificationService.createNotification({
          userId: projectManager.id,
          type: NotificationType.SCHEDULE_DELAY,
          priority: NotificationPriority.HIGH,
          title: 'スケジュール遅延検知',
          message: `プロジェクト「${project.name}」で${delayedTasks.length}件のタスクが遅延しています`,
          data: {
            projectId: project.id,
            delayedTaskCount: delayedTasks.length,
            delayedTasks: delayedTasks.map(t => ({
              id: t.id,
              name: t.name,
              daysDelayed: this.calculateDelayDays(t)
            }))
          }
        });
      }
    }
  }
}
```

### 5.3 通知UI実装

#### 通知センターコンポーネント
```tsx
// src/components/notification/NotificationCenter.tsx
import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationList } from './NotificationList';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50">
          <div className="px-4 py-3 border-b">
            <h3 className="text-lg font-semibold">通知</h3>
          </div>
          <NotificationList 
            notifications={notifications}
            onMarkAsRead={markAsRead}
          />
        </div>
      )}
    </div>
  );
};
```

## 6. API設計

### 6.1 通知API

```typescript
// src/app/api/notifications/route.ts

// GET /api/notifications - 通知一覧取得
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = await getCurrentUserId();
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  
  const notifications = await notificationService.getNotifications({
    userId,
    page,
    limit,
    unreadOnly
  });
  
  return NextResponse.json(notifications);
}

// POST /api/notifications/mark-read - 既読処理
export async function POST(request: Request) {
  const { notificationIds } = await request.json();
  const userId = await getCurrentUserId();
  
  await notificationService.markAsRead(userId, notificationIds);
  
  return NextResponse.json({ success: true });
}

// POST /api/notifications/subscribe - Push通知購読
export async function POST(request: Request) {
  const subscription = await request.json();
  const userId = await getCurrentUserId();
  
  await notificationService.savePushSubscription(userId, subscription);
  
  return NextResponse.json({ success: true });
}

// GET /api/notifications/preferences - 通知設定取得
// PUT /api/notifications/preferences - 通知設定更新
```

## 7. 実装計画

### Phase 1: 基盤構築（2週間）
1. ドメインモデル作成
2. データベーススキーマ定義
3. 基本的な通知サービス実装
4. リポジトリ実装

### Phase 2: デスクトップ通知実装（2週間）
1. Service Worker実装
2. Push Notification購読管理
3. 通知送信サービス実装
4. 通知権限リクエストUI

### Phase 3: イベント検知実装（2週間）
1. タスク期限検知サービス
2. 工数超過検知サービス
3. スケジュール遅延検知サービス
4. バッチジョブ設定

### Phase 4: UI実装（1週間）
1. 通知センターコンポーネント
2. 通知リスト表示
3. 通知設定画面
4. 通知バッジ実装

### Phase 5: テストと改善（1週間）
1. ユニットテスト作成
2. 統合テスト作成
3. パフォーマンス最適化
4. ユーザーフィードバック対応

## 8. 技術選定

### 使用技術
- **Web Push API**: ブラウザ標準のPush通知
- **Service Worker**: バックグラウンド処理とオフライン対応
- **Next.js API Routes**: 通知API実装
- **Prisma**: データベース操作
- **React Query**: 通知データのキャッシング
- **Radix UI**: 通知UIコンポーネント

### 外部サービス（オプション）
- **web-push library**: サーバーサイドPush通知送信
- **node-cron**: スケジューリング処理
- **Bull Queue**: ジョブキュー管理（将来的な拡張用）

## 9. セキュリティ考慮事項

1. **認証・認可**
   - ユーザーは自分の通知のみ閲覧可能
   - 通知設定は本人のみ変更可能

2. **Push通知の安全性**
   - VAPID認証使用
   - HTTPSでの配信必須

3. **データプライバシー**
   - 通知内容の最小限化
   - 個人情報の暗号化保存

## 10. パフォーマンス考慮事項

1. **通知の効率的な配信**
   - バッチ処理による一括送信
   - 優先度に基づくキューイング

2. **データベース最適化**
   - 適切なインデックス設定
   - 古い通知の自動削除

3. **クライアント側の最適化**
   - 通知の遅延読み込み
   - ページネーション実装

## 11. 今後の拡張計画

1. **メール通知統合**
   - SendGridまたはAWS SES連携
   - ダイジェストメール機能

2. **Slack/Teams統合**
   - Webhook経由の通知送信
   - チャンネル別通知設定

3. **AI駆動の通知最適化**
   - 通知タイミングの最適化
   - 重要度の自動判定

4. **通知アナリティクス**
   - 通知の開封率追跡
   - ユーザーエンゲージメント分析