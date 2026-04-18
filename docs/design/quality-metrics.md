# 定量品質管理機能 設計書

## 1. 概要

### 1.1 目的

プロジェクトにおけるレビュー品質を定量的に把握・評価するため、レビュー対象物（成果物）ごとに品質指標を算出・可視化する機能を実装する。これにより以下が可能となる：

- レビュー対象物ごとの品質指標（レビュー密度・指摘密度等）の把握
- WBS / 機能（KINO_SBT） / 担当者など複数軸での品質比較
- 日次推移による品質トレンドの監視
- 目標値（閾値）との乖離状況の可視化
- 明細・集計データのTSV出力による外部分析（Excel連携）

### 1.2 スコープ

**含むもの**
- 評価対象の自動生成（MySQL WBSインポートに連動）
- 規模データ（PAGE / LOC / TEST_CASE）の手動登録・CSV一括取込
- 指摘データの手動登録・CSV一括取込
- 品質指標の算出（都度集計）
- WBS配下での品質ダッシュボード画面 `/wbs/[id]/quality`
- TSV出力（明細・集計の2種類）
- プロジェクト設定による閾値管理
- レビュー種別の区分

**含まないもの（今回スコープ外）**
- 指摘の是正ステータス管理
- 品質指標へのアクセス制御
- プロジェクト横断の品質ダッシュボード（将来拡張：プロジェクトタグ別集計）
- MySQL側のスキーマ変更（**変更しない**）

### 1.3 前提

- MySQL 側 `wbs` テーブルの定義は **変更しない**
- MySQL `wbs.TANTO_REV` は「レビュー担当者名」として運用する（項目名どおりの意味）
- WBSインポートジョブは `replace`（洗い替え）方針を維持する。品質メトリクス関連データは洗い替えから独立した別テーブルで管理する

---

## 2. 機能要件

### 2.1 主要な品質指標

| 指標名 | 計算式 | 単位例 | 備考 |
|---|---|---|---|
| レビュー密度 | レビュー工数 / 規模 | h/KL, h/page, h/TC | 規模の単位により単位が変動 |
| 指摘密度 | 指摘件数 / 規模 | 件/KL, 件/page | 同上 |
| Major指摘密度 | Major指摘件数 / 規模 | 件/KL | 重大度での層別化 |
| 指摘重大度比 | Major件数 / 全指摘件数 | % | 指摘の質を見る指標 |
| レビュー実施率 | レビュー完了対象数 / 評価対象総数 | % | 進捗管理用 |

### 2.2 規模の単位（`QualitySizeUnit`）

| 単位Enum | 表示名 | 用途 | 取得方法 |
|---|---|---|---|
| `MAN_HOUR` | 実績工数(h) | 汎用 | **WorkRecord から都度集計**（保存しない） |
| `PAGE` | ページ数 | 設計書など | 手動登録 / CSV取込 |
| `LINES_OF_CODE` | コード行数 | プログラム | 手動登録 / CSV取込 |
| `TEST_CASE` | テストケース数 | テスト仕様 | 手動登録 / CSV取込 |

### 2.3 評価対象の自動生成

**検出ルール**（WBSインポート後に実行）
- MySQL `wbs` のうち、`TANTO_REV` に値があるレコードを評価対象として検出
- `QualityReviewTarget` に `(wbsId, taskNo)` をキーとして upsert
- 削除検知：インポートで対象から外れたタスクは `isActive = false` にする（物理削除はしない）

**レビュー担当者の解決**
- 評価対象タスク自身 *以外* で「同じ wbsId」「同じ タスク名」のタスクをレビュータスクとして検出
- 各レビュータスクの `TANTO` がレビュー担当者
- 1評価対象に対して複数のレビュー担当者を保持（`QualityReviewer` に正規化）
- 各レビュータスクの `taskNo` を保持し、実績工数集計のキーとする

### 2.4 データ入力

| データ種別 | 手動UI | CSV一括取込 |
|---|---|---|
| 評価対象 | 対象外（自動生成） | 対象外 |
| 規模（実績工数） | 対象外（都度集計） | 対象外 |
| 規模（PAGE / LOC / TEST_CASE） | ○ | ○ |
| 指摘 | ○ | ○ |

### 2.5 表示機能

#### 2.5.1 品質サマリダッシュボード

- 指標カード（レビュー密度 / 指摘密度 / Major指摘密度 / レビュー実施率）
- プロジェクト設定の閾値（目標値）との比較表示（正常／警告／危険の3段階）
- フィルタ：フェーズ / 機能区分（KINO_SBT）/ レビュー担当者 / 期間
- 規模単位の選択UI（MAN_HOUR / PAGE / LINES_OF_CODE / TEST_CASE）

#### 2.5.2 日次推移グラフ

- 選択した指標の日次推移を折れ線グラフで表示
- X軸：日付 / Y軸：指標値
- 切替軸：対象ごと / 機能ごと / 担当者ごと
- 閾値ラインを併記表示

#### 2.5.3 評価対象一覧

- 評価対象ごとに各指標・規模・指摘件数を一覧表示
- 対象名クリックで明細画面へ遷移
- ソート・フィルタ可能

#### 2.5.4 評価対象明細画面

- 対象物の基本情報（名称 / 文書種別 / レビュー種別 / レビュー担当者一覧）
- 規模データの登録・編集UI
- 指摘データの登録・編集UI
- 対象単体での指標表示

### 2.6 エクスポート機能

- **明細TSV**：評価対象ごと1行、規模・指摘件数・各指標を列に展開
- **集計TSV**：集計軸（対象 / 機能 / 担当者 / 日付）で集計
- 既存の `src/utils/export-table.ts` の関数を流用
- BOM付き UTF-8、タブ区切り

---

## 3. データモデル設計

### 3.1 全体構造

```
Project
 └── ProjectSettings
      └── (拡張) 品質閾値 JSON

Wbs
 └── QualityReviewTarget (評価対象)
      ├── QualityReviewer[]   (レビュー担当者、複数)
      ├── QualitySizeMetric[] (規模、単位ごと)
      └── QualityFinding[]    (指摘、明細)
```

### 3.2 新規テーブル（PostgreSQL）

#### 3.2.1 QualityReviewTarget（評価対象）

```prisma
model QualityReviewTarget {
  id            Int                    @id @default(autoincrement())
  wbsId         Int                    // 論理結合（FK 貼らない）
  taskNo        String                 // 論理結合（FK 貼らない）
  name          String                 // 対象物名（初期値はタスク名）
  documentType  QualityDocumentType    @default(OTHER)
  reviewType    QualityReviewType      @default(PEER)
  isActive      Boolean                @default(true)
  createdAt     DateTime               @default(now()) @db.Timestamptz
  updatedAt     DateTime               @updatedAt @db.Timestamptz
  reviewers     QualityReviewer[]
  sizeMetrics   QualitySizeMetric[]
  findings      QualityFinding[]

  @@unique([wbsId, taskNo])
  @@index([wbsId, isActive])
}
```

**論理結合の方針**：`wbsId + taskNo` を論理キーとし、`WbsTask` への物理FKは貼らない。これによりWBSインポートの洗い替え（delete/insert）でもデータが消えない。タスク側が無くなった場合は `isActive = false` に更新する運用。

#### 3.2.2 QualityReviewer（レビュー担当者）

```prisma
model QualityReviewer {
  id              Int                  @id @default(autoincrement())
  targetId        Int
  reviewerUserId  String               // 解決済みの Users.id
  reviewTaskNo    String               // レビュータスクの taskNo（工数集計のキー）
  createdAt       DateTime             @default(now()) @db.Timestamptz
  updatedAt       DateTime             @updatedAt @db.Timestamptz
  target          QualityReviewTarget  @relation(fields: [targetId], references: [id], onDelete: Cascade)

  @@unique([targetId, reviewTaskNo])
  @@index([reviewerUserId])
}
```

#### 3.2.3 QualitySizeMetric（規模）

```prisma
model QualitySizeMetric {
  id          Int                  @id @default(autoincrement())
  targetId    Int
  unit        QualitySizeUnit
  value       Decimal              @db.Decimal(12, 2)
  measuredAt  DateTime             @db.Date
  note        String?
  createdAt   DateTime             @default(now()) @db.Timestamptz
  updatedAt   DateTime             @updatedAt @db.Timestamptz
  target      QualityReviewTarget  @relation(fields: [targetId], references: [id], onDelete: Cascade)

  @@unique([targetId, unit])
  @@index([measuredAt])
}
```

※ `MAN_HOUR` はここに保存しない（都度集計）。同一 target × 同一 unit のレコードは1件（最新値で上書き）。

#### 3.2.4 QualityFinding（指摘）

```prisma
model QualityFinding {
  id          Int                  @id @default(autoincrement())
  targetId    Int
  severity    QualitySeverity      @default(MINOR)
  category    String?
  description String?
  foundAt     DateTime             @db.Date
  createdAt   DateTime             @default(now()) @db.Timestamptz
  updatedAt   DateTime             @updatedAt @db.Timestamptz
  target      QualityReviewTarget  @relation(fields: [targetId], references: [id], onDelete: Cascade)

  @@index([targetId, foundAt])
  @@index([severity])
}
```

### 3.3 Enum

```prisma
enum QualityDocumentType { DESIGN CODE TEST OTHER }
enum QualityReviewType   { PEER FORMAL INSPECTION OTHER }
enum QualitySizeUnit     { MAN_HOUR PAGE LINES_OF_CODE TEST_CASE }
enum QualitySeverity     { MAJOR MINOR INFO }
```

### 3.4 既存モデルの拡張

#### ProjectSettings の拡張

品質指標の目標値（閾値）を保持するフィールドを追加：

```prisma
model ProjectSettings {
  // ... 既存フィールド
  qualityThresholds  Json?  // 品質閾値設定（後述）
}
```

`qualityThresholds` JSON 構造案：

```json
{
  "reviewDensity": { "unit": "PAGE", "warn": 0.3, "danger": 0.1 },
  "defectDensity": { "unit": "PAGE", "warn": 1.0, "danger": 3.0 },
  "majorDefectDensity": { "unit": "PAGE", "warn": 0.5, "danger": 1.0 }
}
```

※ `warn` / `danger` の意味は指標の性質に応じて決定する（レビュー密度は低いと警告、指摘密度は高いと警告）。

---

## 4. アーキテクチャ設計

### 4.1 ドメイン層（`src/domains/quality/`）

**エンティティ / 値オブジェクト**

- `QualityReviewTarget`（集約ルート）：評価対象エンティティ
- `QualityReviewer`：レビュー担当者エンティティ
- `QualitySizeMetric`：規模エンティティ
- `QualityFinding`：指摘エンティティ
- `QualityMetrics`（値オブジェクト）：算出済み指標のスナップショット
- `QualityThreshold`（値オブジェクト）：閾値
- `QualityStatus`（値オブジェクト）：NORMAL / WARNING / DANGER の判定

**ドメインサービス**

- `QualityMetricsCalculator`：指標計算ロジックの集約
  - `calcReviewDensity(manHours, size)`
  - `calcDefectDensity(count, size)`
  - `evaluateStatus(value, threshold)` など

### 4.2 アプリケーション層（`src/applications/quality/`）

#### 4.2.1 Commands（書き込み系）

- `SyncQualityTargetsCommand`（WBSインポート後に呼ばれる）
- `RegisterSizeMetricCommand` / `UpdateSizeMetricCommand` / `DeleteSizeMetricCommand`
- `RegisterFindingCommand` / `UpdateFindingCommand` / `DeleteFindingCommand`
- `ImportSizeMetricsFromCsvCommand`
- `ImportFindingsFromCsvCommand`

#### 4.2.2 Queries（読み込み系、CQRS Query Handler として実装）

- `GetQualitySummaryQuery`（サマリダッシュボード用）
- `GetQualityTargetsQuery`（評価対象一覧）
- `GetQualityTargetDetailQuery`（明細）
- `GetQualityTrendQuery`（日次推移グラフ用）
- `ExportQualityTsvQuery`（TSV 出力用データ）

#### 4.2.3 Repository インターフェース

```ts
interface IQualityReviewTargetRepository {
  upsertMany(targets: QualityReviewTarget[]): Promise<void>;
  deactivateMissing(wbsId: number, activeTaskNos: string[]): Promise<void>;
  findById(id: number): Promise<QualityReviewTarget | null>;
  findByWbs(wbsId: number, filter?: TargetFilter): Promise<QualityReviewTarget[]>;
}

interface IQualityReviewerRepository {
  replaceForTarget(targetId: number, reviewers: QualityReviewer[]): Promise<void>;
}

interface IQualitySizeMetricRepository { ... }
interface IQualityFindingRepository { ... }

interface IQualityMetricsReadModelRepository {
  // 指標計算用のクロスクエリ
  getSizeMetrics(targetIds: number[]): Promise<...>;
  getFindingCounts(targetIds: number[], filters: TrendFilter): Promise<...>;
  getReviewManHours(reviewTaskNos: { wbsId: number; taskNo: string }[]): Promise<...>;
}
```

### 4.3 インフラ層（`src/infrastructures/quality/`）

- `QualityReviewTargetPrismaRepository`
- `QualityReviewerPrismaRepository`
- `QualitySizeMetricPrismaRepository`
- `QualityFindingPrismaRepository`
- `QualityMetricsReadModelPrismaRepository`

### 4.4 WBSインポートジョブへの組み込み

**実装方針**：既存の WBS インポート処理完了後に、品質メトリクス同期処理を呼び出す。

```
ImportJobApplicationService.executeWbsImport()
  ├── 既存: MySQL→PostgreSQL WBSデータ同期
  └── 追加: SyncQualityTargetsCommand.execute(wbsId)
       ├── TANTO_REV に値のあるタスクを列挙
       ├── QualityReviewTarget を upsert
       ├── 同名タスクからレビュー担当者を解決
       ├── QualityReviewer を入れ替え保存
       └── TANTO_REV から外れたタスクを isActive=false 化
```

同期処理は WBS インポートと同一トランザクションにはしない（疎結合を保つため）。失敗時は WBS インポート自体は成功扱いとし、別途リトライ可能とする。

### 4.5 DI コンテナ登録

`src/lib/inversify.config.ts` に以下を追加：

- `IQualityReviewTargetRepository` → `QualityReviewTargetPrismaRepository`
- `IQualityReviewerRepository` → `QualityReviewerPrismaRepository`
- `IQualitySizeMetricRepository` → `QualitySizeMetricPrismaRepository`
- `IQualityFindingRepository` → `QualityFindingPrismaRepository`
- `IQualityMetricsReadModelRepository` → `QualityMetricsReadModelPrismaRepository`
- 各 Command / Query Handler

---

## 5. 画面設計

### 5.1 ルーティング

```
/wbs/[id]/quality
  ├── page.tsx              サマリダッシュボード
  ├── targets/
  │   ├── page.tsx          評価対象一覧
  │   └── [targetId]/
  │       └── page.tsx      評価対象明細（規模・指摘の登録UI）
  └── import/
      └── page.tsx          CSV取込画面（規模 / 指摘）
```

### 5.2 サマリダッシュボード（`/wbs/[id]/quality`）

- 上部：フィルタパネル（フェーズ / 機能区分 / 担当者 / 期間 / 規模単位切替）
- 中段：指標カード 4枚（レビュー密度 / 指摘密度 / Major指摘密度 / レビュー実施率）
- 下段：日次推移グラフ（Y軸指標値、X軸日付、閾値ライン併記）
- 下部：評価対象一覧（上位N件、各対象の指標サマリ）

### 5.3 評価対象一覧（`/wbs/[id]/quality/targets`）

- テーブル表示：対象名 / 文書種別 / レビュー種別 / レビュー担当者 / 実績工数 / 規模 / 指摘件数 / レビュー密度 / 指摘密度 / ステータス
- ソート / フィルタ機能
- 行クリックで明細へ遷移
- TSV出力ボタン

### 5.4 評価対象明細（`/wbs/[id]/quality/targets/[targetId]`）

- 対象物の基本情報表示
- 文書種別・レビュー種別・対象物名の編集UI
- 規模データセクション（単位ごとの登録・編集）
- 指摘データセクション（重大度・カテゴリ・内容・発見日の登録・編集）
- 対象単体での指標サマリ

### 5.5 CSV取込画面（`/wbs/[id]/quality/import`）

- 取込種別の選択（規模 / 指摘）
- ファイルアップロード
- プレビュー（検証結果の表示）
- 取込モード選択（merge / replace）
- 実行ボタン

---

## 6. CSVフォーマット

### 6.1 規模CSV

| 列名 | 必須 | 例 | 備考 |
|---|---|---|---|
| wbsId | ○ | 12 | 論理結合キー |
| taskNo | ○ | T-001 | 論理結合キー |
| unit | ○ | PAGE | `PAGE` / `LINES_OF_CODE` / `TEST_CASE`（`MAN_HOUR` は不可） |
| value | ○ | 15.00 | 数値 |
| measuredAt | ○ | 2026-04-18 | ISO日付 |
| note | | | 備考 |

### 6.2 指摘CSV

| 列名 | 必須 | 例 | 備考 |
|---|---|---|---|
| wbsId | ○ | 12 | 論理結合キー |
| taskNo | ○ | T-001 | 論理結合キー |
| severity | ○ | MAJOR | `MAJOR` / `MINOR` / `INFO` |
| category | | 論理誤り | 任意カテゴリ |
| description | | ... | 指摘内容 |
| foundAt | ○ | 2026-04-18 | ISO日付 |

### 6.3 取込処理仕様

- **merge モード**：既存の同一キーレコードは更新、無いものは追加
- **replace モード**：対象 target の既存データを削除してから一括追加
- エラー時は1件もコミットせず、エラー明細を返す
- エンコーディングは BOM付きUTF-8対応

---

## 7. 指標算出ロジック

### 7.1 レビュー工数の集計

対象評価の `QualityReviewer[].reviewTaskNo` を使って、対応するレビュータスクの `WbsTask.id` を解決し、`WorkRecord` の `hours_worked` を合計する：

```
レビュー工数 = Σ WorkRecord.hours_worked
  WHERE taskId ∈ (reviewTaskNo から解決した WbsTask.id の集合)
    AND date ∈ [対象期間]
```

### 7.2 規模の取得

- `MAN_HOUR` が選択された場合 → 評価対象タスク本体の `WorkRecord.hours_worked` 合計（レビュータスクではなく元タスク）
- それ以外 → `QualitySizeMetric` から最新値を取得

### 7.3 指標計算

```
レビュー密度      = レビュー工数 / 規模
指摘密度          = 全指摘件数 / 規模
Major指摘密度     = Major指摘件数 / 規模
指摘重大度比      = Major指摘件数 / 全指摘件数
レビュー実施率    = (レビュー工数 > 0 の対象数) / 総評価対象数
```

**ゼロ除算回避**：規模が 0 または未登録の対象は該当指標を `null` として扱い、UI 上は「-」表示。

### 7.4 日次推移

- 指摘件数：`QualityFinding.foundAt` を日次集計
- レビュー工数：`WorkRecord.date` を日次集計
- 規模：`QualitySizeMetric.measuredAt` の累積最新値
- 指標値：上記3要素を日次で組み合わせて算出

---

## 8. テスト戦略

### 8.1 ユニットテスト

- `QualityMetricsCalculator` の各計算メソッド（ゼロ除算 / 小数精度 / 丸め含む）
- `QualityReviewTarget` エンティティの不変条件
- `QualityStatus` の閾値判定（境界値テスト）
- CSV取込のバリデーション

### 8.2 統合テスト

- リポジトリ：upsert / deactivate / クロスクエリ集計
- WBSインポート連動の同期処理（複数レビュータスクの解決を含む）
- 論理結合キーが洗い替え後も維持されることの確認
- CSV取込の merge / replace モード

### 8.3 コンポーネントテスト

- サマリダッシュボードの表示
- 規模・指摘の登録フォーム（バリデーション含む）
- TSV出力ボタン

---

## 9. 非機能要件

### 9.1 性能

- 評価対象が1WBSあたり数百〜数千規模を想定
- 日次推移グラフは最大1年分を想定
- 集計クエリはインデックスで最適化（主に `targetId`、`foundAt`、`measuredAt`）

### 9.2 データ保全

- `QualityReviewTarget` は論理削除（`isActive = false`）とし物理削除しない
- 子テーブル（規模・指摘）は親が論理削除されても残す（履歴として保持）
- CSV取込は取込前の状態に戻せるよう、`ImportJob` テーブルへジョブ履歴を残す

### 9.3 日時の扱い

プロジェクト既定の「UTC 保存・ユーザーTZ 表示」ポリシーに準拠：
- `measuredAt` / `foundAt` は `@db.Date`（日付のみ）
- 作成・更新日時は `@db.Timestamptz`（UTC）
- API 入出力は ISO 8601 UTC

---

## 10. 実装計画（概略）

TDD に準拠しつつ、以下の順序で段階的に実装する：

1. **Phase 1：スキーマ・ドメイン基盤**
   - Prisma スキーマ追加・マイグレーション
   - ドメインエンティティ / 値オブジェクト / ドメインサービス
   - ユニットテスト

2. **Phase 2：リポジトリ・評価対象自動生成**
   - リポジトリ実装
   - `SyncQualityTargetsCommand`
   - WBSインポートへの組み込み
   - 統合テスト

3. **Phase 3：規模・指摘の登録機能**
   - Commands / Handlers 実装
   - 登録UI / 編集UI
   - 明細画面

4. **Phase 4：指標算出・ダッシュボード**
   - Query Handlers 実装
   - サマリダッシュボード
   - 日次推移グラフ
   - 評価対象一覧

5. **Phase 5：CSV取込・TSV出力**
   - CSV 取込機能（規模 / 指摘）
   - TSV 出力（明細 / 集計）

6. **Phase 6：閾値管理**
   - `ProjectSettings.qualityThresholds` 拡張
   - 設定画面
   - ダッシュボードへの閾値反映

---

## 11. 将来拡張（スコープ外）

- プロジェクトタグ別のクロスプロジェクト集計
- 指摘の是正ステータス管理
- レビュー観点・チェックリストの管理
- 品質レポートの自動生成（PDF/Markdown）
- 権限制御（指摘内容の閲覧制限）

---

## 12. 用語集

| 用語 | 意味 |
|---|---|
| 評価対象 | 品質指標の算出単位となる成果物。MySQL WBS タスクと1対1で対応する |
| レビュータスク | 評価対象タスクと同名で別担当者（レビュー担当）が行うタスク。MySQL WBS に1つ以上存在する |
| 規模 | 品質指標の分母となる量。工数・ページ数・行数・テストケース数など |
| 指摘 | レビューで発見された問題点。重大度（Major/Minor/Info）を持つ |
| 論理結合キー | `wbsId + taskNo` の組み合わせ。洗い替えインポート後も維持されるキー |

---

## 13. 変更履歴

| 日付 | 版 | 内容 | 作成者 |
|---|---|---|---|
| 2026-04-18 | 1.0 | 初版作成 | Claude |
