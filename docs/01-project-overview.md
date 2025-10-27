# プロジェクト概要

## 技術スタック

- Next.js(App Router), TypeScript, Tailwind CSS
- Prisma, PostgreSQL（主系）
- MySQL（参照: WBS, Geppo）
- Jest/Playwright（テスト）
- Docker/Compose, Cron/Jenkins（運用）
- Web Push (VAPID)

## 環境

- **Dev**: Docker ComposeでPostgreSQL/MySQL（参照用）を起動、`npm run dev`
- **Stg/Prod**: URL/環境変数/ジョブスケジュールが異なる（詳細は後続ドキュメント参照）

## プロジェクト構造

本リポジトリの主要ディレクトリと責務を定義します。実体と乖離が出た場合は本書を更新します。

```text
project-managed-app/
  src/
    __tests__/          # 単体/統合/E2Eのテスト配置
    __integration_tests__/
    app/                # Next.js App Router
    applications/       # ユースケース（アプリケーション層）
    components/         # UI/複合コンポーネント(React)
    contexts/           # React Context
    data/               # seed
    domains/            # エンティティ/値オブジェクト/ドメインサービス
    hooks/              # React Hooks
    lib/                # 共通ユーティリティ
    infrastructures/    # DB/外部I/O/リポジトリ実装
    types/              # 型定義
    utils/              # 汎用関数
  prisma/               # Prismaスキーマ/マイグレーション/Seed
  mysql/                # 参照用MySQLの初期化・手順
  docker/               # ジョブ/コンテナ関連スクリプト（cron）
  docs/                 # ドキュメント（本書を含む）
  jenkins/              # Jenkinsの設定例
  public/               # 静的ファイル
```

## 簡易アーキテクチャ図

```text
[Browser][Cron/Jenkins]
   │
   ▼
[Next.js (App/Pages, API Routes)] ────────────────> [Web Push]
   │
   ├─> [Prisma] ──> [PostgreSQL]
   │
   └─> [Prisma] ──>[MySQL Readonly]
                    ├─ WBS テーブル
                    └─ Geppo テーブル
```

## テスト

- ユニット: `src/__tests__/` の `*.test.ts(x)`
- 統合: `jest.integration.config.js` 準拠
- E2E: `playwright.config.ts` 準拠（`src/__tests__/e2e`）

## スタイル/静的解析

- ESLint: `eslint.config.mjs`（Next.js + TypeScript）
- Tailwind: `tailwind.config.ts`
- TypeScript: `tsconfig.json`

## 前提/制約

- 参照用MySQLは原則リードオンリー（本番接続での開発は可能だが注意）
- テスト戦略は整備中（暫定は `README.md` のコマンド参照）
- 詳細仕様は整備中
