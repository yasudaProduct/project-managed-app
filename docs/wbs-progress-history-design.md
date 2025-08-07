# WBS進捗履歴機能 設計ドキュメント

## 1. 概要

WBS進捗の履歴を管理し、過去の任意の時点での進捗状況を確認できる機能を実装します。

## 2. 要件定義

### 2.1 記録対象データ
- タスクの完了率とステータスごとの件数
- 各タスクの実績工数と予定工数の比較・差異
- 集計表（フェーズ別、担当者別、期間別など）

### 2.2 記録タイミング
- **自動記録**: タスク更新時（ステータス変更、工数更新など）
- **手動記録**: ユーザーによるスナップショット作成

### 2.3 参照方法
- カレンダーから日付を選択して、その時点の状態を表示
- タイムラインビューで履歴を一覧表示

### 2.4 データ保存方針
- 基本的に永続的に全履歴を保存
- ユーザーの任意のタイミングで月次サマリーなどにデータを軽量化

## 3. データモデル設計

### 3.1 新規テーブル

#### 3.1.1 WbsProgressHistory（WBS進捗履歴）
```prisma
model WbsProgressHistory {
  id               Int      @id @default(autoincrement())
  wbsId            Int
  recordedAt       DateTime @default(now())
  recordType       RecordType // AUTO, MANUAL_SNAPSHOT
  snapshotName     String?  // 手動スナップショット時の名前
  totalTaskCount   Int      // 総タスク数
  completedCount   Int      // 完了タスク数
  inProgressCount  Int      // 進行中タスク数
  notStartedCount  Int      // 未着手タスク数
  completionRate   Decimal  // 完了率
  plannedManHours  Decimal  // 予定工数合計
  actualManHours   Decimal  // 実績工数合計
  varianceManHours Decimal  // 差異（実績-予定）
  metadata         Json?    // その他の集計情報
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  wbs              Wbs      @relation(fields: [wbsId], references: [id])
  taskHistories    TaskProgressHistory[]
  
  @@index([wbsId, recordedAt])
}

enum RecordType {
  AUTO
  MANUAL_SNAPSHOT
}
```

#### 3.1.2 TaskProgressHistory（タスク進捗履歴）
```prisma
model TaskProgressHistory {
  id                    Int      @id @default(autoincrement())
  wbsProgressHistoryId  Int
  taskId                Int
  taskNo                String   // タスク番号
  taskName              String   // タスク名（履歴時点）
  status                String   // ステータス（履歴時点）
  assigneeId            Int?     // 担当者ID
  assigneeName          String?  // 担当者名（履歴時点）
  phaseId               Int?
  phaseName             String?  // フェーズ名（履歴時点）
  plannedStartDate      DateTime?
  plannedEndDate        DateTime?
  actualStartDate       DateTime?
  actualEndDate         DateTime?
  plannedManHours       Decimal  // 予定工数
  actualManHours        Decimal  // 実績工数
  progressRate          Decimal  // 進捗率
  createdAt             DateTime @default(now())
  
  wbsProgressHistory    WbsProgressHistory @relation(fields: [wbsProgressHistoryId], references: [id])
  
  @@index([wbsProgressHistoryId])
  @@index([taskId])
}
```

### 3.2 既存テーブルへの追加

#### 3.2.1 Wbs
```prisma
model Wbs {
  // ... 既存フィールド ...
  
  progressHistories    WbsProgressHistory[]
}
```

## 4. アプリケーション層設計

### 4.1 新規サービス

#### 4.1.1 ProgressHistoryApplicationService
```typescript
interface IProgressHistoryApplicationService {
  // 自動記録（タスク更新時に呼び出される）
  recordTaskUpdate(wbsId: number, taskId: number): Promise<void>;
  
  // 手動スナップショット作成
  createSnapshot(wbsId: number, snapshotName?: string): Promise<WbsProgressHistory>;
  
  // 特定日時の進捗取得
  getProgressAtDate(wbsId: number, targetDate: Date): Promise<WbsProgressHistory | null>;
  
  // 履歴一覧取得
  getProgressHistories(wbsId: number, options?: {
    startDate?: Date;
    endDate?: Date;
    recordType?: RecordType;
    limit?: number;
  }): Promise<WbsProgressHistory[]>;
  
  // データ軽量化（古いデータの削除）
  deleteOldData(wbsId: number, beforeDate: Date): Promise<number>;
}
```

### 4.2 新規リポジトリインターフェース

#### 4.2.1 IProgressHistoryRepository
```typescript
interface IProgressHistoryRepository {
  saveProgressHistory(history: WbsProgressHistory): Promise<WbsProgressHistory>;
  findByWbsAndDate(wbsId: number, targetDate: Date): Promise<WbsProgressHistory | null>;
  findHistoriesByWbs(wbsId: number, options?: HistoryQueryOptions): Promise<WbsProgressHistory[]>;
  deleteOldHistories(wbsId: number, beforeDate: Date): Promise<number>;
}
```

## 5. UI/UX設計

### 5.1 進捗履歴ビュー

#### 5.1.1 カレンダービュー
- 月間カレンダーで日付を選択
- 記録がある日にマーカー表示
- 選択した日の進捗詳細を表示

#### 5.1.2 タイムラインビュー
- 履歴を時系列で一覧表示
- 手動スナップショットは特別なアイコンで表示
- 各履歴から詳細画面への遷移

### 5.2 進捗詳細画面
- 選択時点でのタスク一覧
- ステータス別集計
- 工数比較（予定vs実績）
- フェーズ別・担当者別集計表

### 5.3 データ管理画面
- 履歴データの使用容量表示
- 古いデータの削除実行
- スナップショット管理

## 6. 実装手順

1. データベーススキーマの更新（Prismaマイグレーション）
2. ドメインモデルの実装
3. リポジトリの実装
4. アプリケーションサービスの実装
5. 既存のタスク更新処理への履歴記録追加
6. UI コンポーネントの実装
7. 統合テストの作成

## 7. パフォーマンス考慮事項

- 履歴データの増大に備えてインデックスを適切に設定
- 古いデータは定期的に削除（将来的にサマリー機能で対応）
- 大量のタスクがある場合のバッチ処理最適化
- キャッシュの活用（直近の履歴データ）

## 8. 今後の拡張可能性

- 進捗レポートのエクスポート機能
- 複数時点の比較機能
- 進捗予測機能（過去の履歴から）
- アラート機能（進捗遅延の検知）
- **イベントソーシングパターンへの移行**（全システムのイベント履歴機能実装時）

## 9. 実装方針の確定

### 段階的実装アプローチ
1. **第1段階（今回）**: シンプルなスナップショット方式
   - WbsProgressHistoryとTaskProgressHistoryのみ
   - 基本的な履歴参照機能
   
2. **第2段階（将来）**: パフォーマンス最適化
   - サマリー機能の追加
   - データ軽量化の自動化
   
3. **第3段階（将来）**: イベントソーシング移行
   - 全システムのイベント履歴機能と統合
   - より詳細な変更追跡