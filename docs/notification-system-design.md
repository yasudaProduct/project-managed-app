# 通知システム基本設計書

## 1. 概要

本設計書は、プロジェクト管理アプリケーションにおける通知システムの基本設計について説明します。

### 1.1 設計原則
- **リアルタイム性**: イベント発生時に即座に通知を配信
- **ユーザビリティ**: ユーザーの設定に基づく適切な通知チャネルの選択
- **スケーラビリティ**: 大量の通知処理に対応可能なアーキテクチャ
- **信頼性**: 通知の確実な配信とエラーハンドリング
- **パフォーマンス**: 効率的な通知処理とリソース管理

### 1.2 技術スタック
- **Push通知**: Web Push API (VAPID)
- **定期実行**: Cron + Docker

## 2. システムアーキテクチャ

### 2.1 全体構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド   │    │   バックエンド     │    │   データベース     │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Notification │ │◄──►│ │Notification │ │◄──►│ │notifications│ │
│ │Center       │ │    │ │Service      │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │useNotifications│ │◄──►│ │API Routes   │ │◄──►│ │notification_│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ │preferences  │ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ └─────────────┘ │
│ │Service Worker│ │    │ │             │ │    │ ┌─────────────┐ │
│ └─────────────┘ │    │ └─────────────┘ │    │ │push_subscrip│ │
└─────────────────┘    └─────────────────┘    │ │tions        │ │
                                              │ └─────────────┘ │
                                              └─────────────────┘
                                                       │
                                              ┌─────────────────┐
                                              │   定期実行       │
                                              │                 │
                                              │ ┌─────────────┐ │
                                              │ │Cron Jobs    │ │
                                              │ └─────────────┘ │
                                              └─────────────────┘
```

### 2.2 レイヤー構成

#### 2.2.1 プレゼンテーション層
- **NotificationCenter**: 通知センターUIコンポーネント
- **NotificationList**: 通知一覧表示コンポーネント
- **NotificationSettings**: 通知設定ページ
- **Service Worker**: Push通知の受信と表示

#### 2.2.2 アプリケーション層
- **NotificationService**: 通知の作成・送信・管理の統合サービス
- **NotificationEventDetector**: 通知イベントの検知と処理
- **Server Actions**: 通知の既読化・削除等の操作

#### 2.2.3 ドメイン層
- **Notification**: 通知エンティティ
- **NotificationPreference**: 通知設定エンティティ
- **PushSubscription**: Push通知購読エンティティ
- **Value Objects**: 通知タイプ、優先度、チャネル等

#### 2.2.4 インフラストラクチャ層
- **NotificationRepository**: データベース操作
- **PushNotificationService**: Web Push通知の送信

## 3. データモデル設計

### 3.1 エンティティ設計

#### 3.1.1 Notification（通知）
```typescript
interface Notification {
  id: number;                    // 通知ID
  userId: string;                // 対象ユーザーID
  type: NotificationType;        // 通知タイプ
  priority: NotificationPriority; // 優先度
  title: string;                 // 通知タイトル
  message: string;               // 通知メッセージ
  data?: NotificationData;       // 関連データ（JSON）
  channels: NotificationChannel[]; // 配信チャネル
  isRead: boolean;               // 既読フラグ
  readAt?: Date;                 // 既読日時
  scheduledAt?: Date;            // 予定送信時刻
  sentAt?: Date;                 // 実際の送信時刻
  createdAt: Date;               // 作成日時
  updatedAt: Date;               // 更新日時
}
```

#### 3.1.2 NotificationPreference（通知設定）
```typescript
interface NotificationPreference {
  id: number;                    // 設定ID
  userId: string;                // ユーザーID
  enablePush: boolean;           // Push通知有効フラグ
  enableInApp: boolean;          // アプリ内通知有効フラグ
  enableEmail: boolean;          // メール通知有効フラグ
  
  // 通知タイプ別の設定
  taskDeadline: Json;            // タスク期限警告設定
  manhourThreshold: Json;        // 工数警告設定
  scheduleDelay: boolean;        // スケジュール遅延通知
  taskAssignment: boolean;       // タスクアサイン通知
  projectStatusChange: boolean;  // プロジェクト状態変更通知
  
  // 通知時間帯設定
  quietHoursStart?: number;      // 通知停止開始時刻（0-23）
  quietHoursEnd?: number;        // 通知停止終了時刻（0-23）
}
```

#### 3.1.3 PushSubscription（Push通知購読）
```typescript
interface PushSubscription {
  id: number;                    // 購読ID
  userId: string;                // ユーザーID
  endpoint: string;              // Push通知エンドポイント
  keys: Json;                    // p256dh と auth キー
  userAgent?: string;            // ユーザーエージェント
  isActive: boolean;             // アクティブフラグ
}
```

### 3.2 通知タイプ設計

#### 3.2.1 通知タイプ（NotificationType）
- **TASK_DEADLINE_WARNING**: タスク期限警告
- **TASK_DEADLINE_OVERDUE**: タスク期限超過
- **TASK_MANHOUR_WARNING**: 工数警告
- **TASK_MANHOUR_EXCEEDED**: 工数超過
- **TASK_ASSIGNED**: タスクアサイン
- **TASK_UPDATED**: タスク更新
- **SCHEDULE_DELAY**: スケジュール遅延
- **PROJECT_STATUS_CHANGED**: プロジェクトステータス変更

#### 3.2.2 通知優先度（NotificationPriority）
- **LOW**: 低優先度
- **MEDIUM**: 中優先度
- **HIGH**: 高優先度
- **URGENT**: 緊急

#### 3.2.3 通知チャネル（NotificationChannel）
- **PUSH**: デスクトップPush通知
- **IN_APP**: アプリ内通知
- **EMAIL**: メール通知

## 4. 通知フロー設計

### 4.1 通知作成フロー

```
1. イベント発生
   ↓
2. NotificationService.createNotification() 呼び出し
   ↓
3. ユーザー通知設定の確認
   ↓
4. クワイエットアワーのチェック
   ↓
5. 有効なチャネルの決定
   ↓
6. 通知エンティティの作成
   ↓
7. データベースへの保存
   ↓
8. 即座送信の判定
   ↓
9. 通知の送信（Push/Email等）
   ↓
10. リアルタイム更新の通知（SSE）
```

### 4.2 通知配信フロー

#### 4.2.1 Push通知配信
```
1. 通知作成完了
   ↓
2. PushNotificationService.sendToUser() 呼び出し
   ↓
3. ユーザーのPush購読情報取得
   ↓
4. Web Push API による通知送信
   ↓
5. Service Worker での通知受信
   ↓
6. デスクトップ通知の表示
```

#### 4.2.2 アプリ内通知配信
```
1. 通知作成完了
   ↓
2. SSE Stream によるリアルタイム配信
   ↓
3. useNotifications フックでの受信
   ↓
4. NotificationCenter での表示更新
   ↓
5. 未読数の更新
```

### 4.3 定期実行フロー

```
1. Cron ジョブ実行（毎分）
   ↓
2. /api/cron/notifications エンドポイント呼び出し
   ↓
3. 認証チェック（CRON_SECRET）
   ↓
4. スケジュール済み通知の送信
   ↓
5. 古い通知のクリーンアップ
   ↓
6. 通知キューの処理
   ↓
7. イベント検知処理の実行
   ↓
8. 結果のログ出力
```

## 5. API設計

### 5.1 通知管理API

#### 5.1.1 通知一覧・作成: `/api/notifications`
```typescript
// GET: 通知一覧取得
GET /api/notifications?page=1&limit=20&unreadOnly=false&type=TASK_DEADLINE&priority=HIGH

// POST: 通知作成
POST /api/notifications
Body: {
  targetUserId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: NotificationData;
  channels?: NotificationChannel[];
  scheduledAt?: string;
}
```

#### 5.1.2 未読数取得: `/api/notifications/count`
```typescript
// GET: 未読通知数取得
GET /api/notifications/count
Response: { count: number; timestamp: string }
```

#### 5.1.3 通知ストリーム: `/api/notifications/stream`
```typescript
// GET: Server-Sent Events ストリーム
GET /api/notifications/stream
Response: SSE stream with notification updates
```

#### 5.1.4 Push通知購読: `/api/notifications/subscribe`
```typescript
// POST: Push通知購読登録
POST /api/notifications/subscribe
Body: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}
```

### 5.2 Server Actions

#### 5.2.1 通知既読化
```typescript
// 単一通知の既読化
markNotificationAsRead(notificationId: string): Promise<NotificationActionResult>

// 全通知の既読化
markAllAsRead(): Promise<NotificationActionResult>
```

#### 5.2.2 通知削除
```typescript
// 通知削除
deleteNotification(notificationId: string): Promise<NotificationActionResult>
```

#### 5.2.3 テスト通知送信
```typescript
// テスト通知の送信
sendTestNotification(): Promise<NotificationActionResult>
```

## 6. フロントエンド設計

### 6.1 カスタムフック設計

#### 6.1.1 useNotifications
```typescript
interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  markAllNotificationsAsRead: () => void;
  refresh: () => void;
  markAllAsReadState: 'idle' | 'loading' | 'success' | 'error';
}
```

### 6.2 コンポーネント設計

#### 6.2.1 NotificationCenter
- 通知ベルアイコンとバッジ表示
- ドロップダウンメニュー形式の通知一覧
- リアルタイム接続状態の表示
- 全既読化機能

#### 6.2.2 NotificationList
- 通知一覧の表示
- ページネーション対応
- フィルタリング機能（未読のみ、タイプ別等）
- 通知の既読化・削除機能

#### 6.2.3 NotificationSettings
- 通知チャネルの有効/無効設定
- 通知タイプ別の設定
- クワイエットアワー設定
- 設定の保存・復元

## 7. セキュリティ設計

### 7.1 認証・認可
- **API認証**: Cookie ベースのセッション認証
- **Cron認証**: 環境変数 `CRON_SECRET` によるBearer認証
- **ユーザー分離**: ユーザーIDによる通知データの分離

### 7.2 データ保護
- **個人情報**: 通知内容に含まれる個人情報の最小化
- **暗号化**: Push通知のエンドツーエンド暗号化
- **アクセス制御**: ユーザー自身の通知のみアクセス可能

### 7.3 レート制限
- **通知作成**: ユーザーごとの通知作成頻度制限
- **Push通知**: 購読ごとの送信頻度制限
- **API呼び出し**: エンドポイントごとの呼び出し制限

## 8. パフォーマンス設計

### 8.1 データベース最適化
- **インデックス**: ユーザーID、既読フラグ、作成日時の複合インデックス
- **クエリ最適化**: 効率的な通知取得クエリの設計
- **接続プール**: Prisma クライアントの接続管理

### 8.2 キャッシュ戦略
- **通知一覧**: 30秒間のフレッシュ時間設定
- **未読数**: 1分間の自動更新間隔
- **SSE接続**: 30秒間のハートビート間隔

### 8.3 非同期処理
- **通知送信**: 非同期でのPush通知・メール送信
- **バッチ処理**: 大量通知の一括処理
- **キュー処理**: 通知キューの非同期処理

## 9. 監視・運用設計

### 9.1 ログ設計
- **通知作成ログ**: 通知の作成・送信状況の記録
- **エラーログ**: 通知送信失敗の詳細記録
- **パフォーマンスログ**: 処理時間・リソース使用量の記録

### 9.2 メトリクス設計
- **通知配信率**: 成功/失敗率の監視
- **レスポンス時間**: API応答時間の監視
- **リソース使用量**: メモリ・CPU使用量の監視

### 9.3 アラート設計
- **通知送信失敗**: 連続失敗時のアラート
- **SSE接続異常**: 接続数・切断率の異常検知
- **Cron実行失敗**: 定期実行の失敗検知

## 10. 拡張性・保守性設計

### 10.1 プラグインアーキテクチャ
- **通知チャネル拡張**: 新しい通知チャネルの追加
- **通知タイプ拡張**: 新しい通知タイプの追加
- **通知処理拡張**: カスタム通知処理ロジックの追加

### 10.2 設定管理
- **環境別設定**: 開発・ステージング・本番環境の設定分離
- **動的設定**: ランタイムでの設定変更対応
- **設定バリデーション**: 設定値の妥当性チェック

### 10.3 テスト戦略
- **単体テスト**: 各レイヤーの独立したテスト
- **統合テスト**: レイヤー間の連携テスト
- **E2Eテスト**: エンドツーエンドの動作テスト

## 11. 今後の改善点

### 11.1 機能拡張
- **通知テンプレート**: 再利用可能な通知テンプレート機能
- **通知グループ化**: 関連通知のグループ化表示
- **通知履歴**: 詳細な通知履歴の管理

### 11.2 パフォーマンス改善
- **WebSocket**: SSE から WebSocket への移行検討
- **通知最適化**: 重複通知の除去・統合
- **配信最適化**: ユーザー行動に基づく配信タイミング最適化

### 11.3 運用改善
- **監視ダッシュボード**: 通知システムの状態監視UI
- **自動復旧**: 障害時の自動復旧機能
- **容量管理**: 通知データの自動アーカイブ・削除

## 12. まとめ

本設計書で定義した通知システムは、以下の特徴を持つ堅牢で拡張可能なシステムとして設計されています：

1. **アーキテクチャ**: レイヤー分離による保守性の向上
2. **リアルタイム性**: SSE と Push通知による即座の配信
3. **ユーザビリティ**: 柔軟な通知設定とチャネル選択
4. **スケーラビリティ**: 効率的なデータベース設計と非同期処理
5. **セキュリティ**: 適切な認証・認可とデータ保護
6. **監視性**: 包括的なログ・メトリクス・アラート

この設計に基づいて実装された通知システムは、プロジェクト管理アプリケーションのユーザーエクスペリエンスを大幅に向上させ、効率的なプロジェクト管理を支援します。
