## 通知機能 実装ドキュメント（現行）

このドキュメントは、現時点で実装済みの通知機能の構成、API、リアルタイム配信（SSE）、Web Push、Server Actions、認証、運用方法（Cron）について説明します。

### 概要
- **通知一覧/作成API**: `src/app/api/notifications/route.ts`
- **未読数API**: `src/app/api/notifications/count/route.ts`
- **SSEストリーム**: `src/app/api/notifications/stream/route.ts`
- **Push購読API**: `src/app/api/notifications/subscribe/route.ts`
- **Server Actions**: `src/app/actions/notification-actions.ts`
- **認証ヘルパー**: `src/lib/get-current-user-id.ts`
- **Service Worker**: `public/service-worker.js`
- **通知アプリケーションサービス**: `src/applications/notification/NotificationService.ts`
- **通知リポジトリ**: `src/infrastructures/notification/NotificationRepository.ts`

## 認証
- API/Actions は Cookie の `session_token` を前提とします。
- サーバ側で `getCurrentUserIdOrThrow()` を用いてユーザーを解決し、未ログインは Unauthorized として扱います。
- 実装: `src/lib/get-current-user-id.ts`

```ts
// 例
import { getCurrentUserIdOrThrow } from '@/lib/get-current-user-id';
const userId = await getCurrentUserIdOrThrow();
```

## API

### 通知一覧・作成: `/api/notifications`
- GET: ページング/フィルタリング対応
  - query: `page`(1始), `limit`(最大100), `unreadOnly`(true/false), `type`, `priority`
  - キャッシュ: `private, no-cache, no-store`
- POST: 通知作成（将来の管理用途を想定）
  - body: `{ targetUserId?, type, priority?, title, message, data?, channels?, scheduledAt? }`

### 未読数: `/api/notifications/count`
- GET: 現在の未読数を返却
- キャッシュ: `private, max-age=30`

### Web Push購読: `/api/notifications/subscribe`
- POST: 購読登録
  - 受領データ: `{ endpoint, keys: { p256dh, auth }, userAgent? }`
  - バリデーション有り
- DELETE: 購読解除
- GET: 購読状態取得（簡易実装）

### SSE: `/api/notifications/stream`
- GET: Server-Sent Events によるリアルタイム配信
- イベント種別
  - `connected`: 接続確立
  - `heartbeat`: 30秒ごと
  - `notification`: 新規通知
  - `unread-count-update`: 未読数変化時
- タイムアウト: 15分で自動切断、切断時に購読解除とインターバル停止

## Server Actions（操作系）
実装: `src/app/actions/notification-actions.ts`
- `markNotificationAsRead`（複数ID対応）
- `markAllAsRead`
- `deleteNotification`
- `updateNotificationPreferences`
- `sendTestNotification`
- `getUnreadCount`
- `getNotificationPreferences`
- `savePushSubscription`
- `removePushSubscription`

いずれも実行後に `revalidateTag(...)` を用いてキャッシュを無効化します。

## リアルタイム配信（SSE）
実装: `src/app/api/notifications/stream/route.ts`
- `ReadableStream` を用いてテキストイベントを送信
- 接続直後に `connected` を送信
- 30秒ごとに `heartbeat` を送信
- `NotificationService.subscribeToUpdates(userId, cb)` を介して通知を `notification` として送信
- 1分ごとに未読数をチェックし、変化時のみ `unread-count-update` を送信

クライアント最小例:
```ts
const es = new EventSource('/api/notifications/stream');
es.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  // msg.type: 'connected' | 'heartbeat' | 'notification' | 'unread-count-update'
};
es.onerror = () => es.close();
```

## Web Push
### Service Worker
実装: `public/service-worker.js`
- `push` 受信イベントで `showNotification()` を実行
- 通知クリック時のアクション（`view`/`dismiss`/`mark-read`）を実装

### 購読登録フロー（クライアント）
```ts
const registration = await navigator.serviceWorker.register('/service-worker.js');
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: /* VAPID公開鍵(ArrayBuffer) */
});
await fetch('/api/notifications/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth')),
    },
    userAgent: navigator.userAgent,
  })
});
```

### VAPID鍵
- 生成スクリプト: `scripts/generate-vapid-keys.js`
- 公開鍵はフロント（`NEXT_PUBLIC_...`）として提供、秘密鍵はサーバ側で保持

## 通知サービス/リポジトリ
- サービス: `src/applications/notification/NotificationService.ts`
- リポジトリ: `src/infrastructures/notification/NotificationRepository.ts`
- メソッド例:
  - `getNotifications({ userId, page, limit, unreadOnly, type?, priority? })`
  - `getUnreadCount(userId)`
  - `createNotification({...})`
  - `markAsRead(userId, notificationIds)` / `markAllAsRead(userId)`
  - `deleteNotification(userId, notificationId)`
  - `savePushSubscription(userId, { endpoint, keys, userAgent? })`
  - `removePushSubscription(userId)`
  - `subscribeToUpdates(userId, cb)`

## 運用（Cron 定期チェック）
- エンドポイント: `src/app/api/cron/notifications/route.ts`
- 想定運用: 外部 Cron（Vercel Cron / GitHub Actions / Cloud Scheduler 等）から HTTP で起動
- 認証: `Authorization: Bearer ${CRON_SECRET}`
- 役割: 期限・工数・遅延等のイベント検知 → 通知作成

## キャッシュ/リアルタイム整合性
- 一覧API: `Cache-Control: private, no-cache, no-store`
- 未読数: `private, max-age=30`
- Server Actions: `revalidateTag('notifications')` などで明示的に無効化
- SSE: リアルタイム通知と未読数変化の即時反映

## セキュリティ
- すべてのユーザー操作系 API/Actions はサーバ側でユーザーを特定（Cookie `session_token`）
- SSE/Push 購読 API も認証必須
- Push 配信は VAPID を使用（HTTPS 前提）

## クイックリファレンス
- 一覧取得: `GET /api/notifications?page=1&limit=20&unreadOnly=true`
- 未読数: `GET /api/notifications/count`
- SSE接続: `new EventSource('/api/notifications/stream')`
- Push購読登録: `POST /api/notifications/subscribe`
- 既読化（Actions）: `markNotificationAsRead`, `markAllAsRead`
- 削除（Actions）: `deleteNotification`

## 既知事項/今後の拡張
- `subscribe GET` はダミー応答のため実データ連携に更新予定
- メール通知は将来実装
- 通知アナリティクス（開封/クリック計測）はオプション


