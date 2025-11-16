# EVM（Earned Value Management）表示機能 基本設計書

## 1. 概要

### 1.1 目的
プロジェクトの進捗状況と予実管理を可視化するため、EVM（Earned Value Management）分析機能を実装する。これにより、プロジェクトマネージャーは以下を把握できる：
- プロジェクトの進捗状況（計画対実績）
- コストパフォーマンス
- スケジュールパフォーマンス
- 完了予測

### 1.2 スコープ
- PostgreSQLのWBS関連テーブルからデータを取得
- プロジェクト詳細ページ（`/projects/[id]/page.tsx`）のタブにEVM表示を追加
- 既存のEVM実装（`/evm`）は無視し、新規実装を行う

## 2. 機能要件

### 2.1 EVM指標の算出
以下の主要指標を計算・表示する：

#### 算出方式の選択
初期実装では**工数ベース**で算出し、将来的に**金額ベース**への切り替え機能を実装予定：

| 算出方式 | 計算単位 | 実装フェーズ |
|---------|---------|-------------|
| 工数ベース | 時間（hour） | 第1フェーズ（初期実装） |
| 金額ベース | 円（¥） | 第2フェーズ（将来拡張） |

#### 進捗率測定方法の選択
EV（出来高）算出における進捗率の測定方法を選択可能：

| 測定方法 | 進捗率の算出 | 特徴 | Enum値 | 実装フェーズ |
|---------|-------------|------|--------|-------------|
| **0/100法** | 完了=100%、未完了=0% | 保守的、確実な成果のみ評価 | `ZERO_HUNDRED` | 第1フェーズ |
| **50/50法** | 着手=50%、完了=100% | 着手時に半分の価値を認める | `FIFTY_FIFTY` | 第1フェーズ |
| **自己申告進捗率** | `wbs_task.progress_rate`フィールド（0-100の実数値） | 詳細な進捗管理が可能 | `SELF_REPORTED` | 第1フェーズ |

**注**: 進捗率測定方法は`ProgressMeasurementMethod` Enum（Prismaスキーマ定義）を使用します。

**EV算出式（統一）**: `EV = Σ(タスクの計画工数 × 進捗率)`

**注意**: 0/100法は「完了したタスクの計画工数の合計」と同等の結果になります。

#### 基本指標（工数ベース）
- **PV (Planned Value)**: 計画価値 - 現時点までに完了予定だった作業の計画工数
- **EV (Earned Value)**: 出来高 - 選択した進捗率測定方法に基づく完了作業の計画工数
- **AC (Actual Cost)**: 実コスト - 実際に投入した工数

#### 基本指標（金額ベース）※将来実装
- **PV (Planned Value)**: 計画価値 - 現時点までに完了予定だった作業の計画原価
- **EV (Earned Value)**: 出来高 - 選択した進捗率測定方法に基づく完了作業の計画原価
- **AC (Actual Cost)**: 実コスト - 実際に投入した原価

#### パフォーマンス指標
- **SV (Schedule Variance)**: スケジュール差異 = EV - PV
- **CV (Cost Variance)**: コスト差異 = EV - AC
- **SPI (Schedule Performance Index)**: スケジュール効率指数 = EV / PV
- **CPI (Cost Performance Index)**: コスト効率指数 = EV / AC

#### 予測指標
- **ETC (Estimate To Complete)**: 残作業予測工数
- **EAC (Estimate At Completion)**: 完了時総工数予測
- **VAC (Variance At Completion)**: 完了時差異予測 = BAC - EAC

### 2.2 表示機能

#### 2.2.1 EVMチャート
- 時系列でPV、EV、ACの推移を表示
- 折れ線グラフまたはエリアチャート形式
- 日付範囲の選択機能（週次/月次/全期間）

#### 2.2.2 パフォーマンス指標ダッシュボード
- 現在時点での各指標をカード形式で表示
- 正常/警告/危険のステータス色分け
- トレンド表示（前期比）
- 算出方式・進捗率測定方法の切り替えUI

#### 2.2.3 進捗テーブル
- タスクごとのEVM指標詳細
- フィルタ・ソート機能
- CSV/Excelエクスポート機能

## 3. データソース

### 3.1 段階的データ取得戦略

#### 第1フェーズ：リアルタイム計算（履歴なし）
現在のデータから直接EVM指標を計算：

```sql
-- 必要最小限のテーブル
- wbs: WBS情報
- wbs_task: タスク情報（status, taskNo, name, progress_rate）
- task_period: タスク期間（startDate, endDate, type）
- task_kosu: 工数情報（kosu, type）
- work_records: 実績工数（hours_worked, date）
- wbs_assignee: 担当者情報（rate, cost_per_hour）
- wbs_buffer: バッファ情報（buffer, bufferType）
- project_settings: プロジェクト設定（progress_measurement_method）
```

**既存リポジトリの活用**:
- `WbsQueryRepository`: タスク一覧、工数、期間、進捗率の取得に活用
- 新規`WbsEvmRepository`: EVM特化の計算・集計処理を実装

**特徴**：
- 履歴テーブル不使用でシンプル実装
- 過去EVM値は現在データからの推測計算（精度制限あり）
- 迅速な価値提供が可能

#### 第2フェーズ：最小限履歴追加
効率的な時系列分析のため最小限の履歴機能を追加：

```sql
-- 追加テーブル
- evm_snapshots: 日次/週次EVMスナップショット
- task_status_changes: タスクステータス変更履歴（最小限）
```

**特徴**：
- 正確な時系列EVM分析が可能
- データ量を抑制した効率的な履歴管理

#### 第3フェーズ：高機能履歴
詳細な分析・予測機能のため充実した履歴機能を実装：

```sql
-- フル履歴テーブル（既存テーブルの再設計）
- wbs_progress_history: WBS進捗履歴（改良版）
- task_progress_history: タスク進捗履歴（改良版）
- progress_forecast_history: 予測履歴
```

**特徴**：
- 高度なトレンド分析
- 予測精度の向上
- 詳細なプロジェクト改善分析

### 3.2 段階別データ算出ロジック

#### 第1フェーズ：リアルタイム計算ロジック

**PV（計画価値）の算出**
```typescript
// 各タスクの計画工数を期間で按分し、評価日までの累積値を算出
PV = Σ(タスクの計画工数 × 評価日までの経過割合)
```

**EV（出来高）の算出**
```typescript
// 進捗率測定方法に応じて算出
EV = Σ(タスクの計画工数 × 進捗率)
// 進捗率は選択された測定方法（0/100法、50/50法）に依存
```

**AC（実コスト）の算出**
```typescript
// work_recordテーブルから実績工数を集計
AC = Σ(work_record.hours_worked)
```

**過去EVM値の推測計算**
```typescript
// 現在のデータから過去時点を推測（精度制限あり）
function estimateEVMAtDate(date: Date) {
  // タスク期間から当時の進捗状況を推測
  // ※正確性は保証されないが実装は簡単
}
```

#### 第2フェーズ：履歴併用計算ロジック

**スナップショット活用**
```typescript
// 保存済みスナップショットがあれば使用、なければリアルタイム計算
function getEVMAtDate(date: Date) {
  const snapshot = getEVMSnapshot(date);
  return snapshot ? snapshot : estimateEVMAtDate(date);
}
```

**日次自動スナップショット**
```typescript
// 毎日午前2時に前日のEVM値を自動計算・保存
// APIエンドポイント経由でスナップショット保存
cron.schedule('0 2 * * *', async () => {
  // アクティブなプロジェクトのスナップショットを保存
  await saveEVMSnapshotsViaAPI();
});
```

#### 第3フェーズ：高精度履歴計算ロジック

**完全な履歴再現**
```typescript
// 任意の過去時点でのEVM値を正確に計算
function calculateHistoricalEVM(date: Date) {
  // その時点での正確なタスク状況から計算
  // 予測精度分析も可能
}
```

## 4. アーキテクチャ設計

### 4.1 段階別レイヤー構成

#### 第1フェーズ：基本構成（履歴なし）
```
src/
├── domains/evm/              # EVMドメインモデル
│   ├── entities/
│   │   └── EvmMetrics.ts    # EVM指標エンティティ
│   └── services/
│       └── EvmCalculator.ts # EVM計算ロジック（リアルタイム）
│
├── applications/evm/         # アプリケーションサービス
│   ├── IEvmRepository.ts    # リポジトリインターフェース（基本）
│   └── EvmService.ts        # EVMサービス（推測計算含む）
│
├── infrastructures/evm/      # インフラストラクチャ層
│   └── EvmRepository.ts     # 基本データ取得のみ
│
├── app/actions/evm/         # Server Actions
│   └── evm-actions.ts       # EVM関連のserver action
│
└── components/evm/          # UIコンポーネント
    ├── EvmChart.tsx         # 基本チャート（推測履歴）
    ├── EvmDashboard.tsx     # 現在指標ダッシュボード
    └── EvmTabContent.tsx    # タブコンテンツ
```

#### 第2フェーズ：履歴機能追加
```
追加/変更ファイル：
├── domains/evm/entities/
│   └── EvmSnapshot.ts       # 新規：スナップショットエンティティ
│
├── applications/evm/
│   ├── IEvmHistoryRepository.ts  # 新規：履歴リポジトリIF
│   └── EvmHistoryService.ts      # 新規：履歴管理サービス
│
├── infrastructures/evm/
│   └── EvmHistoryRepository.ts   # 新規：履歴データ操作
│
├── app/actions/evm/
│   └── evm-history-actions.ts    # 新規：履歴管理server action
├── app/api/evm/
│   └── snapshots/route.ts        # 新規：自動スナップショット用API（cron専用）
│
└── lib/
    └── cron/
        └── evm-snapshot.ts       # 新規：自動スナップショット
```

#### 第3フェーズ：高機能履歴
```
追加/変更ファイル：
├── domains/evm/
│   ├── entities/
│   │   ├── ProgressForecast.ts   # 新規：予測エンティティ
│   │   └── EVMTrend.ts          # 新規：トレンド分析
│   └── services/
│       └── ForecastService.ts    # 新規：予測サービス
│
├── applications/evm/
│   └── AnalyticsService.ts       # 新規：高度分析サービス
│
└── components/evm/
    ├── TrendAnalysis.tsx         # 新規：トレンド分析UI
    └── ForecastChart.tsx         # 新規：予測チャート
```

### 4.2 依存性注入
`src/lib/inversify.config.ts`に以下を追加：
- IEvmRepository → EvmRepository
- EvmService

## 5. UI/UX設計

### 5.1 タブ追加
プロジェクト詳細ページのタブリストに「EVM」タブを追加：
- アイコン: TrendingUp (lucide-react)
- 位置: 「table」タブの後

### 5.2 レイアウト
```
┌─────────────────────────────────────────┐
│ サマリーカード（SPI, CPI, SV, CV）        │
├─────────────────────────────────────────┤
│ EVMチャート（PV, EV, AC推移）            │
├─────────────────────────────────────────┤
│ 詳細テーブル（タスク別EVM指標）           │
└─────────────────────────────────────────┘
```

## 6. パフォーマンス考慮

### 6.1 データ取得の最適化
- 必要なデータのみを選択的に取得
- 集計はデータベース側で実施（Prismaのgroupby使用）
- キャッシュ戦略（React Query使用）

### 6.2 表示の最適化
- チャートデータの間引き（大量データ時）
- 仮想スクロール（テーブル表示）
- 遅延ローディング

## 7. テスト計画

### 7.1 ユニットテスト
- EvmCalculator: 各指標の計算ロジック
- EvmService: サービス層のロジック
- コンポーネント: React Testing Library

### 7.2 統合テスト
- Repository: データベースアクセス
- API: エンドポイントの動作確認

## 8. 段階的拡張計画

### 8.1 第1フェーズ：基本EVM実装（現在）
**目標**: 迅速な価値提供とシンプルな実装

**実装内容**：
- 現在時点のEVM計算
- 基本的な時系列表示（推測ベース）
- 0/100法、50/50法による進捗率測定
- 工数ベースの算出

**制限事項**：
- 過去EVM値の精度制限
- 履歴データの蓄積なし

### 8.2 第2フェーズ：履歴機能追加
**目標**: 正確な時系列分析と効率的な履歴管理

#### 8.2.1 新規データベース設計
```sql
-- EVMスナップショット（最小限履歴）
CREATE TABLE evm_snapshots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  wbs_id INT NOT NULL,
  snapshot_date DATE NOT NULL,
  pv DECIMAL(12,2) NOT NULL,
  ev DECIMAL(12,2) NOT NULL,
  ac DECIMAL(12,2) NOT NULL,
  bac DECIMAL(12,2) NOT NULL,
  calculation_mode ENUM('hours', 'cost') DEFAULT 'hours',
  progress_method ENUM('0-100', '50-50', 'self-reported') DEFAULT '50-50',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_snapshot (wbs_id, snapshot_date),
  INDEX idx_wbs_date (wbs_id, snapshot_date)
);

-- タスクステータス変更履歴（最小限）
CREATE TABLE task_status_changes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  old_status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'),
  new_status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(255),

  INDEX idx_task_date (task_id, changed_at)
);
```

**注**: `wbs_task.progress_rate`フィールドと`wbs_assignee.cost_per_hour`フィールドは既に実装済みです。

#### 8.2.2 追加機能
- 自動日次スナップショット機能
- 正確な時系列EVM分析
- 自己申告進捗率の実装
- パフォーマンス向上（履歴データ活用）

### 8.3 第2.5フェーズ：金額ベース対応
**目標**: 金額ベースEVM算出機能

#### 8.3.1 データベース拡張

**注**: `wbs_assignee.cost_per_hour`フィールドは既に実装済みです（時間単位の原価、デフォルト5000円/時間）。

```sql
-- 単価履歴管理（将来的な拡張）
CREATE TABLE assignee_rate_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assignee_id INT,
  cost_per_hour DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'JPY',
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 8.3.2 UI機能
- 算出方式切り替え（工数 ⇔ 金額）
- 金額フォーマット表示
- 権限管理（金額情報の表示制御）

### 8.4 第3フェーズ：高機能履歴・分析
**目標**: 高度な分析と予測機能

#### 8.4.1 フル履歴テーブル（既存テーブル再設計）
```sql
-- WBS進捗履歴（改良版）
CREATE TABLE wbs_progress_history_v2 (
  id INT PRIMARY KEY AUTO_INCREMENT,
  wbs_id INT NOT NULL,
  recorded_at TIMESTAMP NOT NULL,
  record_type ENUM('AUTO', 'MANUAL', 'MILESTONE') DEFAULT 'AUTO',
  snapshot_name VARCHAR(255),

  -- EVM指標
  pv DECIMAL(12,2) NOT NULL,
  ev DECIMAL(12,2) NOT NULL,
  ac DECIMAL(12,2) NOT NULL,
  bac DECIMAL(12,2) NOT NULL,

  -- 予測指標
  eac DECIMAL(12,2),
  etc DECIMAL(12,2),
  spi DECIMAL(8,4),
  cpi DECIMAL(8,4),

  -- メタデータ
  calculation_mode ENUM('hours', 'cost'),
  progress_method ENUM('0-100', '50-50', 'self-reported'),
  metadata JSON,

  INDEX idx_wbs_recorded (wbs_id, recorded_at)
);

-- 予測履歴
CREATE TABLE forecast_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  wbs_progress_history_id INT,
  forecast_date DATE,
  predicted_completion_date DATE,
  predicted_total_cost DECIMAL(12,2),
  confidence_level DECIMAL(5,2),
  forecast_method VARCHAR(50),

  INDEX idx_history_date (wbs_progress_history_id, forecast_date)
);
```

#### 8.4.2 高度機能
- トレンド分析・予測精度評価
- 機械学習による予測改善
- カスタムレポート生成
- 他プロジェクトとの比較分析
- リアルタイム更新（WebSocket）

### 8.5 データエクスポート機能
- PDF レポート生成
- Excel ファイル出力
- BI ツール連携
- API for 外部システム連携

## 9. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 大量データでのパフォーマンス低下 | 高 | ページネーション、データ集約の実装 |
| 不完全なタスクデータ | 中 | デフォルト値設定、バリデーション強化 |
| 複雑な依存関係の計算 | 中 | 段階的な実装、シンプルな計算から開始 |

## 10. 段階別スケジュール

### 第1フェーズ：基本EVM実装（履歴なし）
**目標**: MVPとして迅速にリリース

1. ドメインモデル実装（1日）
   - EvmMetrics, TaskEvmData エンティティ
   - 進捗率測定方法（0/100法、50/50法）

2. リアルタイム計算ロジック実装（2日）
   - EVMサービス（推測計算含む）
   - 基本リポジトリ実装

3. API実装（1日）
   - 現在時点のEVM取得
   - 推測ベースの時系列データ

4. UIコンポーネント実装（2日）
   - 現在指標ダッシュボード
   - 基本チャート（推測履歴）

5. 統合・テスト（1日）

**第1フェーズ合計: 約7日間**

### 第2フェーズ：履歴機能追加
**目標**: 正確な時系列分析の実現

1. 履歴テーブル設計・実装（1日）
   - evm_snapshots, task_status_changes

2. 履歴サービス実装（1.5日）
   - スナップショット保存・取得
   - 自動スナップショット機能

3. API拡張（0.5日）
   - 履歴データ取得エンドポイント

4. UI改善（1日）
   - 正確な時系列チャート
   - 履歴管理機能

5. テスト・調整（1日）

**第2フェーズ合計: 約5日間**

### 第2.5フェーズ：金額ベース対応
**目標**: 金額ベースEVM算出

1. データベーススキーマ拡張（0.5日）
2. 金額計算ロジック追加（1日）
3. UI切り替え機能実装（1日）
4. 権限管理機能（0.5日）
5. テスト・調整（1日）

**第2.5フェーズ合計: 約4日間**

### 第3フェーズ：高機能履歴・分析
**目標**: 高度な分析・予測機能

1. フル履歴テーブル再設計（1日）
2. 予測・トレンド分析機能（2日）
3. 高度UIコンポーネント（2日）
4. 機械学習予測機能（3日）
5. エクスポート機能（1日）
6. 統合テスト（1日）

**第3フェーズ合計: 約10日間**

---

## 📊 総開発スケジュール

| フェーズ | 期間 | 累積期間 | 主な価値 |
|----------|------|----------|----------|
| **第1フェーズ** | 7日間 | 7日間 | 基本EVM分析 |
| **第2フェーズ** | 5日間 | 12日間 | 正確な履歴分析 |
| **第2.5フェーズ** | 4日間 | 16日間 | 金額ベース対応 |
| **第3フェーズ** | 10日間 | 26日間 | 高度分析・予測 |

**推奨アプローチ**: 第1フェーズ完了後にユーザーフィードバックを収集し、第2フェーズ以降の優先順位を調整