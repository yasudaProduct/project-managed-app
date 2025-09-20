# プロジェクト構造

本リポジトリの主要ディレクトリと責務を定義します。実体と乖離が出た場合は本書を更新します。

```
project-managed-app/
  src/
    app/                # Next.js App Router（ルート、API、サーバアクション）
    components/         # UI/複合コンポーネント
    applications/       # ユースケース（アプリケーション層）
    domains/            # エンティティ/値オブジェクト/ドメインサービス
    infrastructures/    # DB/外部I/O/リポジトリ実装
    lib/                # 共通ユーティリティ
    hooks/              # React Hooks
    types/              # 型定義
    utils/              # 汎用関数
    __tests__/          # 単体/統合/E2Eのテスト配置
    __integration_tests__/
  prisma/               # Prismaスキーマ/マイグレーション/Seed
  mysql/                # 参照用MySQLの初期化・手順
  docker/               # ジョブ/コンテナ関連スクリプト（cron）
  docs/                 # ドキュメント（本書を含む）
  jenkins/              # Jenkinsの設定例
  public/               # 静的ファイル
```

## 命名/配置ガイド
- 画面に関わる処理は`src/app`と`src/components`
- ビジネスロジックは`applications`/`domains`に置き、UIから切り離す
- DBアクセス/外部APIは`infrastructures`に集約
- 共通型は`types`、汎用関数は`utils`

## API
- App Routerの`src/app/api/**`でエンドポイントを提供
- Import関連は `IMPORT_API_DOCS.md` を参照

## DB/マイグレーション
- 主系: PostgreSQL（`prisma/schema.prisma`）
- 参照: MySQL（`prisma/schema.mysql.prisma`）

## テスト
- ユニット: `src/__tests__/` の `*.test.ts(x)`
- 統合: `jest.integration.config.js` 準拠
- E2E: `playwright.config.ts` 準拠（`src/__tests__/e2e`）

## スタイル/静的解析
- ESLint: `eslint.config.mjs`（Next.js + TypeScript）
- Tailwind: `tailwind.config.ts`
- TypeScript: `tsconfig.json`
