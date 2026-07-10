# 計画書: P1（レイヤー違反）の解消

## 1. 背景と目的

`docs/09-refactoring-backlog.md` の **P1（アーキテクチャ違反＝レイヤー越境）** を解消する。P1 は放置すると違反が増殖するため最優先で対応する分類であり、大半は **UI 層（Server Action / page.tsx / API Route）や Domain/Application 層からの Prisma 直接使用・レイヤー越境 import** である。

本計画のゴールは、[docs/04-architecture-principles.md](../04-architecture-principles.md) の依存関係マトリクスに全 P1 箇所を適合させ、最終的に ESLint `no-restricted-imports` によるレイヤー境界の機械強制を導入できる状態にすることである。

### あるべきデータアクセス経路（再掲）

```text
UI（page.tsx / Client Component / API Route）
  → Server Action（"use server"、Zod検証、ActionResult返却）
    → Application Service（container.get 経由で解決）
      → Repository IF（Application層のポート）
        → Repository 実装（Infrastructure層＝ここだけが Prisma を知る）
```

- `@prisma/client` / `@/lib/prisma` を import してよいのは **`src/infrastructures/**` と `src/lib/**` のみ**。
- Prisma の enum（`TaskStatus` 等）は Domain/Application/UI で参照しない。共有 enum は `src/types/` に string union で定義し、リポジトリ実装内で相互変換する。

### 進め方の原則

- **各項目は独立した小さな PR に分割**する。
- **TDD**：先に Application Service / Repository のテスト（または既存テストの拡張）を書き、失敗を確認してから実装する（[CLAUDE.md](../../CLAUDE.md) の開発方針）。
- 既存の Application Service / Repository を最大限再利用し、不足するメソッドは**拡張**、存在しないものだけ**新設**する。

---

## 2. 前提（P2 共通部品）— Phase 0

P1 の多くは、戻り値の統一やレスポンス標準といった **P2 の共通部品に依存する**。P1 着手前に以下を整備する（backlog の「P2 の共通部品 → P1」順を踏襲）。

| # | 部品 | 内容 | 参照 |
|---|---|---|---|
| 0-1 | `ActionResult<T>` 型 | `src/types/action-result.ts` を新設。`{ success: true; data } \| { success: false; error }`。全 Server Action の戻り値を統一 | P2-3 / docs/03 Server Action |
| 0-2 | API レスポンスヘルパー | `src/lib/api-response.ts`（`createApiResponse` / `createApiError` 等）を新設 | P2-2 / docs/04 |
| 0-3 | 共有 enum の単一定義 | `src/types/` に `TaskStatus`（P2-4）／`ProgressMeasurementMethod`・`ForecastCalculationMethod`・`EvmForecastMethod` の string union を集約 | P2-4 / docs/08 §7 |

> 0-1・0-2 は「未実装」（docs/04 でも注記あり）。0-3 は `src/types/wbs.ts` の `ProjectStatus` / `TaskStatus` を正とし、Prisma enum は Infrastructure でのみ変換利用する形へ寄せる。0-3 は P1-5-3/4・P1-6 の前提。

---

## 3. 全体ロードマップ

| Stage | 対象 | 内容 | 依存 |
|---|---|---|---|
| 0 | 前提部品 | `ActionResult` / `api-response` / 共有 enum union | — |
| 1 | **P1-1** Server Action の Prisma 直叩き（10 ファイル） | Application Service ＋ Repository 経由へ | Stage 0（ActionResult） |
| 2 | **P1-2** page.tsx の Prisma 直叩き（2 ファイル） | 取得系 Server Action へ置換 | Stage 1（Project 取得系の整備） |
| 3 | **P1-3** API Route の Prisma 直叩き（2 ファイル） | 既存 `ICompanyHolidayRepository` 経由へ | Stage 0（api-response）＋ P3-4 と協調 |
| 4 | **P1-4** Application 層の違反（3 件） | Repository IF / 抽象 IF 経由へ | Stage 0（0-3 は P1-4-1 に無関係） |
| 5 | **P1-5** Domain 層の違反（4 件） | 依存の内向き化・Prisma enum 排除 | Stage 0（0-3） |
| 6 | **P1-6** クライアントへの Prisma 混入（2 件） | `src/types/` union へ置換 | Stage 0（0-3） |
| 7 | フォローアップ | ESLint `no-restricted-imports` 導入 | Stage 1〜6 完了 |

推奨着手順：**Stage 0 → 1 →（2〜6 は並行可）→ 7**。Stage 4-1 と Stage 1-5 は同一 ProjectSettings リポジトリ IF を共有するため、まとめて対応する。

---

## 4. Stage 1: P1-1 Server Action の Prisma 直叩き（10 ファイル）

方針の共通形：各 Server Action は「Zod 検証 → `container.get<IXxxApplicationService>(SYMBOL.IXxx)` → `ActionResult` 返却」の薄い殻にし、DB 操作はすべて Application Service ＋ Repository へ移す。

### 対応の分類

| 分類 | 内容 | 対象 |
|---|---|---|
| A. 既存サービスへ委譲（拡張不要） | メソッドが揃っている | （下表で個別判定） |
| B. 既存サービスの**メソッド拡張** | サービス自体はあるが必要メソッドが不足 | milestone / work-record / phase-template |
| C. 新規 IF＋Service 新設 | 受け皿が存在しない | project-settings |

### ファイル別方針

| # | ファイル | 移管先 | 必要な準備 |
|---|---|---|---|
| 1 | [wbs-actions.ts](../../src/app/wbs/[id]/actions/wbs-actions.ts) | `WbsApplicationService`（`IWbsRepository` / `IWbsAssigneeRepository` / `IPhaseRepository` 既存） | wbs / wbsPhase / wbsAssignee は既存 IF で対応可。**wbsBuffer の取得 IF を新設**（`IWbsBufferRepository` or 既存 WBS 系に追加） |
| 2 | [milestone-actions.ts](../../src/app/wbs/[id]/actions/milestone-actions.ts) | `MilestoneApplicationService` | **拡張**：現状 `getMilestones` のみ。`createMilestone` / `updateMilestone` / `deleteMilestone` を追加（`IMilestoneRepository` に create/update/delete が必要なら追加） |
| 3 | [wbs-phase-actions.ts](../../src/app/wbs/[id]/actions/wbs-phase-actions.ts) | `PhaseApplicationService` | `IPhaseRepository` に `findByWbsId` / `update` / `delete` あり。read/update/delete を委譲。サービスに WBS フェーズ操作メソッドを追加 |
| 4 | [wbs-assignee-actions.ts](../../src/app/wbs/[id]/actions/wbs-assignee-actions.ts) | `WbsApplicationService`（`IWbsAssigneeRepository` 既存：`findByWbsId` / `delete` あり） | read/delete を委譲。`getAssignees` は既存メソッドあり |
| 5 | [project-settings-actions.ts](../../src/app/wbs/[id]/project-settings-actions.ts) | **新設** `ProjectSettingsApplicationService` | **C**：`IProjectSettingsRepository` ＋ Service を新設。scheduling 設定は既存 `ISchedulingSettingsRepository` との責務境界を整理（下記注記） |
| 6 | [schedule/action.ts](../../src/app/schedule/action.ts) | `IUserScheduleRepository`（既存）＋ Application Service | userSchedule は既存 IF。users 取得は `IUserApplicationService` / `IUserRepository` へ。TSV インポートのトランザクションは Application Service に移管 |
| 7 | [work-records/actions.ts](../../src/app/work-records/actions.ts) | `WorkRecordApplicationService` | **拡張**：現状 bulk 系のみで `getWorkRecords` 相当なし。取得メソッド（`listByXxx`）を IF＋実装に追加 |
| 8 | [get-wbs-summary.ts](../../src/app/actions/get-wbs-summary.ts) | CQRS（`GetWbsSummaryHandler` 系）へ統合 | `wbs-summary-actions.ts` と機能重複。統合可否を確認し、QueryBus 経由へ。横断置き場 `src/app/actions/` からの移設も同時に（P4-2） |
| 9 | [gantt/actions.ts](../../src/app/wbs/[id]/gantt/actions.ts) | 既に大半はサービス経由。**Prisma 部分のみ置換** | wbs / projectSettings 直叩き（`getProgressMeasurementMethod`）を `IWbsApplicationService` ＋ 新設 `ProjectSettingsApplicationService` 経由へ |
| 10 | [phase/phase-actions.ts](../../src/app/wbs/phase/phase-actions.ts) | `PhaseApplicationService`（一部委譲済み） | **拡張**：`getPhaseById` はサービスにあり委譲。`updatePhase` / `deletePhase`（phaseTemplate）用に `deletePhaseTemplate` をサービス＋ `IPhaseRepository` に追加 |

> **ProjectSettings の責務境界（重要）**：`project-settings-actions.ts` は projectSettings モデルで「ダッシュボード表示設定」と「スケジューリング設定」の両方を扱っている。scheduling 設定は既に `ISchedulingSettingsRepository` が存在するため、
> - スケジューリング系メソッド（`getSchedulingSettings` / `updateSchedulingSettings`）→ `ISchedulingApplicationService` 経由へ、
> - それ以外の projectSettings（進捗測定方式・ダッシュボード設定）→ 新設 `ProjectSettingsApplicationService` 経由へ、
> と振り分ける。P1-4-1・P1-1-9 も同じ ProjectSettings IF を利用する。

### 手順（各ファイル共通・TDD）

1. 移管先 Application Service / Repository のテストを書く（不足メソッドの期待動作を先に定義）。
2. Repository IF にメソッド追加 →（新設時は SYMBOL 追加・`inversify.config.ts` バインド）→ Infrastructure 実装。
3. Application Service にユースケースメソッドを実装（予見可能な失敗は `{ success, error }`、障害は throw）。
4. Server Action を Zod 検証＋サービス呼び出し＋`ActionResult` 返却に置換。`@/lib/prisma` の import を削除。
5. 変更系は `revalidatePath` を維持。呼び出し側（page/コンポーネント）の戻り値参照を `ActionResult` へ追随。
6. `npm run test` / `npm run lint` / `npm run build` で緑を確認。

---

## 5. Stage 2: P1-2 page.tsx の Prisma 直叩き（2 ファイル）

| # | ファイル | 現状 | 方針 |
|---|---|---|---|
| 1 | [wbs/[id]/page.tsx](../../src/app/wbs/[id]/page.tsx)（L27） | `prisma.projects.findUnique` | `ProjectApplicationService` の取得系 Server Action（`getProjectById`）へ置換 |
| 2 | [wbs/[id]/dashboard/page.tsx](../../src/app/wbs/[id]/dashboard/page.tsx)（L50） | `prisma.projects.findUnique` | 同上 |

- 既存 [projects/actions.ts](../../src/app/projects/actions.ts) の `getProjectById` がそのまま使える（Application Service 経由で準拠済み）。
- page.tsx は Server Component なので取得系 Server Action を `await` で呼ぶだけ。対象なしは `notFound()`。
- `@/lib/prisma` の import を削除。

---

## 6. Stage 3: P1-3 API Route の Prisma 直叩き（2 ファイル）

| # | ファイル | 現状 | 方針 |
|---|---|---|---|
| 1 | [api/company-holidays/route.ts](../../src/app/api/company-holidays/route.ts) | companyHoliday の findMany/create | `ICompanyHolidayRepository`（既存・DI 登録済）＋ Application Service 経由へ |
| 2 | [api/company-holidays/[id]/route.ts](../../src/app/api/company-holidays/[id]/route.ts) | findUnique/update/delete | 同上 |

- `ICompanyHolidayRepository` は `findAll` / `findByDateRange` / `findByDate` / `save` / `saveMany` / `delete` を保有。findUnique(by id) と update に対応するメソッドが不足していれば IF に追加。
- レスポンスは Stage 0-2 の `api-response.ts` ヘルパーに統一。Zod 検証を維持。
- **P3-4 との協調**：backlog では company-holidays 機能全体を Server Action + `useToast` へ全面改修し、UI 内部用 API Route は廃止する方針。P1-3 単体で「Prisma を Repository 経由に置換」して違反を解消しつつ、UI 廃止は P3-4 で行う（段階対応）。どちらを先行するかは PR 分割時に判断（API Route を残すなら Repository 経由化が必須）。

---

## 7. Stage 4: P1-4 Application 層の違反（3 件）

| # | ファイル | 現状 | 方針 |
|---|---|---|---|
| 1 | [get-wbs-summary-handler.ts](../../src/applications/wbs/query/get-wbs-summary-handler.ts)（L67） | `prisma.projectSettings.findUnique` 直叩き（TODO あり） | 新設 `IProjectSettingsRepository` 経由へ（**P1-1-5 と同一 IF**）。コンストラクタ注入に追加 |
| 2 | [geppo-import-application-service.ts](../../src/applications/geppo-import/geppo-import-application-service.ts)（L14-16） | Infrastructure 具象（`ProjectMappingService` / `UserMappingService` / `TaskMappingService`）を直接 import | 各 MappingService の **IF を Application 層に定義**し、Infrastructure 実装を DI で注入。SYMBOL（`ProjectMappingService` 等）は既存のため、IF 型に差し替え |
| 3 | [NotificationService.ts](../../src/applications/notification/NotificationService.ts)（L20） | Infrastructure の `PushNotificationService` を直接 import | `IPushNotificationService` IF を Application 層に定義して注入。併せて文字列トークン `'NotificationRepository'` / `'PushNotificationService'` を `SYMBOL` へ（P3-1 と協調） |

- 4-1 は ProjectSettings IF の新設が Stage 1-5 と共通のため、**Stage 1-5 と同一 PR にまとめる**のが効率的。
- 4-2・4-3 は「Application は Infrastructure の**インターフェース**にのみ依存可」という原則（docs/04）への適合。IF を Application 層に置き、実装 import を削除する。

---

## 8. Stage 5: P1-5 Domain 層の違反（4 件）

| # | ファイル | 現状 | 方針 |
|---|---|---|---|
| 1 | [auth-service.ts](../../src/domains/auth/auth-service.ts) | Application 層の `IAuthRepository` に依存（＝実質ユースケース） | `src/applications/auth/` へ移動し `AuthApplicationService` へ統合。Domain はリポジトリ IF に依存できない（docs/04） |
| 2 | [forecast-calculation.service.ts](../../src/domains/forecast/forecast-calculation.service.ts)（L6） | Application の `WbsTaskData` 型に依存 | 計算入力型を **Domain 層に定義**し、Application 層で `WbsTaskData` → Domain 入力型へ変換して渡す |
| 3 | [evm-metrics.ts](../../src/domains/evm/evm-metrics.ts) / [task-evm-data.ts](../../src/domains/evm/task-evm-data.ts) | `@prisma/client` の enum（`ProgressMeasurementMethod` / `TaskStatus`）に依存 | `src/types/` の union 定義へ置換（**Stage 0-3 の後**） |
| 4 | [evm-service.ts](../../src/applications/evm/evm-service.ts)（L6） / [iwbs-evm-repository.ts](../../src/applications/evm/iwbs-evm-repository.ts)（L1） | Application 層での Prisma enum 依存 | 同上。IF の DTO 型・引数を `src/types/` union へ。Prisma enum との相互変換は Infrastructure 実装内で行う |

- 5-1 は「ドメインサービスに見えて I/O を伴うユースケース」の典型。移動先で `SYMBOL.IAuthApplicationService`（既存）に統合し、呼び出し側を更新。
- 5-3・5-4 は Prisma enum のクライアント混入リスクにも直結。`iwbs-evm-repository.ts` は `ForecastCalculationMethod` / `EvmForecastMethod` も Prisma 由来のため、これらの union も Stage 0-3 に含める。

---

## 9. Stage 6: P1-6 クライアントへの Prisma 混入（2 件）

| # | ファイル | 現状 | 方針 |
|---|---|---|---|
| 1 | [project-form.tsx](../../src/app/projects/project-form.tsx)（L27） | `@prisma/client` の `ProjectStatus` を**ランタイム利用**（`z.nativeEnum`、`ProjectStatus.INACTIVE`）→ クライアントバンドルに Prisma 混入 | `src/types/wbs.ts` の `ProjectStatus` union ＋ `z.enum` に置換 |
| 2 | [progress-history-content.tsx](../../src/components/wbs/progress-history-content.tsx)（L5） | `@prisma/client` の `TaskStatus` を型のみ利用 | `src/types/` の型に置換（低リスク） |

- 6-1 は**最も緊急度が高い**（ランタイムで Prisma がクライアントバンドルに混入）。`z.nativeEnum(ProjectStatus)` → `z.enum([...])`、`ProjectStatus.INACTIVE` → union のリテラルへ。
- 6-2 は型のみのため機械的置換で低リスク。

---

## 10. 新規/拡張が必要な資産の一覧

### 新設（IF＋実装＋SYMBOL＋バインド）

| 資産 | 用途 | 関連 Stage |
|---|---|---|
| `IProjectSettingsRepository` ＋ `ProjectSettingsApplicationService`（＋ `SYMBOL` 2 件） | projectSettings（進捗測定方式・ダッシュボード設定）の read/upsert | 1-5, 1-9, 4-1 |
| `IProjectMappingService` / `IUserMappingService` / `ITaskMappingService`（Application 層 IF。SYMBOL は既存流用） | geppo-import の Infra 具象依存を IF 化 | 4-2 |
| `IPushNotificationService`（Application 層 IF。SYMBOL 追加、文字列トークン廃止） | notification の Infra 具象依存を IF 化 | 4-3 |
| `IWbsBufferRepository`（または既存 WBS 系 IF へ buffer メソッド追加） | wbsBuffer 取得 | 1-1 |

### 既存の拡張（メソッド追加）

| 資産 | 追加メソッド（例） | 関連 Stage |
|---|---|---|
| `MilestoneApplicationService` / `IMilestoneRepository` | `createMilestone` / `updateMilestone` / `deleteMilestone` | 1-2 |
| `WorkRecordApplicationService` / `IWorkRecordRepository` | 取得系（`listByWbs` 等） | 1-7 |
| `PhaseApplicationService` / `IPhaseRepository` | `deletePhaseTemplate`、WBS フェーズ操作 | 1-3, 1-10 |
| `ICompanyHolidayRepository` | `findById` / `update`（不足時） | 3 |
| `AuthApplicationService` | `auth-service.ts` のロジック統合 | 5-1 |

### `src/types/` へ集約する union（Stage 0-3）

- `TaskStatus`（P2-4：5 箇所重複を統合）
- `ProgressMeasurementMethod` / `ForecastCalculationMethod` / `EvmForecastMethod`
- `ProjectStatus`（既存 `src/types/wbs.ts` を正とする）

---

## 11. 検証方法

各 PR で以下を必須とする。

- `npm run test`（ユニット）／必要に応じ `npm run test:integration`（Repository 実装）
- `npm run lint`
- `npm run build`（クライアントバンドルへの Prisma 混入は build で検出しやすい。特に P1-6）
- 手動確認：置換した画面の CRUD/表示が従来通り動くこと（`revalidatePath` の効き含む）

---

## 12. 完了後のフォローアップ（Stage 7）— 対応済み

[docs/04-architecture-principles.md](../04-architecture-principles.md) の「依存ルールの機械的強制」に従い、`eslint.config.mjs` に `no-restricted-imports` を追加してレイヤー境界を機械強制した。

- `src/domains/**` → domains/types 以外を禁止
- `src/applications/**` → infrastructures/UI/Prisma を禁止
- `src/app/**` / `src/components/**` / `src/hooks/**` → infrastructures/domains/Prisma を禁止

導入時、当初の棚卸し（Stage 1〜6）には含まれていなかった UI→Domain 直接依存が 11 ファイルで新たに検出された。ビルドを止めないよう、各箇所は `eslint-disable-next-line no-restricted-imports` ＋ TODO コメントで一時抑制し、[docs/09-refactoring-backlog.md](../09-refactoring-backlog.md) の **P1-7** として個別解消対象を記録した。今後の新規コードでは抑制を追加せず、Application Service 経由でアクセスすること。

---

## 13. PR 分割の目安

| PR | 内容 | 前提 |
|---|---|---|
| PR-0a | `ActionResult<T>` 型新設 | — |
| PR-0b | `api-response.ts` 新設 | — |
| PR-0c | `src/types/` enum union 集約（TaskStatus/EVM 系） | — |
| PR-1a | ProjectSettings IF＋Service 新設（1-5 / 1-9 / 4-1） | PR-0a |
| PR-1b | wbs-actions / wbs-assignee-actions（1-1 / 1-4） | PR-0a |
| PR-1c | milestone-actions（1-2、サービス拡張） | PR-0a |
| PR-1d | wbs-phase-actions / phase-actions（1-3 / 1-10） | PR-0a |
| PR-1e | schedule/action（1-6） | PR-0a |
| PR-1f | work-records/actions（1-7、サービス拡張） | PR-0a |
| PR-1g | get-wbs-summary 統合（1-8、CQRS） | — |
| PR-2 | page.tsx 2 件（2-1 / 2-2） | 既存 getProjectById |
| PR-3 | company-holidays API（3、P3-4 と協調） | PR-0b |
| PR-4a | geppo-import IF 化（4-2） | — |
| PR-4b | notification IF 化＋SYMBOL 化（4-3、P3-1 協調） | — |
| PR-5a | auth-service を Application へ移動（5-1） | — |
| PR-5b | forecast 入力型の Domain 化（5-2） | — |
| PR-5c | EVM の Prisma enum 排除（5-3 / 5-4） | PR-0c |
| PR-6 | クライアント Prisma 混入除去（6-1 / 6-2） | PR-0c |
| PR-7 | ESLint 境界強制の導入 | 全 P1 完了 |
