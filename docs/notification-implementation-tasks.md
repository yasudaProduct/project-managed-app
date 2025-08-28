# 通知機能実装タスクブレークダウン

## 実装タスク一覧

### Phase 1: 基盤構築（2週間）

#### 1.1 ドメインモデル作成（3日）
- [ ] Notificationエンティティクラス作成
  - `src/domains/notification/notification.ts`
- [ ] NotificationType値オブジェクト作成
  - `src/domains/notification/notification-type.ts`
- [ ] NotificationPriority値オブジェクト作成
  - `src/domains/notification/notification-priority.ts`
- [ ] NotificationChannel値オブジェクト作成
  - `src/domains/notification/notification-channel.ts`
- [ ] NotificationRule作成（通知ルール定義）
  - `src/domains/notification/notification-rule.ts`
- [ ] NotificationPreferenceエンティティ作成
  - `src/domains/notification/notification-preference.ts`
- [ ] ドメインモデルのユニットテスト作成

#### 1.2 データベーススキーマ定義（2日）
- [ ] Prismaスキーマ更新（Notification, NotificationPreference）
  - `prisma/schema.prisma`
- [ ] マイグレーションファイル作成
- [ ] シードデータ作成（テスト用）

#### 1.3 リポジトリインターフェース定義（2日）
- [ ] INotificationRepository作成
  - `src/applications/notification/INotificationRepository.ts`
- [ ] リポジトリ実装
  - `src/infrastructures/notification/NotificationRepository.ts`
- [ ] リポジトリ統合テスト作成

#### 1.4 アプリケーションサービス実装（5日）
- [ ] INotificationService インターフェース作成
  - `src/applications/notification/INotificationService.ts`
- [ ] NotificationService 実装
  - `src/applications/notification/NotificationService.ts`
- [ ] NotificationFactory作成
- [ ] 依存性注入設定（inversify.config.ts）更新
- [ ] サービスのユニットテスト作成

### Phase 2: デスクトップ通知実装（2週間）

#### 2.1 Service Worker実装（3日）
- [ ] Service Workerファイル作成
  - `public/service-worker.js`
- [ ] Push イベントハンドラ実装
- [ ] Notification クリックハンドラ実装
- [ ] Service Worker登録スクリプト作成
  - `src/lib/service-worker-register.ts`

#### 2.2 Push Notification管理（4日）
- [ ] PushNotificationManager クラス作成
  - `src/lib/push-notification.ts`
- [ ] VAPID鍵生成と環境変数設定
- [ ] Push購読管理機能実装
- [ ] 購読情報のサーバー送信機能
- [ ] 通知権限リクエストUI作成
  - `src/components/notification/NotificationPermission.tsx`

#### 2.3 サーバーサイドPush実装（3日）
- [ ] web-pushライブラリセットアップ
- [ ] PushNotificationService作成
  - `src/infrastructures/notification/PushNotificationService.ts`
- [ ] Push送信API実装
  - `src/app/api/notifications/push/route.ts`

#### 2.4 通知送信テスト（2日）
- [ ] Push通知の手動テストツール作成
- [ ] エンドツーエンドテスト作成

### Phase 3: イベント検知実装（2週間）

#### 3.1 検知サービス基盤（2日）
- [ ] NotificationEventDetector ベースクラス作成
  - `src/applications/notification/NotificationEventDetector.ts`
- [ ] イベント検知インターフェース定義

#### 3.2 タスク期限検知（3日）
- [ ] TaskDeadlineDetector作成
- [ ] 期限チェックロジック実装
- [ ] 通知作成ロジック実装
- [ ] ユニットテスト作成

#### 3.3 工数超過検知（3日）
- [ ] ManhourExceededDetector作成
- [ ] 工数計算ロジック実装
- [ ] 閾値チェックロジック実装
- [ ] ユニットテスト作成

#### 3.4 スケジュール遅延検知（3日）
- [ ] ScheduleDelayDetector作成
- [ ] 遅延判定ロジック実装
- [ ] 依存タスク影響分析
- [ ] ユニットテスト作成

#### 3.5 バッチジョブ設定（3日）
- [ ] NotificationScheduler作成
  - `src/applications/notification/NotificationScheduler.ts`
- [ ] Cronジョブ設定
  - `src/app/api/cron/notifications/route.ts`
- [ ] ジョブ実行ログ機能

### Phase 4: UI実装（1週間）

#### 4.1 通知センターコンポーネント（2日）
- [ ] NotificationCenter.tsx作成
- [ ] 通知ベルアイコン実装
- [ ] 未読バッジ表示機能
- [ ] ドロップダウンメニュー実装

#### 4.2 通知リスト表示（2日）
- [ ] NotificationList.tsx作成
- [ ] NotificationItem.tsx作成
- [ ] 既読/未読状態管理
- [ ] ページネーション実装

#### 4.3 通知設定画面（2日）
- [ ] NotificationSettings.tsx作成
- [ ] 通知タイプ別ON/OFF設定
- [ ] 通知時間帯設定
- [ ] 設定保存API連携

#### 4.4 React Queryフック（1日）
- [ ] useNotifications フック作成
- [ ] useNotificationPreferences フック作成
- [ ] リアルタイム更新対応

### Phase 5: API実装（1週間）

#### 5.1 通知API（3日）
- [ ] GET /api/notifications - 一覧取得
- [ ] POST /api/notifications/mark-read - 既読処理
- [ ] DELETE /api/notifications/:id - 削除
- [ ] GET /api/notifications/count - 未読数取得

#### 5.2 購読管理API（2日）
- [ ] POST /api/notifications/subscribe - Push購読
- [ ] DELETE /api/notifications/unsubscribe - 購読解除
- [ ] GET /api/notifications/subscription-status

#### 5.3 設定API（2日）
- [ ] GET /api/notifications/preferences
- [ ] PUT /api/notifications/preferences
- [ ] POST /api/notifications/test - テスト通知送信

### Phase 6: テストと改善（1週間）

#### 6.1 ユニットテスト（2日）
- [ ] ドメインロジックテスト完成度確認
- [ ] サービステストカバレッジ向上
- [ ] コンポーネントテスト追加

#### 6.2 統合テスト（2日）
- [ ] API統合テスト作成
- [ ] 通知フロー全体のE2Eテスト
- [ ] パフォーマンステスト

#### 6.3 最適化（3日）
- [ ] データベースクエリ最適化
- [ ] 通知配信の効率化
- [ ] フロントエンドパフォーマンス改善
- [ ] エラーハンドリング強化

## 優先度別タスク分類

### 必須（MVP）
- 基本的な通知エンティティとサービス
- タスク期限通知
- デスクトップ通知（Web Push）
- アプリ内通知センター
- 通知の既読管理

### 重要
- 工数超過通知
- スケジュール遅延通知
- 通知設定管理
- バッチジョブによる定期チェック

### Nice to Have
- メール通知
- Slack/Teams連携
- 通知のグルーピング
- 通知履歴のエクスポート
- 通知アナリティクス

## 見積もり工数

| フェーズ | 工数 | 担当想定 |
|---------|------|----------|
| Phase 1 | 10人日 | バックエンド開発者 |
| Phase 2 | 10人日 | フルスタック開発者 |
| Phase 3 | 10人日 | バックエンド開発者 |
| Phase 4 | 5人日 | フロントエンド開発者 |
| Phase 5 | 5人日 | バックエンド開発者 |
| Phase 6 | 5人日 | QAエンジニア |
| **合計** | **45人日** | - |

## リスクと対策

### 技術的リスク
1. **ブラウザ互換性**
   - 対策: Push APIサポート確認、フォールバック実装

2. **通知の配信失敗**
   - 対策: リトライ機能、エラーログ記録

3. **パフォーマンス問題**
   - 対策: 通知のバッチ処理、キャッシング活用

### 運用リスク
1. **通知の過多**
   - 対策: 優先度設定、まとめ通知機能

2. **誤通知**
   - 対策: テスト環境での十分な検証

## 依存関係

### 必要なパッケージ
```json
{
  "dependencies": {
    "web-push": "^3.6.0",
    "@tanstack/react-query": "^5.0.0",
    "node-cron": "^3.0.0"
  }
}
```

### 環境変数
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

## チェックポイント

### Phase 1完了時
- [ ] 通知ドメインモデルが完成
- [ ] データベーススキーマが更新済み
- [ ] 基本的なCRUD操作が可能

### Phase 2完了時
- [ ] デスクトップ通知が動作
- [ ] Service Workerが正常登録
- [ ] Push購読が管理可能

### Phase 3完了時
- [ ] 各種イベント検知が動作
- [ ] 定期バッチが稼働
- [ ] 適切なタイミングで通知生成

### Phase 4完了時
- [ ] 通知UIが完成
- [ ] ユーザビリティテスト完了
- [ ] レスポンシブ対応済み

### Phase 5完了時
- [ ] 全APIエンドポイント稼働
- [ ] APIドキュメント作成
- [ ] セキュリティ対策実装

### Phase 6完了時
- [ ] テストカバレッジ80%以上
- [ ] パフォーマンス目標達成
- [ ] 本番環境デプロイ準備完了