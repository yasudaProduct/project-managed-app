# MySQLインポート 仕様書

## 1. 概要

本システムは、外部の **Geppo月報システム（MySQL）** をデータソースとして、2種類のデータを本アプリケーション（PostgreSQL）へインポートする。

| インポート種別        | データソース（MySQL）                     | インポート先（PostgreSQL） | 実行サービス                    |
| --------------------- | ----------------------------------------- | -------------------------- | ------------------------------- |
| **GEPPO**（月報実績） | `geppo` テーブル（日別工数 DAY01〜DAY31） | `WorkRecord`（作業記録）   | `GeppoImportApplicationService` |
| **WBS**（WBSマスタ）  | `wbs` テーブル（Excel取り込み済みWBS）    | `WbsTask`（タスク）        | `WbsSyncApplicationService`     |

いずれも非同期の **インポートジョブ（`ImportJob`）** として登録・実行され、進捗・結果が永続化される。インポート元の MySQL は本アプリの主データベース（PostgreSQL）とは独立した接続として扱われる。

### このインポートが解決すること

- 別システム（Geppo月報）で記録された日別の作業実績工数を、本システムのWBSタスクに紐づけて取り込む
- Excelから月報MySQLに取り込まれたWBS構造（タスク・期間・工数・担当者）を、本システムのタスクとして同期する
- 取り込み前のマッピング検証（ユーザー・プロジェクト・タスク）により、対応関係が成立しないデータを事前に検出する
- ジョブとして実行状況を追跡し、完了/失敗を担当者へ通知する

---

## 2. 用語定義

| 用語                              | 説明                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **インポートジョブ（ImportJob）** | インポート処理の単位。`type`（GEPPO/WBS）・`status`・進捗・結果を持ち、PostgreSQLに永続化される                |
| **マッピング**                    | MySQL側のキー（要員ID・プロジェクトID・WBS_NO）を、本システムのエンティティ（User・WBS・Task）へ対応づける処理 |
| **バリデーション（事前検証）**    | 実際の書き込み前に、マッピング成立率・データ整合性を検証する処理。失敗時は書き込みを行わない                   |
| **ドライラン（dryRun）**          | DBを変更せず、変換結果・件数のみを返す試験実行モード                                                           |
| **更新モード（updateMode）**      | GEPPOインポートの書き込み方式。`merge`（upsert）/ `replace`（対象範囲を削除して再作成）                        |
| **同期モード（SyncMode）**        | WBS同期の書き込み方式。`diff`（差分）/ `replace`（洗い替え）                                                   |
| **日次展開**                      | 月報の `DAY01`〜`DAY31` を、`GEPPO_YYYYMM` と組み合わせて日付つきの作業記録に分解する処理                      |

---

## 3. インポートジョブ（ImportJob）

### 3.1 ジョブの種別とステータス

定義: [`src/domains/import-job/import-job-enums.ts`](../../src/domains/import-job/import-job-enums.ts)

| 種別（`ImportJobType`） | 説明                 |
| ----------------------- | -------------------- |
| `GEPPO`                 | 月報実績のインポート |
| `WBS`                   | WBSマスタの同期      |

| ステータス（`ImportJobStatus`） | 説明               |
| ------------------------------- | ------------------ |
| `PENDING`                       | 作成直後・実行待ち |
| `RUNNING`                       | 実行中             |
| `COMPLETED`                     | 正常完了           |
| `FAILED`                        | 失敗               |
| `CANCELLED`                     | キャンセル         |

### 4.2 APIエンドポイント

| メソッド・パス                       | 役割                                                                 |
| ------------------------------------ | -------------------------------------------------------------------- |
| `GET /api/import-jobs`               | ジョブ一覧取得（`userId` / `status` でフィルタ可能）                 |
| `POST /api/import-jobs`              | ジョブ作成（`type` 必須。`WBS`/`GEPPO` 以外は 400）                  |
| `POST /api/import-jobs/[id]/execute` | ジョブ実行開始（`PENDING` 以外は 400）。バックグラウンドで非同期実行 |
| `GET /api/import-jobs/[id]/stream`   | SSEによる進捗のストリーミング配信                                    |

実装: [`src/app/api/import-jobs/route.ts`](../../src/app/api/import-jobs/route.ts)、[`src/app/api/import-jobs/[id]/execute/route.ts`](../../src/app/api/import-jobs/[id]/execute/route.ts)

### 3.3 ジョブ実行の全体フロー

```
POST /api/import-jobs            … ジョブ作成（status=PENDING）
        │
POST /api/import-jobs/[id]/execute
        │  startJob() で status=RUNNING に変更
        │  executeImportInBackground(id) を await せず起動（即座に 200 応答）
        ▼
executeImportInBackground(jobId)
        ├─ job.type === 'GEPPO' → executeGeppoImport()
        └─ job.type === 'WBS'   → executeWbsImport()
        │
        ├─ 成功: completeJob() → status=COMPLETED → 通知送信
        └─ 失敗: failJob()     → status=FAILED    → 通知送信
```

ジョブ管理（状態遷移・進捗記録）は [`ImportJobApplicationService`](../../src/applications/import-job/import-job-application.service.ts)（`createJob` / `startJob` / `updateJobProgress` / `completeJob` / `failJob` / `cancelJob` / `addProgress`）が担う。

### 3.4 完了・失敗通知

ジョブの完了/失敗時に、ジョブ作成者（`createdBy`）へ通知を送信する。作成者が未設定の場合はWBSの担当者全員へ送信する。

- 通知チャネル: `IN_APP` + `PUSH`
- 通知種別: `IMPORT_JOB_COMPLETED` / `IMPORT_JOB_FAILED`
- 優先度: 成功=`MEDIUM`、失敗=`HIGH`
- 通知送信自体の失敗はログ出力のみで、ジョブ処理は継続する

---

## 4. GEPPOインポート（月報実績 → WorkRecord）

実行サービス: [`GeppoImportApplicationService`](../../src/applications/geppo-import/geppo-import-application-service.ts)

公開メソッドは2つ。

```ts
validateImportData(options: GeppoImportOptions): Promise<GeppoImportValidation>
executeImport(options: GeppoImportOptions): Promise<GeppoImportResult>
```

### 4.1 オプション（GeppoImportOptions）

定義: [`src/domains/geppo-import/geppo-import-result.ts`](../../src/domains/geppo-import/geppo-import-result.ts)

| オプション           | 型                     | 説明                                       |
| -------------------- | ---------------------- | ------------------------------------------ |
| `targetMonth`        | `string`（`YYYY-MM`）  | 対象月。省略時は **全期間**                |
| `targetProjectNames` | `string[]`             | WBS名（=Geppo `PROJECT_ID`）による絞り込み |
| `dryRun`             | `boolean`              | DBを変更しない試験実行                     |
| `updateMode`         | `'merge' \| 'replace'` | 書き込み方式                               |

> **注意:** インポートジョブ経由（`POST /api/import-jobs/[id]/execute`）でGEPPOを実行する場合、`updateMode` は現状 **`'replace'` 固定**で呼び出される（`dryRun` はジョブの `options.dryRun` を反映）。`merge` を使う場合はサービスを直接呼び出す経路が必要。

### 4.2 マッピング規則

| 対象         | MySQL側キー              | 本システム側               | 一致条件                                                         | サービス                                                                                     |
| ------------ | ------------------------ | -------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ユーザー     | `geppo.MEMBER_ID`        | `users.id` / `users.email` | `id` の完全一致 **または** `email` が `MEMBER_ID` で始まる       | [`UserMappingService`](../../src/infrastructures/geppo-import/user-mapping.service.ts)       |
| プロジェクト | `geppo.PROJECT_ID`       | `wbs.name`                 | 完全一致                                                         | [`ProjectMappingService`](../../src/infrastructures/geppo-import/project-mapping.service.ts) |
| タスク       | (`PROJECT_ID`, `WBS_NO`) | `Task.taskNo`              | プロジェクトで解決したWBSスコープ内で `taskNo === WBS_NO` の一致 | [`TaskMappingService`](../../src/infrastructures/geppo-import/task-mapping.service.ts)       |

- タスクマッピングの複合キーは `buildTaskMapKey(projectId, wbsNo)`（= `"<projectId>::<wbsNo>"`）で構築する。
- ユーザーがマッピングできないレコードは **変換時にスキップ**される（バリデーションでもエラー化される）。

### 4.3 バリデーション（validateImportData）

処理順:

```
1. Geppoデータ取得（targetMonth指定があれば月で絞り込み、なければ全期間）
   → 0件なら isValid=false（エラーメッセージ付き）
2. targetProjectNames 指定があれば PROJECT_ID 完全一致でフィルタ
   → 0件なら isValid=false
3. ユーザーマッピング検証（未マッピングが1件でもあれば errors に追加）
4. プロジェクトマッピング検証（未マッピングは warnings に追加）
5. タスクマッピング検証（未マッピングは warnings に追加）
6. isValid = (errors.length === 0)
7. プロジェクト別統計（recordCount / userCount / mappingStatus）を作成
```

**重要:** ユーザーの未マッピングは `errors`（=`isValid=false`）だが、プロジェクト・タスクの未マッピングは `warnings`（=インポートは継続可能）として扱われる。

返却型 `GeppoImportValidation` は、`userMapping` / `projectMapping` / `taskMapping` それぞれの `totalXxx` / `mappedXxx` / `unmappedXxx` / `mappingRate`（0.0〜1.0）と、`statistics`（`totalGeppoRecords`・`expectedWorkRecords`・`projectBreakdown`）を含む。

### 4.4 実行（executeImport）

```
1. validateImportData() を実行 → isValid=false なら例外スロー（中断）
2. Geppoデータ取得＋targetProjectNamesフィルタ（再取得）
3. convertGeppoToWorkRecords() で WorkRecord[] へ変換
4. dryRun の場合:
     DB変更なし。変換結果と件数（createdCount=全件）を返す
5. updateMode === 'replace' の場合:
     - 対象ユーザーID・対象WBS IDを算出
     - targetMonth指定あり → 月単位（YYYY-MM-01 〜 YYYY-MM-31）で削除
       targetMonth指定なし → 変換結果の最小〜最大日付範囲で削除
     - deleteByUserAndDateRange(userIds, from, to, wbsIds) で対象WBSのみ削除
     - bulkCreate() で新規作成
   updateMode === 'merge' の場合:
     - bulkUpsert() で作成 or 更新（キー: userId, taskId, startDate）
6. 結果（GeppoImportResult）を返す
```

- **replaceの削除範囲は「対象ユーザー × 対象WBS × 日付範囲」に限定**される。別WBSの実績を誤って削除しない設計。
- WorkRecord操作は [`WorkRecordApplicationService`](../../src/applications/work-record/work-record-application-service.ts)（`bulkCreate` / `bulkUpsert` / `deleteByUserAndDateRange`）に委譲する。

### 4.5 日次展開（convertGeppoToWorkRecords）

各 `geppo` レコードについて `DAY01`〜`DAY31` を走査し、**工数 > 0 の日だけ** WorkRecord を生成する。

```
for day in 1..31:
    hoursWorked = geppo["day" + zeroPad(day)]
    if hoursWorked > 0:
        workDate = Date(YYYY, MM-1, day)   // GEPPO_YYYYMM から年月、dayから日
        WorkRecord.createFromGeppo({ userId, taskId, wbsId, date: workDate, hoursWorked })
```

- 日付生成は `createDateFromYearMonthDay(GEPPO_YYYYMM, day)`。`GEPPO_YYYYMM` の先頭4桁=年、5〜6桁目=月（0ベースに補正）。
- `taskId` はタスクマッピングで解決（解決できない場合は `undefined` のまま WorkRecord を生成）。
- 変換中の例外は `errorType='INVALID_DATA'` として `errors[]` に蓄積し、当該日のみスキップして処理を継続する。

### 4.6 結果型（GeppoImportResult）

| フィールド                                       | 説明                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `totalGeppoRecords`                              | 処理対象のGeppoレコード数                                                       |
| `totalWorkRecords`                               | 生成されたWorkRecord数                                                          |
| `successCount`                                   | 成功件数（`totalWorkRecords - errors.length`）                                  |
| `errorCount`                                     | エラー件数                                                                      |
| `createdCount` / `updatedCount` / `deletedCount` | 作成・更新・削除件数                                                            |
| `errors`                                         | `GeppoImportError[]`（`memberId`・`projectId`・`date`・`errorType`・`message`） |
| `importedRecords`                                | ドライラン時のみの変換プレビュー                                                |

`errorType` の種類: `USER_NOT_FOUND` / `PROJECT_NOT_FOUND` / `TASK_NOT_FOUND` / `INVALID_DATA` / `DB_ERROR`

### 4.7 Geppoデータの検索（リポジトリ）

[`GeppoPrismaRepository.searchWorkEntries`](../../src/infrastructures/geppo/geppo-prisma.repository.ts#L25) は `geppoPrisma.geppo` に対し以下を行う。

- `PROJECT_ID` / `MEMBER_ID` の等価フィルタ
- `dateFrom` / `dateTo`（Date）を `YYYYMM` 文字列へ変換し、`GEPPO_YYYYMM` の範囲（`gte`/`lte`）でフィルタ
- ソート（既定 `GEPPO_YYYYMM` 降順）、ページネーション（`skip`/`take`）
- インポート時の取得上限は **1ページあたり 10,000件**（`{ page: 1, limit: 10000 }`）

> `MEMBER_ID || ''` のように null安全化したうえで、`DAY01`〜`DAY31` を `day01`〜`day31`（小文字）にマッピングして返す。

---

## 5. WBSインポート（MySQL wbs → WbsTask）

実行サービス: [`WbsSyncApplicationService`](../../src/applications/wbs-sync/wbs-sync-application.service.ts)

MySQLの `wbs` テーブルを [`ExcelWbsRepository`](../../src/infrastructures/sync/ExcelWbsRepository.ts)（`geppoPrisma.wbs` を参照）から取得し、本システムのWBSタスクへ同期する。Excelデータは **WBS名（`wbs.name` = `PROJECT_ID`）** をキーに取得する。

### 5.1 同期モード（SyncMode）

ジョブの `options.syncMode` を `resolveWbsSyncMode()` で解決する。**既定は `diff`（差分同期）**。

| モード    | メソッド            | 動作                                                   |
| --------- | ------------------- | ------------------------------------------------------ |
| `replace` | `replaceAll(wbsId)` | 既存タスクを全削除し、Excel側を全件再作成（洗い替え）  |
| `diff`    | `syncDiff(wbsId)`   | taskNoをキーに新規作成・更新・復活・論理削除を差分適用 |

### 5.2 共通の事前検証（原子性の担保）

両モードとも、**全Excel行をドメイン（`Task`）として構築・検証してから**書き込む。

- 1行でも検証エラーがあれば、DBを一切変更せず中断する（部分的な置換を起こさない）。
- 検証項目: タスクNo必須、フェーズ必須かつ存在、担当者（指定時）の存在 など。
- 検証エラーは `ValidationError[]`（`taskNo`・`field`・`message`・`value`・`rowNumber`）として `result.errorDetails` に格納される。

> タスク名が空の行は、現状エラーにせず `'(無題のタスク)'` で代替する（実装上のTODOあり）。

### 5.3 replaceAll（洗い替え）

```
1. WBS存在チェック
2. Excelデータ取得（WBS名）
3. フェーズ名→ID・担当者マップを構築
4. [事前検証] 全行を Task ドメインへ構築（エラーがあれば中断）
5. [適用：単一トランザクション]
     replaceAllTasks(wbsId, builtTasks)
       = 既存タスク全削除 ＋ スナップショット履歴クリア ＋ 新規タスク全作成
6. SyncLog を記録（SUCCESS / FAILED）
```

### 5.4 syncDiff（差分同期）

```
1〜4. replaceAll と同様（Excel取得・マップ構築・事前検証）
5. 既存同期状態 findSyncStateByWbsId(wbsId)（id / taskNo / isDeleted）を取得
6. [差分バケット構築（純粋計算・DB操作なし）]
     - toCreate:      Excelにあり既存になし（新規）
     - toUpdate:      Excelにあり既存にあり（id保持で更新。論理削除済みは復活）
     - toSoftDelete:  Excelになく、有効な既存タスク（既存tombstoneは対象外）
7. スナップショット入力（時点データ）を構築
8. [適用：単一トランザクション]
     applySyncDiff(wbsId, {toCreate, toUpdate, toSoftDeleteIds}, now, {syncLogData, snapshotInputs, snapshotAt})
       = 差分適用 ＋ SyncLog採番・記録 ＋ 進捗スナップショット追記
```

- 差分適用・SyncLog採番・スナップショット追記を**単一トランザクション**で行い、整合性を担保する。
- 進捗スナップショットは EVM の過去メトリクス再構築（[02: EVM仕様書](./02-evm.md) 付録）の入力となる。消失タスクは `isRemoved=true` の tombstone スナップショットとして記録される。

### 6.5 WBS同期後の品質評価対象の自動同期

WBS同期が成功すると、PostgreSQLに取り込まれた `WbsTask`（`tantoRev` 由来）を起点に **品質評価対象（QualityReviewTarget）** を自動同期する（[`SyncQualityTargetsService.syncForWbs`](../../src/applications/quality/sync-quality-targets.service.ts)）。

- この同期は **MySQLを再参照せず、常にPostgreSQLの `WbsTask` を唯一のソース**とする。
- 品質同期の失敗はWBSインポート自体の成功を妨げない（警告ログのみ）。

### 6.6 結果型（SyncResult）

| フィールド                                     | 説明                         |
| ---------------------------------------------- | ---------------------------- |
| `success`                                      | 同期の成否                   |
| `projectId`                                    | 対象プロジェクトID           |
| `recordCount`                                  | Excel側レコード数            |
| `addedCount` / `updatedCount` / `deletedCount` | 新規・更新・（論理）削除件数 |
| `errorDetails`                                 | 検証エラー等の詳細           |

---

## 7. エントリーポイント（画面）

| 画面名               | パス                                                                               | 役割                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Geppo月報インポート  | [`src/app/work-records/geppo/page.tsx`](../../src/app/work-records/geppo/page.tsx) | 接続確認・月報データの検索/プレビュー。Server Action（`checkGeppoConnection` / `getGeppoFilterOptions` / `searchGeppoWorkEntries`） |
| インポートジョブ管理 | [`src/app/import-jobs/page.tsx`](../../src/app/import-jobs/page.tsx)               | ジョブの作成・実行・進捗監視（SSE）                                                                                                 |

---

## 8. エラーハンドリングと冪等性

| 観点                        | 挙動                                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| バリデーション失敗（GEPPO） | `executeImport` 内で例外をスロー → ジョブは `FAILED`、エラー詳細を保存    |
| 変換エラー（GEPPO・特定日） | 当該日をスキップし `errors[]` に蓄積、処理は継続                          |
| 検証エラー（WBS同期）       | DBを一切変更せず中断（部分置換なし）、`SyncLog` に FAILED を記録          |
| トランザクションエラー      | ロールバック。`SyncError(TRANSACTION_ERROR)` に包んで再スロー             |
| 冪等性（GEPPO `replace`）   | 対象ユーザー×対象WBS×日付範囲を削除してから再作成。再実行で同一結果に収束 |
| 冪等性（GEPPO `merge`）     | (`userId`, `taskId`, `startDate`) をキーに upsert                         |
| 冪等性（WBS `diff`）        | taskNo をキーに upsert/revive/soft-delete。再実行で同一結果に収束         |
| ジョブ通知の失敗            | ログ出力のみ。ジョブ処理は継続                                            |

---

## 9. エッジケース一覧

| ケース                                     | 挙動                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| 対象月/期間にGeppoデータが0件              | バリデーションで `isValid=false`（エラーメッセージ返却）                             |
| `targetProjectNames` に対応するデータが0件 | バリデーションで `isValid=false`                                                     |
| ユーザーが未マッピング                     | `errors` に追加され `isValid=false`。変換時は当該レコードをスキップ                  |
| プロジェクト/タスクが未マッピング          | `warnings` に追加（インポートは継続）。タスク未解決のWorkRecordは `taskId=undefined` |
| `DAY01`〜`DAY31` がすべて0                 | WorkRecordは生成されない（工数>0の日のみ展開）                                       |
| `targetMonth` 未指定（全期間）             | 削除範囲は変換結果の最小〜最大日付（`replace`時）                                    |
| Geppoレコードが10,000件超                  | 取得上限10,000件で打ち切られる（1ページ取得のため）                                  |
| WBS同期でExcel側データなし                 | `SyncError(VALIDATION_ERROR/CONNECTION_ERROR)`                                       |
| WBS同期で1行でも検証エラー                 | DBを変更せず中断（原子性担保）                                                       |
| WBS同期後の品質同期が失敗                  | WBSインポートは成功扱い（警告ログのみ）                                              |
| ジョブが `PENDING` 以外で execute 呼び出し | 400 エラー                                                                           |
| `type` が `WBS`/`GEPPO` 以外               | 400 エラー（作成・実行とも）                                                         |

---

## 10. 処理フロー全体図

```
                         ┌──────────────────────────────────────┐
                         │  MySQL（Geppo月報システム）              │
                         │  - geppo（DAY01〜DAY31）                │
                         │  - wbs（WBSマスタ）                      │
                         └───────────────┬──────────────────────┘
                                         │ geppoPrisma（GEPPO_DATABASE_URL）
                ┌────────────────────────┼────────────────────────┐
                │                        │                          │
        GeppoPrismaRepository     ExcelWbsRepository                │
                │                        │                          │
                ▼                        ▼                          │
   GeppoImportApplicationService   WbsSyncApplicationService        │
   - validateImportData            - replaceAll / syncDiff          │
   - executeImport                                                  │
       │ マッピング検証                  │ 事前検証→トランザクション適用     │
       │ 日次展開・変換                  │ SyncLog・スナップショット         │
       ▼                                ▼                          │
   WorkRecord（作業記録）           WbsTask（タスク）                  │
                │                        │                          │
                └────────────┬───────────┘                          │
                             ▼                                      │
                   PostgreSQL（本システム）  ◀────────────────────────┘
                             ▲
                   ImportJob（PENDING→RUNNING→COMPLETED/FAILED）
                   ＋ 完了/失敗通知（IN_APP / PUSH）
```

---

## 付録: 関連クラス一覧

| クラス / 関数                   | ファイル                                                            | 責務                                      |
| ------------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `GeppoImportApplicationService` | `src/applications/geppo-import/geppo-import-application-service.ts` | 月報インポートの検証・実行・日次展開      |
| `WbsSyncApplicationService`     | `src/applications/wbs-sync/wbs-sync-application.service.ts`         | WBS同期（洗い替え・差分）                 |
| `ImportJobApplicationService`   | `src/applications/import-job/import-job-application.service.ts`     | インポートジョブの状態遷移・進捗管理      |
| `WorkRecordApplicationService`  | `src/applications/work-record/work-record-application-service.ts`   | 作業記録の一括作成・upsert・範囲削除      |
| `UserMappingService`            | `src/infrastructures/geppo-import/user-mapping.service.ts`          | 要員ID → ユーザーのマッピング             |
| `ProjectMappingService`         | `src/infrastructures/geppo-import/project-mapping.service.ts`       | プロジェクトID → WBSのマッピング          |
| `TaskMappingService`            | `src/infrastructures/geppo-import/task-mapping.service.ts`          | (PROJECT_ID, WBS_NO) → タスクのマッピング |
| `GeppoPrismaRepository`         | `src/infrastructures/geppo/geppo-prisma.repository.ts`              | MySQL `geppo` の検索・接続確認            |
| `ExcelWbsRepository`            | `src/infrastructures/sync/ExcelWbsRepository.ts`                    | MySQL `wbs` の取得                        |
| `geppoPrisma`                   | `src/lib/prisma/geppo.ts`                                           | Geppo月報用 Prisma クライアント（MySQL）  |
| `SyncQualityTargetsService`     | `src/applications/quality/sync-quality-targets.service.ts`          | WBS同期後の品質評価対象の自動同期         |

### DI登録シンボル

定義: [`src/types/symbol.ts`](../../src/types/symbol.ts) / 登録: [`src/lib/inversify.config.ts`](../../src/lib/inversify.config.ts)

`IGeppoImportApplicationService` / `IWbsSyncApplicationService` / `IImportJobApplicationService` / `IWorkRecordApplicationService` / `ProjectMappingService` / `UserMappingService` / `TaskMappingService` / `IGeppoRepository` / `IExcelWbsRepository` / `ISyncLogRepository`

---

## 付録: 関連画面一覧

| 画面名               | パス                                  | 関連内容                                   |
| -------------------- | ------------------------------------- | ------------------------------------------ |
| Geppo月報インポート  | `src/app/work-records/geppo/page.tsx` | MySQL接続確認・月報データの検索/プレビュー |
| インポートジョブ管理 | `src/app/import-jobs/page.tsx`        | ジョブ作成・実行・進捗（SSE）の監視        |
