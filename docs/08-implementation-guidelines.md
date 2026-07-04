# 実装ガイドライン（ライブラリ・実装パターンの使い分け）

このドキュメントは「このケースではこのライブラリ／このパターンを使う」という判断ルールを定めます。
レイヤー間の依存ルールは `docs/04-architecture-principles.md`、命名・コーディングスタイルは `docs/03-coding-style.md` を参照してください。

現状のコードには本ガイドラインに反する実装が残っています。違反箇所の一覧と優先度は `docs/09-refactoring-backlog.md` を参照してください。**新規コードは本ガイドラインに準拠必須**です。

## 1. データ取得・更新の使い分け

| ケース | 使う手段 |
|---|---|
| ページ初期表示のデータ取得 | Server Component（page.tsx）から取得系 Server Action を呼ぶ |
| ユーザー操作による作成・更新・削除 | Server Action（Application Service 経由）＋ `revalidatePath` |
| クライアント側でキャッシュ・再取得・ポーリングが必要な取得 | TanStack Query（`queryFn` から Server Action を呼ぶ） |
| ストリーミング（SSE）、cron、Webhook、外部システムからのアクセス | API Route（`src/app/api/`） |
| 上記以外での `fetch()` の直接呼び出し | **禁止** |

判断基準:

- **UI からの通常の CRUD → Server Action**。API Route を UI 内部のデータ取得・更新に使わない。
- **HTTP エンドポイントとして UI 以外（cron・外部システム・SSE クライアント）から叩かれる必要がある → API Route**。
- TanStack Query を使う場合も `queryFn` の中身は Server Action 呼び出しとする（`use-wbs-summary.ts` が参考実装）。生 `fetch` を書かない。

データアクセスの経路はレイヤーを問わず一本化する:

```text
UI（page.tsx / client component）
  → Server Action（"use server"、Zod検証、ActionResult返却）
    → Application Service（container.get 経由で解決）
      → Repository IF → Repository 実装（ここだけが Prisma を知る）
```

Server Action・page.tsx・API Route から `@/lib/prisma` を import することは**禁止**（詳細は docs/04）。

## 2. フォーム

- **react-hook-form + zodResolver + shadcn/ui の `Form` コンポーネント**で実装する（参考実装: `src/app/projects/project-form.tsx`, `src/components/wbs/wbs-form.tsx`）。
- `useState` による手書きフォームは禁止（検索ボックス等の単一入力を除く）。
- 送信は Server Action を呼ぶ。フォームから `fetch` で API Route を叩かない。
- Zod スキーマはフォームファイルにコロケーションしてよい。ただし**サーバー側（Server Action）でも必ず再検証する**。クライアント側の検証は UX のためであり、境界防御はサーバー側の責務。
- クライアントとサーバーで同一スキーマを使える場合は、ルートセグメント配下の `schemas.ts` に切り出して共有する。

## 3. バリデーション

- バリデーションライブラリは **Zod に統一**。
- 必ず検証する 3 つの境界:
  1. **Server Action の入力**（最重要。TypeScript の型注釈はランタイム防御にならない）
  2. **API Route のリクエストボディ／クエリパラメータ**
  3. **フォーム入力**（UX 目的）
- `safeParse` を使い、失敗は `ActionResult` のエラーとして返す（Server Action）、または 400/422 を返す（API Route）。

## 4. 日付・時刻

方針（UTC 保存・ISO 8601 入出力・比較は epoch ミリ秒）は `CLAUDE.md` の「日付・タイムゾーンの取り扱いポリシー」に従う。実装ルール:

- **表示整形は `src/utils/date-util.ts` の `formatDate` に一元化**する。コンポーネント内での `toLocaleDateString` 直接呼び出し、ローカル `formatDate` の再定義は禁止。
- **日付演算（加算・差分・月境界・営業日）は date-fns を使う**。`getFullYear()/getMonth()/getDate()` を連結する手組みの文字列生成は、ローカルタイムゾーンに依存して UTC 保存値とズレるため禁止。
- 日付のみ（終日）の演算や DST を跨ぐ演算が必要になった場合は `date-fns-tz` を導入する（現在未導入）。
- 新しい日付ユーティリティが必要な場合は `date-util.ts` に追加し、テストを書く。

## 5. エラーハンドリング

レイヤー別の方針は docs/04 を参照。使い分けの要点:

- **Application Service**: ビジネス上予見可能な失敗（重複・対象なし等）は `{ success: false, error }` を返す。予期しない障害（DB断など）は throw して境界で捕捉。1 つのサービス内で Result と throw を恣意的に混在させない。
- **Server Action**: 共通型 `ActionResult<T>`（`src/types/action-result.ts`・新設対象）を返す。エラーメッセージのキーは `error` に統一（`message` は使わない）。
- **API Route**: `src/lib/api-response.ts`（新設対象）の `createApiResponse` / `createApiError` を使う。
- **UI での失敗通知は `useToast`**（`src/hooks/use-toast.ts`）。`alert()` / `window.confirm()` は禁止。
- カスタムエラーが必要な場合は `Error` を継承したクラスに `type` と `details` を持たせる（参考: `src/domains/sync/ExcelWbs.ts` の `SyncError`）。

## 6. ロギング

- デバッグ用の `console.log` をコミットしない。
- エラー記録は境界（Server Action / API Route / Application Service の catch 節）で `console.error` を使う。ドメイン層・リポジトリ内での ad hoc なログ出力は避ける。
- 構造化ロガーの導入は将来課題（現時点では console ベースで統一）。

## 7. 型・enum の単一定義

- **アプリ内で共有する enum 相当（`TaskStatus`, `ProjectStatus`, `PeriodType`, `KosuType` 等）は `src/types/` に 1 箇所だけ定義**する（`as const` + union。docs/03 の「enumは原則非推奨」に従う）。
- **Prisma の enum（`@prisma/client`）を参照してよいのは Infrastructure 層のみ**。リポジトリ実装内で `src/types/` の union と相互変換する。Domain / Application / UI での Prisma enum の import は禁止（クライアントバンドルに Prisma が混入する事故も防ぐ）。
- 同名の型を複数ファイルで再定義しない。既存の重複（`TaskStatus` が 5 箇所）は統合対象（docs/09 参照）。
- `src/types/` に置いてよいもの: 全レイヤー共有の enum/union、DTO・ViewModel 型、DI シンボル（`symbol.ts`）。ドメインの振る舞いを持つものは `src/domains/` へ。

## 8. UI コンポーネント

- `src/components/ui/`（shadcn/ui）のコンポーネントを優先使用する。素の `<button>` `<input>` `<select>` は原則禁止（Gantt チャート等、独自描画が必要な箇所は例外）。
- 通知トーストは `useToast` + `<Toaster />`。
- ページ専用コンポーネントは `app/<feature>/_components/`、全体共有は `src/components/` に配置（docs/03 参照）。

## 9. DI（Inversify）の登録手順

新機能を追加するときの手順と規約:

1. `src/domains/<feature>/` — エンティティ・値オブジェクト・ドメインサービス
2. `src/applications/<feature>/` — リポジトリ IF（`i<feature>-repository.ts`）と Application Service（IF + 実装をコロケーション）
3. `src/infrastructures/<feature>/` — リポジトリ実装
4. `src/types/symbol.ts` — SYMBOL エントリ追加
5. `src/lib/inversify.config.ts` — バインド追加
6. UI（Server Action → `container.get<IXxx>(SYMBOL.IXxx)`）

規約:

- **DI トークンは必ず `SYMBOL` を使う。文字列リテラル（`'NotificationRepository'` 等）は禁止**。
- Application Service には必ずインターフェース（`IXxxApplicationService`）を定義し、UI からはインターフェースで解決する。
- 使わなくなった SYMBOL エントリ・バインドは即削除する（コメントアウトで残さない）。

## 10. CQRS（QueryBus）の適用基準

- 既定は「Application Service + Repository」。**迷ったら CQRS を使わない**。
- 複数の集約を横断する読み取り専用の集計・一覧（例: ダッシュボード統計 `GetDashboardStatsQuery`、WBS サマリー `GetWbsSummaryQuery`）のみ、QueryBus + QueryHandler + 専用 QueryRepository を使う。
- Handler を名乗るクラスは必ず `IQueryHandler` を実装し、`inversify.config.ts` で QueryBus に register して `queryBus.execute()` 経由で呼び出す。DI から Handler を直接取得して独自メソッドを呼ぶ実装（現状の `WbsAnalyticsHandler`）は不可。
