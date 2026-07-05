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

### P1-7. UI 層が Domain 層を直接 import（11 ファイル）— **解消済み（2026-07）**

P1-7 フォローアップ（PR-12〜14, PR-13）により、以下を実施済み。

- 型のみ利用分を `src/types/` へ移設（`import-job`, `task-dependency`, `geppo`, `forecast-calculation`, `evm`, `scheduling-settings`, `notification` 等）
- Application Service ラッパー新設・拡張（`ForecastApplicationService`, `TaskApplicationService`, `EvmService`, `ImportJobApplicationService`）
- リポジトリ全体で `eslint-disable-next-line no-restricted-imports` **0 件**（`rg` で確認）

<details>
<summary>旧一覧（参考）</summary>

| # | ファイル | 内容 |
|---|---|---|
| 1 | `src/app/actions/evm/evm-actions.ts` | EVM Domain 型・シリアライズ |
| 2 | `src/app/api/import-jobs/[id]/execute/route.ts` | ImportJob / Notification 型 |
| 3 | `src/app/api/import-jobs/route.ts` | ImportJobType |
| 4 | `src/app/wbs/[id]/actions/forecast-actions.ts` | ForecastCalculationService |
| 5 | `src/app/wbs/[id]/actions/wbs-task-actions.ts` | TaskStatus / ITaskFactory |
| 6 | `src/app/wbs/[id]/ganttv3/action.ts` | TaskProgressCalculator |
| 7 | `src/app/wbs/[id]/ganttv3/dependency-actions.ts` | DependencyType |
| 8 | `src/app/work-records/geppo/actions.ts` | Geppo 型 |
| 9 | `src/app/work-records/geppo/page.tsx` | Geppo 型 |
| 10 | `src/components/task-scheduling/scheduling-workbench.tsx` | BaselineMode |
| 11 | `src/hooks/use-forecast-calculation.ts` | Forecast 計算型 |

</details>

---

## P2: バグ・標準部品の未整備

| # | 項目 | 内容 | 対応方針 |
|---|---|---|---|
| 1 | **バグ**: `getTaskStatusName` が `ON_HOLD` 未対応 | `src/utils/utils.ts:26` — switch が 3 ステータスのみで `ON_HOLD` は `undefined` を返す | `case "ON_HOLD": return "保留"` を追加しテストを書く |
| 2 | `src/lib/api-response.ts` — **部分対応済み（2026-07）** | docs/04 が標準として参照するヘルパーを新設。`company-holidays/*`（2 Route）と `import-jobs/*`（5 Route）を移行済み。残り 11 API Route は順次移行 | 残 Route を `docs/09` P2-2 残タスクとして追記 |
| 3 | 共通 `ActionResult<T>` 型が存在しない | 各アクションが `{success, error}` / `{success, message}` / 生データ返却を独自定義（`wbs-actions.ts` は失敗時キーが `message`） | `src/types/action-result.ts` を新設し、全 Server Action の戻り値を統一（キーは `error`） |
| 4 | `TaskStatus` が 5 箇所で重複定義 — **②③ 解消済み（2026-07 PR-12）** | ① `src/types/wbs.ts:1` ② ~~`task-progress-calculator.ts`~~ ③ ~~`gantt.ts`~~ ④ `src/domains/task/value-object/project-status.ts:3`（**ファイル名と異なる `TaskStatus` クラスを export**）⑤ Prisma enum | `src/types/wbs.ts` を唯一の union 定義とし ②③ を削除済み。④ はファイル名を `task-status.ts` に修正（P4-1）。Prisma enum は Infrastructure 層でのみ変換利用 |
| 5 | 日付フォーマット処理が 11 箇所に重複（3 方式混在） | `src/utils/date-util.ts`（canonical）のほか、`src/components/ganttv2/gantt-utils.ts:310`、`src/applications/task-scheduling/tsv-converter.ts:39`、`src/domains/calendar/assignee-working-calendar.ts:145`、`src/domains/calendar/company-calendar.ts:60`、`src/app/dashboard/_components/active-projects-list.tsx:27`、`upcoming-deadlines.tsx:16`、`src/app/company-holidays/page.tsx:116`、`src/components/evm/evm-timeseries-table.tsx:92`、`src/components/ganttv2/gantt-task-list.tsx:164`、`src/app/wbs/[id]/assignee-gantt/_components/gantt-header.tsx:16` | `date-util.ts` に集約。手組み `getFullYear/getMonth` 連結（ローカル TZ 依存で UTC 保存値とズレる）は date-fns へ置換 |
| 6 | `date-util.ts` の `'YYYY/MM/DD HH:mm:ss'` が時刻を出力しない | `src/utils/date-util.ts:77` — `toLocaleDateString` を呼んでいるため時刻部分が欠落 | `Intl.DateTimeFormat` で時刻込みに修正しテスト追加 |
| 7 | Server Action の入力検証が 30 ファイル中 4 のみ | Zod 検証があるのは `evm-actions.ts` / `notification-actions.ts` / `progress-history-actions.ts` / `milestone-actions.ts` のみ。他は TypeScript 型注釈だけでランタイム防御なし | 変更系アクションから優先的に Zod 検証を追加（docs/08 §3） |

### P2 対応状況（2026-07 更新）

本ブランチで P2 全項目に対応済み。ユニットテスト 1292 件 green、本番型チェック・レイヤー境界 lint いずれもクリーン。

- **P2-1** ✅ 解消: `getTaskStatusName` に `ON_HOLD → 保留`／`default → 不明` を追加（`utils.test.ts` にテスト追加）。`task-modal.tsx` の ON_HOLD 表示が空になる実害を解消。
- **P2-2** ✅ 一部移行＋方針確定: `auth/me`・`auth/logout`・`wbs .../tasks/dependencies`（GET/POST/DELETE の 2 Route）を `api-response` helper へ移行（`auth/me` は consumer `auth-context.tsx` を `.data.user` 参照に更新）。以下は据え置き:
  - `cron/notifications`: `success=(errors===0)` ＋ 207 マルチステータスの独自セマンティクスが helper（`success:true` 固定）に不適合のため対象外。
  - `notifications/{route,count,mark-read,subscribe,sync}`（CRUD 5 件）: P3-5（fetch→Server Action 化）／P3-4（UI 内部 API 廃止）と統合予定。
  - `notifications/analytics`: `public/service-worker.js` が使用中のため削除せず保持（P4-3 の実装/削除判断に委ねる）。※旧計画の「スタブ削除」は SW 依存の判明により撤回。
- **P2-3** ✅ 解消: 戻り値を `ActionResult<T>` に統一（projects/users/system-settings/wbs-task/wbs-tag/wbs-assignee/dependency/schedule 系）。失敗キーは既に `error` 統一済みだった。rich な名前付き Result 型 3 件（Notification/ProgressHistory/Evm）と `login` の戻り値は既に `error` 準拠のため churn 回避で据え置き。
- **P2-4** ✅ 解消: ⑤ `infrastructures/evm/wbs-evm-repository.ts` ほかの Prisma enum を `@/types/wbs` union に一本化、④ `value-object/project-status.ts` を `task-status.ts` にリネーム（import 20 箇所更新）。
- **P2-5** ✅ 一部集約: 表示用の重複を `date-util.formatDate` に集約（`'YYYY/MM/DD(曜)'`・`'YYYY年MM月DD日'` を追加、出力バイト一致を実測）。calendar 2 件（日付突合キー）・`gantt-task-list`（未設定/文字列パススルーの特殊セマンティクス）・`gantt-header`（オブジェクト返却）は非適合のため据え置き。
- **P2-6** ✅ 対応: `date-util` の `'YYYY/MM/DD HH:mm:ss'` を `toLocaleString` に統一。※現行 Node/ICU では時刻欠落は再現しない（ECMA-402 上 `toLocaleDateString` は明示 time オプションを保持するため）。実バグ修正ではなく、日付用メソッドが時刻を出力する可読性の罠を除く明確化リファクタ。
- **P2-7** ✅ 解消: 変更系 Server Action（projects/users/login/system-settings/wbs-task/wbs-tag/wbs-assignee/dependency/schedule/schedule-generator/project-settings）に Zod 検証を追加。

残タスク（P3 以降）: notifications API の Server Action 化（P3-4/P3-5）、calendar の日付キー集約、名前付き Result 型の `ActionResult` 統一、`console.*` 整理（P3-9）。

---

## P3: パターン・ライブラリ利用の不統一

| # | 項目 | 内容 | 対応方針 |
|---|---|---|---|
| 1 | DI トークンの生文字列使用 — **`NotificationRepository` 解消済み（2026-07 PR-15）** | `inversify.config.ts` — `'PushNotificationService'` / `'NotificationEventDetector'` 残存（`'NotificationRepository'` は `SYMBOL.INotificationRepository` へ移行済み） | 残トークンを SYMBOL へ統一 |
| 2 | 死んだ SYMBOL・コメントアウトされたバインド | `symbol.ts` の `IEvmRepository` / `IEvmApplicationService` / `IWbsSyncService`、`inversify.config.ts:103-105,151,153,187` のコメントアウト（参照先ファイルはすでに存在しない） | 削除 |
| 3 | `WbsAnalyticsHandler` が「なんちゃって CQRS」 | QueryBus に register されず、`wbs/analytics/actions.ts:11-17` が DI から直接取得して独自メソッド（`getCoefficients` 等）を呼ぶ | `IQueryHandler` 実装＋QueryBus 登録に改修、または通常の Application Service にリネーム |
| 4 | company-holidays 機能が全面的に非標準 | 唯一 API Route + 生 `fetch`（`page.tsx:59,82`、`company-holiday-form.tsx:105`）+ `alert()`（`form:121,125`、`page:89,93`）で実装。フォームは RHF+Zod なのに送信だけ fetch | Server Action + `useToast` へ全面改修（P1-3 と同時に）。UI 内部用の API Route は廃止 |
| 5 | 生 `fetch` によるデータ取得 | `src/app/import-jobs/import-jobs-client.tsx:77,169,179`、`src/app/notifications/send/page.tsx:115`、`src/components/wbs/wbs-import-job-buttons.tsx:35`、`src/components/wbs/geppo-import-modal.tsx:79`（多くに「TODO: server action対応」コメントあり） | Server Action or TanStack Query へ移行（SSE の `import-jobs/[id]/stream` は API Route のまま） |
| 6 | 手書き useState フォーム | `src/components/milestone/milestone-modal.tsx:47-71`、`src/components/settings/system-settings-form.tsx`、`src/app/notifications/send/page.tsx` | react-hook-form + zodResolver へ移行 |
| 7 | Application Service のエラーハンドリング混在 | Result 型 8 サービス / throw 14 ファイル、`wbs-sync-application.service.ts` は 1 ファイル内で混在 | docs/08 §5 の使い分けに合わせ整理（予見可能な失敗は Result、障害は throw） |
| 8 | Application Service のインターフェース欠落 | `EvmService`・`TaskDependencyService` は IF なしで具象クラスを DI（`TaskDependencyService` は `SYMBOL.ITaskDependencyService` という IF 風トークンに具象をバインド） | `IEvmService` / `ITaskDependencyService` を定義 |
| 9 | ロギングの ad hoc な `console.*` | applications 28 箇所 / infrastructures 49 箇所（最多: `PushNotificationService.ts` 15、`NotificationEventDetector.ts` 11、`phase-repository.ts` 9）、`projects/actions.ts:41-43` にデバッグ log 残存 | docs/08 §6 に従い境界の `console.error` のみに整理 |
| 10 | TanStack Query の hooks 命名・fetch 混在 | `useNotifications.ts:95,109` は queryFn 内で生 fetch | Server Action 呼び出しへ置換 |

### P3 対応状況（2026-07 更新）

本ブランチで P3 のほぼ全項目に対応済み。ユニットテスト 1292 件 green、本番ビルド成功、レイヤー境界 lint クリーン。

- **P3-1** ✅ 解消: 生文字列トークン `'NotificationEventDetector'` を `SYMBOL.NotificationEventDetector` へ（`'PushNotificationService'` は既に SYMBOL 化済みだった）。
- **P3-2** ✅ 解消: 死んだ SYMBOL（`IEvmRepository`/`IEvmApplicationService`/`IWbsSyncService`）とコメントアウト済み import/bind を削除。
- **P3-3** ✅ 解消: `WbsAnalyticsHandler` を `IWbsAnalyticsApplicationService`＋`WbsAnalyticsApplicationService` にリネーム（②案。docs/08「迷ったら CQRS を使わない」に沿う）。QueryBus 未登録の直呼びを解消。
- **P3-4** ✅ 解消: company-holidays を `CompanyHolidayApplicationService`＋Server Action 化。`alert()`→`useToast`、`confirm()`→`AlertDialog`、内部用 API Route 2本を削除。
- **P3-5** ✅ 解消: import-job（import-jobs-client/wbs-import-job-buttons/geppo-import-modal）と通知（send/page）の生 fetch を Server Action へ。SSE stream は据え置き。
- **P3-6** ⚠️ 一部: milestone-modal / system-settings-form を RHF+zodResolver へ移行。`notifications/send/page.tsx` は 10項目＋JSON＋ライブプレビューの複雑フォームで RHF 化が不相応にリスキーなため見送り（fetch のみ Server Action 化）。
- **P3-7** ⚠️ 一部（明確な違反のみ）: `wbs-sync` で「WBS 未検出」を throw していた箇所を、同ファイルの行検証エラーと統一して Result 返却へ是正。障害系の throw は §5 準拠のため維持。他サービスは概ね §5 準拠と判断。
- **P3-8** ❌ 未対応（残）: `IEvmService` / `ITaskDependencyService` の IF 定義。※クラスタ選択時に提示漏れ。P3-3 と同種の機械的な IF 抽出。
- **P3-9** ⚠️ 一部（デバッグ log のみ）: applications/infrastructures のデバッグ `console.log` 39 件を削除。`console.error`/`warn`（境界のエラーログ 40 件）は §6 に従い維持。
- **P3-10** ✅ 解消: `useNotifications.ts` の queryFn 内 fetch を `getNotifications`/`getUnreadCount` Server Action へ置換。

P2-2 との関連: 通知 API のうち list/count/create を Server Action 化し `/api/notifications`(GET/POST)・`/count` を削除。`mark-read`/`sync`/`analytics` は service-worker.js 専用、`subscribe` は push-notification.ts の意図的な API 統一のため API Route を維持。

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

## 機械的な強制（導入済み）

`eslint.config.mjs` に ESLint の `no-restricted-imports` を導入し、レイヤー境界を機械的に強制している（設定は docs/04 の「依存ルールの機械的強制」を参照）。P1-7 は解消済み（`eslint-disable-next-line no-restricted-imports` 0 件）。新規コードでは Domain 層への UI 直接 import を禁止し、Application Service 経由でアクセスすること。
