# プロジェクト管理アプリケーション

## 開発環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、必要な環境変数を設定してください。
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
GEPPO_DATABASE_URL=mysql://test_user:test_password@localhost:3307/project_managed_test
```

### 3. データベース

#### 3.1 docker セットアップ
```bash
docker compose up --build -d
```
### 3.2 Prismaセットアップ

```bash
# マイグレーション実行
npx prisma migrate dev

# Prismaクライアント生成
npx prisma generate

# シードデータ投入
npx prisma db seed

```


## Prisma
```bash
# 新しいマイグレーション作成
npx prisma migrate dev --name <migration_name>

# データベースをリセット
npx prisma migrate reset
```

## テスト

### テスト戦略

1. **TDD（テスト駆動開発）**: 新機能開発時は原則としてテストファーストで進める
2. **多層テスト**: ユニット、統合、E2Eテストによる多層防御
3. **ビジュアルリグレッション**: Playwrightによるスクリーンショット比較
4. **継続的テスト**: CI/CDパイプラインでの自動テスト実行

### テストの種類と実行方法

#### 1. ユニットテスト（Jest + React Testing Library）

```bash
# ユニットテストを実行
npm run test

# ウォッチモードで実行
npm run test:watch

# カバレッジ付きで実行
npm run test:coverage
```

#### 2. 統合テスト（Jest）

```bash
# 統合テストを実行
npm run test:integration

# ウォッチモードで実行
npm run test:integration:watch
```

### 開発

```bash
npm run dev          # 開発サーバー起動（Turbopack使用）
npm run build        # 本番用ビルド
npm run lint         # ESLint実行
```

### 主要技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL, Prisma ORM
- **状態管理**: TanStack Query
- **UI コンポーネント**: shadcn/ui Radix UI
- **依存性注入**: Inversify
- **テスト**: Jest, React Testing Library, Playwright