# 計画書: WBS差分同期(upsert)導入 と 進捗スナップショット履歴によるEVM時系列の根本対応

## 1. 背景と目的

### 解決したい根本課題
EVMの時系列グラフにおいて、**過去日のEV（出来高）が現時点の進捗率で計算され、過去のSV/CV/SPI/CPIが無意味**になっている。
原因は `wbs_task.progressRate` が「最新値の上書き」しか保持せず、**進捗率の履歴が存在しない**こと。上流（Excel → Geppo MySQL `wbs.PROGRESS_RATE`）も現在値のみで、過去は復元不能。

### 付随して判明した構造課題
WBS同期が **洗い替え（replaceAll：全タスク削除→再作成）** であるため：
- タスクの `id` が毎回変わり、`(wbsId, taskNo)` でしか同一性を辿れない
- 削除時に **WorkRecord.taskId が NULL 化**（SetNull）され、実績(AC)の紐づけが切れる
- **TaskStatusLog が存在すると削除が Restrict で失敗**しうる（潜在バグ）
- `update()` の period/kosu が `id ?? 0` 強制createのため、upsert化すると**工数が重複蓄積**する地雷がある

### このドキュメントのゴール
上記を解決するための **2施策**を、実現性・リスク・順序まで含めて計画する。
1. **WBS差分同期(upsert)導入** … 同期の堅牢化。タスク `id` を安定化し、soft-delete を導入。
2. **進捗スナップショット履歴** … 進捗を時点データとして記録し、EVを正しく時系列再現。

### 進め方（決定事項）
- **順序：upsert 先行 → スナップショット**（id安定・soft-delete を基盤化してからスナップショットを安定id上に載せる）
- **導入形態：新モード追加**（既存 `replaceAll` は残し、差分upsertモードを追加。段階移行・ロールバック容易）
- 既に実装済みの **提案C（EV近似の時間配分）が当面のEVMトレンドをカバー**するため、upsert先行でも実害は小さい

---

## 2. 全体ロードマップ

| Stage | 施策 | 目的 | 状態 |
|---|---|---|---|
| 0 | 提案C（EV近似の時間配分） | 暫定でEVトレンドを改善 | **実装済み** |
| 1 | WBS差分同期(upsert)基盤 | id安定化・soft-delete・実績紐づけ保持 | 本計画 |
| 2 | 進捗スナップショット履歴 | EVを時点進捗で正しく再現 | 本計画（Stage1後） |
| 3 | 仕上げ（クリーンアップ／任意のreplaceAll廃止） | 一本化・運用整理 | 本計画（任意） |

各施策は独立PRに分割可能。Stage1完了をもってStage2に着手する。

---

## 3. Stage 1: WBS差分同期(upsert)の導入

### 3.1 方針
`replaceAll` を残したまま、新メソッド **`syncDiff(wbsId)`**（差分upsert + soft-delete）を `WbsSyncApplicationService` に追加する（[wbs-sync-application.service.ts](../../src/applications/wbs-sync/wbs-sync-application.service.ts)）。
処理の骨子：

```
[フェーズ1: 事前検証（DB更新なし）]
  全Excel行をドメイン変換・バリデーション
  → 1件でもエラーがあれば、DBを一切更新せず中断（原子性の担保）

[フェーズ2: 差分適用（$transaction内）]
  Excelタスク集合 E（taskNoで識別） と DB既存集合 D（論理削除済みも含む）を突き合わせ
    - E ∩ D(有効)        → update（id保持、period/kosu入れ替え）
    - E ∩ D(削除済み)     → revive（isDeleted=false, deletedAt=null）＋ update
    - E − D（新規）       → create
    - D(有効) − E（消失） → soft-delete（isDeleted=true, deletedAt=now）
  差分カウント added/updated/deleted を実数で算出（revive は updated に含める）
```

> **設計上の必須ポイント**
> - **照合は「論理削除済みを含む」集合Dで行う**。削除済み taskNo がExcelに再登場した場合に `create` すると `@@unique([taskNo, wbsId])`（[prisma/schema.prisma](../../prisma/schema.prisma)）に違反するため、**revive（復活）**で扱う。
> - **catch-継続では原子性が保証されない**。現行 `replaceAll` はタスク単位で例外をcatchして処理継続するため（[wbs-sync-application.service.ts](../../src/applications/wbs-sync/wbs-sync-application.service.ts)）、`$transaction` で囲んでもエラー行をスキップして正常行だけcommitしてしまう。**フェーズ1の事前一括検証**で「1件でもエラーならDB更新前に終了」する構造にする。

### 3.2 サブステップ（PR分割単位）

#### 1A. period/kosu の入れ替えロジック是正（最優先・前提）
`taskRepository.update()` は period/kosu を `upsert(where:{ id ?? 0 })` で**毎回create**するため、update経路では重複蓄積する（[task-repository.ts](../../src/infrastructures/task-repository.ts)）。
- 対応：更新タスクごとに **既存 period/kosu を deleteMany → Excel内容で再作成**（TaskPeriod/TaskKosu は `onDelete: Cascade` なので安全）。
- 実現性：高。`replaceAll` 経路は影響を受けない（createのみのため）ので独立リリース可能。

#### 1B. taskNo upsert（存続・復活タスクのupdate化）
- `@@unique([taskNo, wbsId])` を用いた upsert を実装。存続タスクは update され **id が保持**される。
- **削除済みtaskNoの再登場は `revive`（`isDeleted=false`/`deletedAt=null`）＋update**で扱う。`create`すると複合ユニーク違反になるため、照合対象に削除済みを含めること。
- これにより WorkRecord/TaskStatusLog/TaskDependency の紐づけが切れない。
- 実現性：高。Prisma の複合ユニークによる upsert は標準対応。

#### 1C. 差分検出 + soft-delete（＋リポジトリ取得メソッドの分離）
- Excelから消えた taskNo を差集合で検出し **論理削除**する。
- スキーマに soft-delete 列を追加：`WbsTask.isDeleted Boolean @default(false)` / `deletedAt DateTime?`。
- **リポジトリの取得メソッドを用途別に分離**：
  - `findActiveByWbsId`（`where:{ isDeleted:false }`）… 通常の表示・集計・EVM・geppoマッピング用
  - `findIncludingDeletedByWbsId` … **`syncDiff` の照合用**（再登場の検出に削除済みが必要）／**`replaceAll` の全削除用**
  - ⚠️ `findByWbsId` を一律に有効タスク限定へ変えると、**既存 `replaceAll` がtombstoneを削除できず**、同じ taskNo の再createで複合ユニーク違反になる（[task-repository.ts](../../src/infrastructures/task-repository.ts) の削除ループは「削除済み込み」を見る必要がある）。
- 全タスク取得系クエリに `where: { isDeleted: false }` を適用（影響範囲は要洗い出し：EVM・サマリ・WBS表示・geppoタスクマッピング等）。
- 物理削除を避ける理由：WorkRecord(SetNull)/TaskStatusLog(Restrict) の制約回避、実績保持、EVMのtombstone化。
- 実現性：中。**既存クエリへの `isDeleted=false` 反映漏れが最大の注意点**（後述リスク）。

#### 1D-pre. 事前検証フェーズの追加（原子性の担保）
- 現行はタスク単位で例外をcatchして継続するため、transactionで囲んでも**部分commit**が起きる。
- **全Excel行のドメイン変換・バリデーションを先に一括実行**し、エラーが1件でもあれば**DB更新前に終了**する「検証フェーズ」を `syncDiff`（および将来的に `replaceAll`）へ追加する。
- バリデーションエラー一覧は従来どおり `errorDetails` に集約して返す。

#### 1D. トランザクション化 + 差分カウント
- `replaceAll` 内 `// TODO: ここからトランザクション貼る` を含め、`syncDiff` の**差分適用フェーズ**を `prisma.$transaction` で囲む。
- **ただしtransaction単独では原子性は不十分**（catch-継続のため）。必ず **1D-pre の事前検証フェーズと併用**する。
- `deletedCount/addedCount/updatedCount` を実差分で算出（現状は deleted=全件, updated=0 固定）。
- **revive は `updatedCount` に含める**（独立カウンタは持たない）。現行 `SyncResult`（[ExcelWbs.ts](../../src/domains/sync/ExcelWbs.ts)）・`SyncLog` には added/updated/deleted しか無いため、reviveを独立項目にするとスキーマ追加が必要になる。reviveは「削除フラグ解除＋内容更新」であり update の一種として扱うのが妥当。
- 実現性：中。リポジトリが内部で `prisma` を直接参照しているため、トランザクションクライアント(tx)の引き回し方式を決める必要あり（後述）。

### 3.3 影響を受けるFK（設計確認済み）

| 子テーブル | taskId | onDelete（既定含む） | upsert後の扱い |
|---|---|---|---|
| TaskPeriod / TaskKosu | 必須 | Cascade | 更新タスクで入れ替え（1A） |
| TaskDependency | 必須 | Cascade | id保持で温存 |
| WorkRecord（AC源） | `Int?` | SetNull | id保持で**紐づけ維持**（改善点） |
| TaskStatusLog | `Int` | Restrict | id保持で**Restrict衝突回避**（改善点） |

### 3.4 Stage1の主要リスクと対応

| リスク | 影響 | 対応 |
|---|---|---|
| soft-delete のクエリ反映漏れ | 削除タスクが各画面に残存／二重計上 | `isDeleted=false` の適用箇所を全数洗い出し、共通クエリ層で強制 |
| 削除済みtaskNoの再登場 | createで複合ユニーク違反→同期失敗 | 照合を「削除済み込み」で行い revive で復活（1B）。`replaceAll` 用に `findIncludingDeletedByWbsId` を分離（1C） |
| catch-継続による部分commit | エラー時に正常タスクだけ反映され不整合 | 事前一括検証フェーズ（1D-pre）でエラー時はDB更新前に終了 |
| period/kosu 重複（1A未対応でupsert） | 工数二重計上→PV/BAC破綻 | 1Aを1Bより**必ず先**に入れる |
| トランザクション境界 | 途中失敗で不整合 | `$transaction(tx => ...)` でリポジトリにtxを渡す設計を先に確定（＋1D-pre併用） |
| taskNo変更（rename） | 履歴分断（delete+add扱い） | **本計画では救わない**（割り切り）。将来の手動マッピングは別途検討 |
| geppoインポートとの順序依存 | AC紐づけタイミング | id保持により依存が緩和。ただし新規タスクの初回は従来どおりtaskNoで紐づけ |

---

## 4. Stage 2: 進捗スナップショット履歴

### 4.1 方針
WBS同期（`syncDiff`、必要なら `replaceAll` にも）実行時に、取り込んだ進捗を **時点データ・自己完結** で履歴テーブルに追記。EVは「評価日時点で有効な最新スナップショット」を引いて計算する。Stage1で **id が安定**するため、スナップショットは安定idで同定する。

**現在値画面と履歴計算でタスクの母集団取得方針を分ける**（重要）：
- **現在値（today）画面**：`findActiveByWbsId`（有効タスクのみ）を使う。
- **履歴（時系列）計算**：**現在の有効タスクではなく、スナップショット履歴からタスク母集団を構成する**。soft-delete されたタスクも、tombstone以前の評価日では計算対象に含める必要があるため。各評価日では、その時点の最新スナップショットが `isRemoved=true`（tombstone）のタスクだけを除外する。
  - 現在の有効タスクだけを母集団にすると、削除済みタスクが tombstone 以前の評価日でも一切現れず、**削除前のEVが再現できない**。

### 4.2 スキーマ案

```prisma
model TaskProgressSnapshot {
  id              Int        @id @default(autoincrement())
  taskId          Int        // ← Stage1でid安定化済み。安定キーとして使用
  wbsId           Int
  taskNo          String     // 監査・フォールバック照合用に併記
  snapshotAt      DateTime   @db.Timestamptz  // 同期実行時刻（UTC・時刻まで保持）
  progressRate    Decimal?   // SELF_REPORTED用。status系では未使用のためnullable
  status          TaskStatus
  // --- 自己完結のための当時値（EV/BAC算出に必須 → NOT NULL） ---
  plannedManHours Decimal    // 必須
  baseManHours    Decimal    // 必須
  costPerHour     Decimal    // 必須（コストモードEVが単価を使うため）
  // --- 当時の期間（PV/基準PV計算用。期間未設定タスクのみnull） ---
  plannedStart    DateTime?  @db.Date
  plannedEnd      DateTime?  @db.Date
  baseStart       DateTime?  @db.Date
  baseEnd         DateTime?  @db.Date
  // --- 当時の実績期間（提案Cフォールバックの位相計算用。WorkRecordのmin/max日付） ---
  actualStart     DateTime?  @db.Date
  actualEnd       DateTime?  @db.Date
  // --- tombstone ---
  isRemoved       Boolean    @default(false) // soft-delete連動
  syncLogId       Int        // 生成元の成功SyncLog（同一transaction内で先に採番）
  syncLog         SyncLog    @relation(fields: [syncLogId], references: [id])
  createdAt       DateTime   @default(now()) @db.Timestamptz

  @@index([taskId, snapshotAt])
  @@index([wbsId, snapshotAt])
  @@index([syncLogId])
  @@map("task_progress_snapshot")
}
```

> `SyncLog` 側にも逆リレーション（`snapshots TaskProgressSnapshot[]`）を追加する。

> **自己完結の徹底**：コストモードのEVは `costPerHour` を使う（[task-evm-data.ts](../../src/domains/evm/task-evm-data.ts) の出来高計算）。単価は担当者(`wbsAssignee.costPerHour`)由来で**担当者変更・単価改定で過去EVが変わってしまう**（[wbs-evm-repository.ts](../../src/infrastructures/evm/wbs-evm-repository.ts)）。よって `costPerHour` を必須でスナップショットに含める。提案Cの位相計算は予定/基準期間も使うため、当時の `plannedStart/End`・`baseStart/End` も保持する。
>
> **同日複数同期・時刻基準**：`@db.Date` では時刻が落ち、同日複数同期で「最新」が不定になり、訂正同期も表現できない。**時刻まで持つ `snapshotAt @db.Timestamptz`（UTC基準、本リポジトリの日時ポリシー準拠）を主軸**にする。日単位に丸めたい運用では代替として `@@unique([taskId, snapshotDateUTC])` でupsert（同日上書き）方式も可。as-of比較は `snapshotAt ≤ evaluationDate` のepoch比較で行う。

### 4.3 書き込み（トランザクション境界とsyncLogIdの採番）
スナップショットは `syncLogId`（生成元の成功SyncLog）を持つため、**SyncLogの採番とtask更新・snapshot追記を同一transactionに含める**必要がある。現行 `recordSync()` は `void` を返すため（[ISyncLogRepository.ts](../../src/applications/excel-sync/ISyncLogRepository.ts)）、このままでは `syncLogId` を設定できない。

修正方針：

1. **`recordSync()`（または新メソッド）が採番した `id` を返す**ようインターフェースを変更する。
2. 差分適用 `$transaction` の**先頭で成功SyncLog（暫定 `SUCCESS`）を作成して `id` を取得**。
3. 同じtxで **task更新（upsert/revive/soft-delete）→ 各タスクのsnapshot追記（`syncLogId` 付与）** を行う。
4. soft-delete されたタスクには `isRemoved=true` のtombstoneスナップショットを記録（除外時刻＝`snapshotAt`）。

> 現行のように「データ更新commit後にログを別途記録」する構造だと、**更新は反映済みなのにログ作成失敗でFAILED扱い**になる不整合が起きる。ログ採番とデータ更新を同一txに入れることでこれを防ぐ（失敗時は全ロールバック）。エラー時のFAILEDログは、txの外（catch側）で別途記録する。

### 4.4 読み出し（as-of）— 履歴一括取得＋メモリでas-of解決
現在の時系列処理は性能最適化として **WBSデータと作業記録を「now時点で1回だけ取得」し、各評価日をメモリ内で計算**している（[evm-service.ts](../../src/applications/evm/evm-service.ts) の `buildCumulativeAcFn` / `computeTimeSeries`、累積ACも同方式）。

この設計と矛盾しないよう、スナップショットも**「単一評価日の最新1件」ではなく「対象期間内の全スナップショット履歴」を1回で取得し、各評価日のas-ofをEvmService側で解決**する。

- **リポジトリ（取得範囲に注意）**：`getWbsEvmData` を「now基準のタスク現況」取得のまま維持しつつ、**スナップショット履歴を返すメソッドを追加**（例：`getProgressSnapshots(wbsId, toDate)`）。
  - ⚠️ **`fromDate` 以降だけを取得してはいけない**。表示期間開始（`fromDate`）時点で有効なのは、それ以前の最新スナップショットの場合があるため（例：最終snapshotが5月、表示が6月開始 → 6月時点で有効な5月のsnapshotが取れない）。
  - 取得方針はいずれか：**(a) `snapshotAt ≤ toDate` を全件取得**（シンプル・推奨）、または **(b) 期間内履歴 ＋ 各taskの `fromDate` 以前の最新1件（seed）を取得**。
  - 累積ACと同じく **1クエリ取得 → taskId別ソート済み配列**で保持。
  - 補足：`IWbsEvmRepository.getWbsEvmData(wbsId, evaluationDate)` はインターフェース上 evaluationDate を受け取るのに実装が無視している（[iwbs-evm-repository.ts](../../src/applications/evm/iwbs-evm-repository.ts)）。この引数は廃止し、**単一評価日でのフィルタはリポジトリで行わない**（履歴取得は上記の別メソッドに役割を移す）。
- **EvmService（as-of解決）**：各タスクについて、メモリ上の履歴配列から「評価日時点で有効な最新」スナップショットをas-of解決（累積ACの `computeCumulativeAc` と同型のクロージャ）。
- **EVだけでなく PV / 基準PV(PV_base) / BAC もすべてsnapshot値でas-of計算する（重要）**。現行 `computeMetricsFromData`（[evm-service.ts](../../src/applications/evm/evm-service.ts)）は **PV・基準PV・BACを現在の `wbsData.tasks` から計算**しており、予定工数・基準工数・期間が変更されると**過去のPV/BACまで現在値で再計算**されてしまう。履歴計算では各評価日のスナップショット集合からタスクを再構築し、以下を当時の値で算出する：

  | 指標 | 使用するsnapshot値 |
  |---|---|
  | PV | `plannedManHours` / `plannedStart` / `plannedEnd` |
  | 基準PV(PV_base) | `baseManHours` / `baseStart` / `baseEnd` |
  | EV | `plannedManHours`（cost時 × `costPerHour`）× 進捗率 |
  | BAC | `baseManHours`（cost時 × `costPerHour`）＋ バッファ |

  ※AC は従来どおりWorkRecordの日次累積（[evm-service.ts](../../src/applications/evm/evm-service.ts) の `buildCumulativeAcFn`）。
- **進捗率はスナップショットから直接算出する（提案Cの線形按分を再適用しない）**：
  - `SELF_REPORTED` → `snapshot.progressRate`（COMPLETED時は100%強制は維持）
  - `ZERO_HUNDRED` → `snapshot.status` から 0 / 100
  - `FIFTY_FIFTY` → `snapshot.status` から 0 / 50 / 100
  - ⚠️ 現行 `TaskEvmData.effectiveRateAtDate`（[task-evm-data.ts](../../src/domains/evm/task-evm-data.ts)）は「最新進捗しか無い」前提で**線形按分する暫定処理**。スナップショットがある評価日でこれをそのまま使うと**提案Cの按分が二重に掛かり破綻**する。実装は **スナップショット専用の直接計算パスを追加**するか、`getEarnedValue`/PV計算に「按分しない（スナップショット値をそのまま使う）」モードを設ける。**現行のEV/PVメソッドをそのまま再利用しない**ことを明記する。
- **日次評価日とsnapshotAtの比較規則（要明記）**：`snapshotAt` は時刻を保持するが時系列の評価日は日付単位のため、**「評価日 d の終了時刻（＝翌日 00:00 未満）までの最新snapshotを d に反映する」**規則とする（例：6/6 15:00 の同期は 6/6 の評価値から反映）。比較は **UTC基準のepoch**で行い、表示TZとの差異の扱いは日時ポリシー（[CLAUDE.md](../../CLAUDE.md)）に従う。TZ境界の最終確定は §9 未解決に残す。
- `isRemoved` のスナップショットが最新なら、その評価日でそのタスクは寄与0（スコープ外）。
- **スナップショットが存在しない区間（＝そのタスクの最初のスナップショットより前の評価日）だけ、実装済みの提案C（[task-evm-data.ts](../../src/domains/evm/task-evm-data.ts) の時間配分）にフォールバック**する。
  - 提案Cは `actualStartDate` / `actualEndDate` を使う（[task-evm-data.ts](../../src/domains/evm/task-evm-data.ts)）。**削除済みタスクは現在値の母集団に居ないため、実績期間をsnapshotから取れるよう `actualStart` / `actualEnd` をスナップショットに保持**する（上記スキーマ）。
  - 代替：削除済みを含む `taskId` について WorkRecord を別途取得して実績期間（min/max日付）を構築する方式も可。**snapshot保持（自己完結）を推奨**。

> アンチパターン：
> - リポジトリに評価日を渡し「その日の最新snapshot 1件」を返す設計にすると、**全過去日に同一snapshotが使われ**、時系列が再び破綻する。必ず履歴を返してService側でas-of解決する。
> - スナップショットの `progressRate` を提案Cの按分計算に通すと、**確定した時点進捗を再び按分してしまう**。スナップショットがある評価日は直接計算、無い区間のみ提案Cにフォールバックする。

### 4.5 進捗低下（90%→50%）の扱い
- **既定：そのまま記録（EVが下がる＝正直）**。手戻りを正しく反映。
- **任意：表示側に「単調化（ハイウォーターマーク）」トグル**を用意（入力ミス対策）。
- **訂正手段**：再同期で今後値は是正されるが過去スナップショットは残るため、過去スナップショットの無効化/訂正（admin操作 or supersedeフラグ）を用意。

### 4.6 バックフィル
- SELF_REPORTED の過去進捗は上流に履歴がなく**復元不可** → **導入時点から記録開始**。
- ステータス系（ZERO_HUNDRED/FIFTY_FIFTY）は、`TaskStatusLog`（status変更履歴, changedAt）が実運用で書かれていれば、そこから過去のstatus系EVを部分遡及できる（**任意**）。

### 4.7 Stage2の主要リスクと対応

| リスク | 影響 | 対応 |
|---|---|---|
| as-of参照のN+1/性能 | 時系列計算が重くなる | `(taskId, snapshotAt)` インデックス＋1クエリでまとめ取得しメモリでas-of解決（提案Cで導入した「1回取得→インメモリ計算」と同方針） |
| 履歴の母集団に削除済みタスクが欠落 | tombstone以前の評価日でEVが過少 | 履歴計算はsnapshotからタスク母集団を構成（削除済み含む）。現在値画面のみ `findActiveByWbsId`（4.1） |
| snapshot取得を `fromDate` 以降に限定 | 期間開始時点のas-ofが解決不能 | `snapshotAt ≤ toDate` 全件、または `fromDate` 以前の最新1件をseed取得（4.4） |
| snapshot進捗を提案Cで再按分 | 確定進捗が二重按分されEV破綻 | snapshotがある評価日は直接計算。提案Cは最初のsnapshotより前の区間のみ（4.4） |
| SyncLog採番がtx外 | 更新済みなのにログ失敗でFAILED等の不整合 | 成功SyncLogをtx先頭で採番し、task更新・snapshotと同一txに含める（4.3） |
| スナップショット欠損区間 | EVが不連続 | 最初のsnapshot前のみ提案Cフォールバックで連続性を担保 |
| 自己完結データと現タスクの乖離 | 期待と異なるEV | スナップショット側の値（単価・期間含む）を正とする旨をドキュメント化 |
| 同日複数同期で最新が不定 | as-ofが非決定的／訂正同期を表現不可 | `snapshotAt @db.Timestamptz`（時刻保持・UTC）でソート。日単位運用なら `@@unique([taskId, snapshotDateUTC])` upsertで同日上書き |

---

## 5. Stage 3: 仕上げ（任意）

- 安定運用後、`replaceAll` を非推奨化し `syncDiff` に一本化（段階移行が前提。急がない）。
- ハイウォーターマーク表示トグル等のUI整備（[evm-dashboard.tsx](../../src/components/evm/evm-dashboard.tsx)）。

---

## 6. データモデル変更まとめ（schema差分）

| 変更 | 対象 | Stage |
|---|---|---|
| `isDeleted` / `deletedAt` 追加 | `WbsTask` | 1C |
| `TaskProgressSnapshot` 新規（`syncLogId` FK・`actualStart/End` 等を含む） | 新テーブル | 2 |
| 逆リレーション `snapshots TaskProgressSnapshot[]` 追加 | `SyncLog` | 2 |

いずれも `npx prisma migrate dev --name <...>` でマイグレーション。`isDeleted` はデフォルト `false` で既存行に安全に追加可能。

---

## 7. テスト戦略

### Stage 1
- ユニット：`syncDiff` の差分判定（存続/新規/消失）、period/kosu入れ替えで重複が発生しないこと、差分カウント。
- 統合：実DBで「2回連続同期」して period/kosu が増殖しないこと、soft-delete後にWorkRecord紐づけ・StatusLogが保持されること、消失タスクが各取得系に出ないこと。
- 回帰：既存 `replaceAll` 系テストが不変であること。

### Stage 2
- ユニット：as-of参照（評価日に応じて異なるスナップショットを選択）、tombstoneで寄与0、スナップショット欠損時の提案Cフォールバック、進捗低下でEVが下がること。
- 統合：同期→進捗更新→再同期の系列でEVトレンドが時点ごとに正しく推移すること。
- 既存EVMテスト（152 unit / 22 integration）を緑に保つ。

### 検証コマンド
```
npm run test           # ユニット
npm run test:integration
npm run lint
```
手動：WBS管理のEVMタブで、進捗更新を複数回行った後トレンドが時点ごとに変化することを目視。

---

## 8. ロールアウト / マイグレーション方針

1. Stage1 は **新モード追加**のため、まず一部WBSで `syncDiff` を試験運用 → 問題なければ既定化。
2. soft-delete列追加は後方互換（既定false）。クエリ反映を段階的に確認。
3. Stage2 は記録開始後、過去は提案Cフォールバックで連続性維持。
4. 各Stageは独立PR・独立リリース可能。ロールバックは「新モードを使わない」で完結。

---

## 9. 未解決事項 / 今後の判断ポイント

- **soft-delete の適用範囲の全数洗い出し**（EVM/サマリ/WBS表示/geppoタスクマッピング等、`isDeleted=false` を入れる箇所）。実装着手前に対象クエリ一覧化が必要。`findActiveByWbsId` / `findIncludingDeletedByWbsId` の使い分けも合わせて確定。
- **トランザクションクライアント(tx)の引き回し設計**：リポジトリが `prisma` を直接importしているため、`$transaction` 内で同一txを使う仕組み（tx引数 or AsyncLocalStorage 等）の方式決定。
- **事前検証フェーズの適用範囲**：`syncDiff` に加え、既存 `replaceAll` にも遡及適用して部分commitを塞ぐか。
- **revive時の上書き方針**：復活タスクの period/kosu・担当者・進捗を、新Excel値で完全上書きしてよいか（基本は上書きで問題ない想定）。
- **snapshotの時刻粒度**：`snapshotAt`（時刻保持）を主軸にするか、`@@unique([taskId, snapshotDateUTC])` の日単位upsert（同日上書き）にするか。同日複数同期の運用実態に合わせて決定。
- **snapshot履歴の取得方針**：`snapshotAt ≤ toDate` 全件取得（推奨・シンプル）か、期間内＋seed取得か。データ量に応じて決定。
- **日次as-ofのTZ境界**：評価日（日付）と `snapshotAt`（時刻・UTC）の比較を、UTCの「翌日00:00未満」で行うか、表示TZ基準にするか。`generateDateRange` がローカル基準でDateを生成する点（[evm-service.ts](../../src/applications/evm/evm-service.ts)）とも整合させて最終確定。
- **ハイウォーターマーク表示**のUI/デフォルトON/OFF。
- **status系バックフィル**（TaskStatusLogからの遡及）を行うか。
- **taskNo rename 継続性**（手動マッピング）を将来要件にするか。本計画では非対応。
- スナップショットの **保持期間/アーカイブ** ポリシー。

---

## 10. 付録: 関連ファイル

| 役割 | パス |
|---|---|
| WBS同期（replaceAll／syncDiff追加先） | [src/applications/wbs-sync/wbs-sync-application.service.ts](../../src/applications/wbs-sync/wbs-sync-application.service.ts) |
| タスクRepository（delete/create/update、period/kosu） | [src/infrastructures/task-repository.ts](../../src/infrastructures/task-repository.ts) |
| Geppoインポート（WorkRecordをtaskNoで紐づけ） | [src/applications/geppo-import/geppo-import-application-service.ts](../../src/applications/geppo-import/geppo-import-application-service.ts) |
| Prismaスキーマ（FK/ユニーク/新テーブル） | [prisma/schema.prisma](../../prisma/schema.prisma) |
| EVMリポジトリ（getWbsEvmDataのevaluationDate対応） | [src/infrastructures/evm/wbs-evm-repository.ts](../../src/infrastructures/evm/wbs-evm-repository.ts) |
| EVMリポジトリIF | [src/applications/evm/iwbs-evm-repository.ts](../../src/applications/evm/iwbs-evm-repository.ts) |
| EVドメイン（提案C／スナップショット参照点） | [src/domains/evm/task-evm-data.ts](../../src/domains/evm/task-evm-data.ts) |
| EVMサービス（referenceDate／as-of計算） | [src/applications/evm/evm-service.ts](../../src/applications/evm/evm-service.ts) |

---

## 11. 関連ドキュメント
- [docs/specs/02-evm.md](../specs/02-evm.md) … EVM仕様
- [docs/specs/03-forecast-calculation.md](../specs/03-forecast-calculation.md) … 見通し工数仕様
