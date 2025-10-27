# アーキテクチャ原則

本プロジェクトはオニオンアーキテクチャを土台に、読み取り最適化にCQRSを一部導入します。

## 基本原則

- 依存は内向き（Domain ← Application ← Infrastructure/UI）
- ドメインにビジネスルールを閉じ込める（貧血モデル禁止）
- インフラ詳細（DB/外部API）は境界の外側に隔離
- テスト容易性を重視
- 読み取りは必要に応じてCQRSで最適化

## レイヤ責務

- Domain: エンティティ/値オブジェクト/ドメインサービス
- Application: ユースケース、トランザクション、リポジトリIF
- Infrastructure: リポジトリ実装、外部I/O
- UI: Next.js(App Router/Components/API Routes)

## 依存ルール

### 依存関係マトリクス（レイヤ間）

| From \ To | Domain | Application | Infrastructure | UI |
|---|---|---|---|---|
| Domain | ✓ | ✗ | ✗ | ✗ |
| Application | ✓ | ✓ | ✗ | ✗ |
| Infrastructure | ✓ | ✓ (IFに限る) | ✓ | ✗ |
| UI | ✗ | ✓ | ✗ | ✓ |

補足:

- Infrastructure→Applicationは「インターフェース」への依存のみ可。UI/具体実装へは依存不可。
- UIはRepositoryやPrisma等の具体実装へは直接依存不可。必ずApplication経由。

### ディレクトリ別 import ルール

- `src/domains/**`
  - 依存「可」:
    - `src/domains/**`
    - `src/types/**`
- `src/applications/**`
  - 依存「可」:
    - `src/domains/**`
    - `src/applications/**`
    - `src/types/**`
    - `src/utils/**`（副作用なし）
- `src/infrastructures/**`
  - 依存「可」:
    - `src/applications/**`（インターフェース/DTO等の契約）
    - `src/domains/**`（マッピング用）
    - `src/types/**`
    - `src/lib/**`, Prisma Client
- `src/app/**` と `src/components/**`（UI層）
  - 依存「可」:
    - `src/applications/**`
    - `src/components/**`
    - `src/hooks/**`,
    - `src/lib/**`,
    - `src/types/**`
- `src/utils/**`, `src/types/**`（共有ユーティリティ）
  - 原則として他レイヤに依存しない。どのレイヤからも参照可。

## エラーハンドリング

本プロジェクトでは、レイヤごとに責務を分離しつつ、ユーザー体験と運用性を損なわない一貫したエラーハンドリングを行う。

- 目的
  - ユーザーには分かりやすい日本語メッセージを返す
  - 開発・運用視点では原因特定可能なコード/詳細を保持しログに記録する
  - 予期可能なビジネス上の失敗は「例外を投げず」戻り値で扱う（Application層のResultパターン）
  - 予期しない障害は例外で伝播させ、境界でHTTPに正規化する

### エラー分類（標準）

- ValidationError: 入力・パラメータ不正（Zodなど）→ 400/422
- Unauthorized: 認証なし → 401（例: `getCurrentUserIdOrThrow`）
- Forbidden: 権限不足 → 403
- NotFound: 対象リソースなし → 404
- Conflict: 一意制約違反・競合 → 409
- UnprocessableEntity: ドメイン整合性上のエラー → 422
- RateLimit: レート超過 → 429
- DependencyError: 外部API/DB障害・タイムアウト → 503/504
- Unknown/Internal: それ以外 → 500

現状の実装では以下が利用されているため、これをベースに統一する。

- APIルートの標準レスポンスヘルパー: `src/lib/api-response.ts`
  - `createApiResponse`, `createApiError`, `createImportResponse`, `createImportError`
- 入力検証: Zod（例: `src/app/api/company-holidays/*`）
- ドメイン固有の同期エラー: `SyncError` + `SyncErrorType`（`src/domains/sync/ExcelWbs.ts`）
- サーバーアクション/アプリケーションサービスの結果: `{ success: boolean, error?: string }` を返す（例: プロジェクト/WBS/タスク）

### レイヤ別の方針

- Domain（ドメイン層）
  - 値オブジェクト・エンティティの不変条件はコンストラクタ/メソッド内で担保。
  - 事前に予見できるビジネス上の失敗は、Application層が検証・分岐で吸収することを基本とし、例外の多用は避ける。
  - 例外を投げる場合はカスタム例外（例: `SyncError`）を用い、`type` と `details` を保持して原因を特定可能にする。

- Application（ユースケース層）
  - 予見可能な失敗は Result 形式で返す: `{ success: false, error: string }`。
  - ドメイン/インフラからの例外はキャッチし、上記 Result へ正規化する。
  - トランザクション境界で try/catch を行い、ロールバックとログを確実化する。
  - バリデーションは Zod などで実施し、ZodError を境界でHTTP 400/422へマップ。

- Infrastructure（リポジトリ・外部I/O）
  - 生の例外（Prisma 例外など）は上位に漏らさず、意味のあるエラー（Conflict/NotFound/Dependency）にマッピングするか Application 層に投げ、そこで正規化する。
  - 一意制約違反は Conflict、対象なしは NotFound、接続障害は DependencyError として扱う方針。

- UI/API（Next.js App Router, API Routes）
  - API ルートでは `createApiResponse` / `createApiError` を基本とし、レスポンス形を統一する。
  - 会社休日APIのように Zod を使う場合は、`error instanceof z.ZodError` を 400/422 にマップし `errors` に詳細を返す。
  - `getCurrentUserIdOrThrow` 等で投げられる Unauthorized は 401 にマップする（メッセージは一般化）。
  - インポート系は `createImportResponse` / `createImportError` を用い、集計値・エラー配列を返す（例: `src/app/api/import/wbs/route.ts`）。

### API レスポンス標準

原則として `src/lib/api-response.ts` のヘルパーを使用し、以下の形を維持する。

- 成功: `{ success: true, data, message?, timestamp }`（HTTP 2xx）
- 失敗: `{ success: false, error, errors?, timestamp }`（HTTP 4xx/5xx）

補足ルール:

- メッセージはユーザー向けの日本語。内部事情（SQL・スタックトレース）は含めない。
- 同一エンドポイント内で直接 `NextResponse.json` を使う場合も構造を上記に揃える。
- 409/422/404/401/403/500 など、意味のあるステータスコードを選択する。

### バリデーションの扱い

- 入力は Zod でスキーマ定義し、`parse` または `safeParse` を用いる。
- `ZodError` は API 境界で捕捉し、400（形式エラー）または 422（ビジネス上の不整合）へマッピングする。
- 必須フィールドの簡易検証には `validateRequiredFields` を使用可（`src/lib/api-response.ts`）。

### 例外と戻り値の使い分け

- ビジネス的に起こり得る分岐（重複・存在しない等）
  - Application 層で `{ success: false, error }` を返す（例: プロジェクト名の重複）。
- 予期しない障害（DB ダウン・ネットワーク断・プログラミングエラー）
  - 例外として伝播させ、API 層で 500/503 に正規化し、ログに詳細を残す。

### ログとの連携（要約）

- エラー時は発生源（アプリケーションサービス名・メソッド名・主要ID）を含めて `console.error` で記録する。
- ユーザーに返すメッセージは簡潔・非機密。詳細はログで追跡可能にする。
- 将来的には `src/lib/logger.ts` 等の構造化ロガー導入を想定（requestId 等の相関ID対応）。

### 具体例（現状コードに準拠）

- Zod 検証 → 400/422
  - `src/app/api/company-holidays/route.ts` の `POST`/`PUT` を参照。
- インポート系の集計レスポンス
  - `src/app/api/import/wbs/route.ts` は `createImportResponse`/`createImportError` を使用。
- 未認証 → 401
  - `src/lib/get-current-user-id.ts` の `getCurrentUserIdOrThrow` を呼ぶ API では、Unauthorized を捕捉し 401 返却。
- ドメイン固有エラー
  - `SyncError`（`type` と `details` を持つ）を Application 層で Result に正規化し、API で HTTP にマップ。

### 実装規約（チェックリスト）

- [ ] API ルートは `createApiResponse` / `createApiError` を優先して使用する
- [ ] Zod の `ZodError` は 400/422 で返し、`errors` に詳細を含める
- [ ] Application 層は `{ success: boolean; error?: string }` を返し、例外は境界で吸収する
- [ ] Prisma 等の例外は Conflict/NotFound/Dependency にマップして扱う
- [ ] ユーザー表示メッセージは日本語・簡潔・非機密、技術的詳細はログにのみ残す
- [ ] Unauthorized/Forbidden/NotFound/Conflict などの HTTP ステータスは意味に沿って選択
- [ ] 予期しない例外は 500/503 へ正規化し、スタックトレースはログのみに出力

補足: 既存で `NextResponse.json` を直接返している箇所（例: 通知API・休日APIの一部）は、順次 `api-response` ヘルパーで統一することを推奨。

## ロギング/監査

## セキュリティ
