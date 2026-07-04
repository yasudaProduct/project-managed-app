# リファクタリングバックログ（修正対象コード一覧）

2026-07 時点のコードベースを `docs/04-architecture-principles.md`（アーキテクチャ原則）・`docs/08-implementation-guidelines.md`（実装ガイドライン）・`docs/03-coding-style.md`（コーディング規約）に照らして棚卸しした結果です。

- 優先度 **P1**: アーキテクチャ違反（レイヤー越境）。放置すると違反が増殖するため最優先。
- 優先度 **P2**: バグ、および標準部品の未整備（他の修正の前提になるもの）。
- 優先度 **P3**: パターン・ライブラリ利用の不統一。
- 優先度 **P4**: 命名・デッドコード等の低リスク整理。

各項目は独立した小さな PR に分割して対応することを推奨します（P2 の共通部品 → P1 → P3 → P4 の順が効率的）。

---

## P1: レイヤー違反（アーキテクチャ原則違反）

### P1-1. Server Action が Prisma を直接使用（10 ファイル）

UI 層から `@/lib/prisma` を直接 import してクエリを実行している。Application Service（必要なら新設）＋ Repository 経由に移行する。

| # | ファイル | 内容 | 対応方針 |
|---|---|---|---|
| 1 | `src/app/wbs/[id]/actions/wbs-actions.ts` | wbs / wbsPhase / wbsAssignee / wbsBuffer の CRUD を直接実行 | `WbsApplicationService` へ移管（バッファ取得は IF 追加） |
| 2 | `src/app/wbs/[id]/actions/milestone-actions.ts` | milestone CRUD | 既存 `MilestoneApplicationService` へ移管 |
| 3 | `src/app/wbs/[id]/actions/wbs-phase-actions.ts` | wbsPhase の read/update/delete | `PhaseApplicationService` へ移管 |
| 4 | `src/app/wbs/[id]/actions/wbs-assignee-actions.ts` | wbsAssignee の read/delete | `WbsApplicationService`（`IWbsAssigneeRepository` 既存）へ移管 |
| 5 | `src/app/wbs/[id]/project-settings-actions.ts` | projectSettings の read/upsert | ProjectSettings 用の Repository IF＋Application Service を新設 |
| 6 | `src/app/schedule/action.ts` | userSchedule / users を直接取得 | `IUserScheduleRepository`（既存）＋ Application Service 経由へ |
| 7 | `src/app/work-records/actions.ts` | workRecord を直接取得 | 既存 `WorkRecordApplicationService` へ移管 |
| 8 | `src/app/actions/get-wbs-summary.ts` | 5 テーブル横断の集計＋ビジネスロジックをアクション内に直書き | CQRS（`GetWbsSummaryHandler` 系）へ統合。`wbs-summary-actions.ts` と機能重複しているため統合を検討 |
| 9 | `src/app/wbs/[id]/ganttv3/action.ts` | Application Service 利用と Prisma 直叩き（wbs / projectSettings）の混在 | Prisma 部分をサービス経由に置換 |
| 10 | `src/app/wbs/phase/phase-actions.ts` | `PhaseApplicationService` 利用と phaseTemplate 直叩きの混在 | PhaseTemplate 用 Repository IF を追加しサービス経由に |

### P1-2. page.tsx が Prisma を直接使用（2 ファイル）

| # | ファイル | 内容 | 対応方針 |
|---|---|---|---|
| 1 | `src/app/wbs/[id]/page.tsx:27` | `prisma.projects.findUnique` | `ProjectApplicationService` の取得系 Server Action へ置換 |
| 2 | `src/app/wbs/[id]/dashboard/page.tsx:50` | `prisma.projects.findUnique` | 同上 |

### P1-3. API Route が Prisma を直接使用（2 ファイル）

| # | ファイル | 内容 | 対応方針 |
|---|---|---|---|
| 1 | `src/app/api/company-holidays/route.ts` | companyHoliday の findMany/create | `ICompanyHolidayRepository`（既存・DI 登録済）経由へ。※P3-4 の company-holidays 機能改修と合わせて対応 |
| 2 | `src/app/api/company-holidays/[id]/route.ts` | findUnique/update/delete | 同上 |

### P1-4. Application 層の違反（3 件）

| # | ファイル | 内容 | 対応方針 |
|---|---|---|---|
| 1 | `src/applications/wbs/query/get-wbs-summary-handler.ts:67` | `prisma.projectSettings.findUnique` を直接実行（TODO コメントあり） | ProjectSettings Repository IF 経由へ（P1-1-5 と同じ IF を利用） |
| 2 | `src/applications/geppo-import/geppo-import-application-service.ts:14-16` | Infrastructure の具象クラス（`ProjectMappingService` / `UserMappingService` / `TaskMappingService`）を直接 import | 各 MappingService の IF を Application 層に定義し、Infrastructure 実装を DI で注入 |
| 3 | `src/applications/notification/NotificationService.ts:20` | Infrastructure の `PushNotificationService` を直接 import | `IPushNotificationService` IF を Application 層に定義して注入 |

### P1-5. Domain 層の違反（4 件）

| # | ファイル | 内容 | 対応方針 |
|---|---|---|---|
| 1 | `src/domains/auth/auth-service.ts` | Application 層の `IAuthRepository` に依存しリポジトリを操作 | ドメインサービスではなく実質ユースケース。`src/applications/auth/` へ移動（`AuthApplicationService` へ統合） |
| 2 | `src/domains/forecast/forecast-calculation.service.ts:6` | Application 層の `WbsTaskData` 型に依存 | 計算に必要な入力型を Domain 層に定義し、Application 層で変換して渡す |
| 3 | `src/domains/evm/evm-metrics.ts:1`, `src/domains/evm/task-evm-data.ts:2` | `@prisma/client` の enum（`ProgressMeasurementMethod` / `TaskStatus`）に依存（TODO コメントあり） | `src/types/` の union 定義に置換（P2-4 の統合後） |
| 4 | `src/applications/evm/evm-service.ts:6`, `src/applications/evm/iwbs-evm-repository.ts:1` | 同上（Application 層での Prisma enum 依存） | 同上 |

### P1-6. クライアントコンポーネントへの Prisma 混入（2 件）

| # | ファイル | 内容 | 対応方針 |
|---|---|---|---|
| 1 | `src/app/projects/project-form.tsx:27` | `@prisma/client` の `ProjectStatus` を**ランタイム利用**（`z.nativeEnum`、`ProjectStatus.INACTIVE`）— クライアントバンドルに Prisma が混入 | `src/types/wbs.ts` の `ProjectStatus` union + `z.enum` に置換 |
| 2 | `src/components/wbs/progress-history-content.tsx:5` | `@prisma/client` の `TaskStatus` を型のみ利用 | `src/types/` の型に置換（低リスク） |

---

## P2: バグ・標準部品の未整備

| # | 項目 | 内容 | 対応方針 |
|---|---|---|---|
| 1 | **バグ**: `getTaskStatusName` が `ON_HOLD` 未対応 | `src/utils/utils.ts:26` — switch が 3 ステータスのみで `ON_HOLD` は `undefined` を返す | `case "ON_HOLD": return "保留"` を追加しテストを書く |
| 2 | `src/lib/api-response.ts` が存在しない | docs/04 が標準として参照するヘルパー（`createApiResponse` / `createApiError` 等）が未実装。全 18 API Route が生の `NextResponse.json` を使用し、レスポンス形もバラバラ | ヘルパーを新設し、API Route を順次移行 |
| 3 | 共通 `ActionResult<T>` 型が存在しない | 各アクションが `{success, error}` / `{success, message}` / 生データ返却を独自定義（`wbs-actions.ts` は失敗時キーが `message`） | `src/types/action-result.ts` を新設し、全 Server Action の戻り値を統一（キーは `error`） |
| 4 | `TaskStatus` が 5 箇所で重複定義 | ① `src/types/wbs.ts:1` ② `src/domains/task/task-progress-calculator.ts:12` ③ `src/components/ganttv3/gantt.ts:29` ④ `src/domains/task/value-object/project-status.ts:3`（**ファイル名と異なる `TaskStatus` クラスを export**）⑤ Prisma enum | `src/types/wbs.ts` を唯一の定義とし ②③ を削除。④ はファイル名を `task-status.ts` に修正。Prisma enum は Infrastructure 層でのみ変換利用 |
| 5 | 日付フォーマット処理が 11 箇所に重複（3 方式混在） | `src/utils/date-util.ts`（canonical）のほか、`src/components/ganttv2/gantt-utils.ts:310`、`src/applications/task-scheduling/tsv-converter.ts:39`、`src/domains/calendar/assignee-working-calendar.ts:145`、`src/domains/calendar/company-calendar.ts:60`、`src/app/dashboard/_components/active-projects-list.tsx:27`、`upcoming-deadlines.tsx:16`、`src/app/company-holidays/page.tsx:116`、`src/components/evm/evm-timeseries-table.tsx:92`、`src/components/ganttv2/gantt-task-list.tsx:164`、`src/app/wbs/[id]/assignee-gantt/_components/gantt-header.tsx:16` | `date-util.ts` に集約。手組み `getFullYear/getMonth` 連結（ローカル TZ 依存で UTC 保存値とズレる）は date-fns へ置換 |
| 6 | `date-util.ts` の `'YYYY/MM/DD HH:mm:ss'` が時刻を出力しない | `src/utils/date-util.ts:77` — `toLocaleDateString` を呼んでいるため時刻部分が欠落 | `Intl.DateTimeFormat` で時刻込みに修正しテスト追加 |
| 7 | Server Action の入力検証が 30 ファイル中 4 のみ | Zod 検証があるのは `evm-actions.ts` / `notification-actions.ts` / `progress-history-actions.ts` / `milestone-actions.ts` のみ。他は TypeScript 型注釈だけでランタイム防御なし | 変更系アクションから優先的に Zod 検証を追加（docs/08 §3） |

---

## P3: パターン・ライブラリ利用の不統一

| # | 項目 | 内容 | 対応方針 |
|---|---|---|---|
| 1 | DI トークンの生文字列使用 | `inversify.config.ts:157,158,190` — `'PushNotificationService'` / `'NotificationEventDetector'` / `'NotificationRepository'`（利用側: `NotificationService.ts:27-28`、`PushNotificationService.ts:22`、`api/cron/notifications/route.ts:8`）。`SYMBOL.INotificationRepository` は定義済みなのに未使用 | SYMBOL へ統一 |
| 2 | 死んだ SYMBOL・コメントアウトされたバインド | `symbol.ts` の `IEvmRepository` / `IEvmApplicationService` / `IWbsSyncService`、`inversify.config.ts:103-105,151,153,187` のコメントアウト（参照先ファイルはすでに存在しない） | 削除 |
| 3 | `WbsAnalyticsHandler` が「なんちゃって CQRS」 | QueryBus に register されず、`wbs/analytics/actions.ts:11-17` が DI から直接取得して独自メソッド（`getCoefficients` 等）を呼ぶ | `IQueryHandler` 実装＋QueryBus 登録に改修、または通常の Application Service にリネーム |
| 4 | company-holidays 機能が全面的に非標準 | 唯一 API Route + 生 `fetch`（`page.tsx:59,82`、`company-holiday-form.tsx:105`）+ `alert()`（`form:121,125`、`page:89,93`）で実装。フォームは RHF+Zod なのに送信だけ fetch | Server Action + `useToast` へ全面改修（P1-3 と同時に）。UI 内部用の API Route は廃止 |
| 5 | 生 `fetch` によるデータ取得 | `src/app/import-jobs/import-jobs-client.tsx:77,169,179`、`src/app/notifications/send/page.tsx:115`、`src/components/wbs/wbs-import-job-buttons.tsx:35`、`src/components/wbs/geppo-import-modal.tsx:79`（多くに「TODO: server action対応」コメントあり） | Server Action or TanStack Query へ移行（SSE の `import-jobs/[id]/stream` は API Route のまま） |
| 6 | 手書き useState フォーム | `src/components/milestone/milestone-modal.tsx:47-71`、`src/components/settings/system-settings-form.tsx`、`src/app/notifications/send/page.tsx` | react-hook-form + zodResolver へ移行 |
| 7 | Application Service のエラーハンドリング混在 | Result 型 8 サービス / throw 14 ファイル、`wbs-sync-application.service.ts` は 1 ファイル内で混在 | docs/08 §5 の使い分けに合わせ整理（予見可能な失敗は Result、障害は throw） |
| 8 | Application Service のインターフェース欠落 | `EvmService`・`TaskDependencyService` は IF なしで具象クラスを DI（`TaskDependencyService` は `SYMBOL.ITaskDependencyService` という IF 風トークンに具象をバインド） | `IEvmService` / `ITaskDependencyService` を定義 |
| 9 | ロギングの ad hoc な `console.*` | applications 28 箇所 / infrastructures 49 箇所（最多: `PushNotificationService.ts` 15、`NotificationEventDetector.ts` 11、`phase-repository.ts` 9）、`projects/actions.ts:41-43` にデバッグ log 残存 | docs/08 §6 に従い境界の `console.error` のみに整理 |
| 10 | TanStack Query の hooks 命名・fetch 混在 | `useNotifications.ts:95,109` は queryFn 内で生 fetch | Server Action 呼び出しへ置換 |

---

## P4: 命名・構造・デッドコードの整理（低リスク）

### P4-1. タイポ修正（ファイル名）

| ファイル | 正 |
|---|---|
| `src/applications/user/iuser-repositroy.ts` | `iuser-repository.ts` |
| `src/applications/milestone/milestone.interfase.ts` | `imilestone-repository.ts`（命名規則にも合わせる） |
| `src/domains/work-records/work-recoed.ts` | `work-record.ts` |

### P4-2. ファイル命名規則への統一（docs/03 参照）

- **PascalCase ファイルのリネーム（kebab-case へ）**: `src/domains/sync/`（`ExcelWbs.ts`, `WbsDataMapper.ts` 等）、`src/applications/notification/`（`NotificationService.ts`, `INotificationService.ts`, `INotificationRepository.ts`, `NotificationEventDetector.ts`）、`src/applications/excel-sync/`（`IExcelWbsRepository.ts`, `ISyncLogRepository.ts`, `IWbsSyncApplicationService.ts`）、`src/infrastructures/sync/`・`src/infrastructures/notification/` 配下、コンポーネント 15 ファイル（`src/components/ganttv3/` 等）
- **ドット区切りサフィックスのリネーム（`-` 区切りへ）**: `milestone.repository.ts`、`*-prisma.repository.ts`（3 件、クラス名の `Prisma` 接頭辞も除去）、`dashboard-query.repository.ts`、`assignee-gantt.service.ts`、`schedule-generate.service.ts` ほか
- **リポジトリ IF ファイルの統一（`i<name>-repository.ts`）**: `wbs-query-repository.ts`（i 接頭辞なし）、`iimport-job.repository.ts` / `igeppo.repository.ts` / `idashboard-query.repository.ts` / `iwork-record.repository.ts`（ドット区切り）
- **hooks の統一（`use-<name>.ts`）**: `useNotifications.ts`、`useNotificationPreferences.ts`、`usePushNotifications.ts`、`useSSEConnection.ts`
- **Server Action ファイルの統一**: `action.ts`（単数）3 件 → `actions.ts`、`src/app/actions/` 配下 3 件 → 各機能セグメントへ移動

### P4-3. デッドコード削除

| 対象 | 内容 |
|---|---|
| `src/applications/excel-sync/WbsSyncApplicationService.ts` | 全 44 行コメントアウトの旧実装。削除し、同フォルダの live な IF 2 件は `wbs-sync/` へ統合 |
| `src/domains/sync/IWbsSyncService.ts` | 本体が全てコメントアウトされた死んだポート。削除 |
| `src/app/test/gantt/page.tsx` | 開発用スクラッチページが本番ルートに露出。削除 |
| `src/app/api/notifications/analytics/route.ts` | console.log のみのスタブ。実装するか削除 |

### P4-4. その他の整理

| 対象 | 内容 |
|---|---|
| `src/domains/milestone/milestone.ts` | 唯一 public constructor + `rebuild` 命名。ハウススタイル（private constructor + `create`/`createFromDb`）へ統一 |
| `src/domains/forecast/forecast-calculation.service.ts:3` | 存在しないドキュメント `/docs/feature/forecast-hours-specification.md` を参照 → `docs/specs/03-forecast-calculation.md` に修正 |
| `src/domains/work-records/`（複数形）と `src/applications/work-record/`（単数形） | フォルダ名を単数形に統一 |
| Server Action の戻り値キー `message` → `error` | `wbs-actions.ts` ほか（P2-3 の `ActionResult` 導入と同時に） |

---

## 機械的な強制（フォローアップ）

P1 の違反解消後、ESLint の `no-restricted-imports` によるレイヤー境界の強制を導入する（設定例は docs/04 の「依存ルールの機械的強制」を参照）。導入前に新規違反を防ぐため、コードレビューで docs/04 の依存関係マトリクスを確認すること。
