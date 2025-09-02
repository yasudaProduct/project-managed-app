# プロジェクト管理アプリケーション

## 開発環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、必要な環境変数を設定してください。
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
GEPPO_DATABASE_URL=mysql://test_user:test_password@localhost:3307/project_managed_test

# WebPush
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BL42r4cS084h4ZS7p01Q-HuRzvzfjCuzVDs_f9GlEEEYmJiWrasMKbD9lZY5ayxtC0uvWr_XjCHYAGp_Gool4KY
VAPID_PRIVATE_KEY=w22msVOERtwnBHB5Kze0KllnqpGKnyFJ9SZEYCq9gX8
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

### 4.開発

```bash
# 開発サーバー起動
npm run dev
```


## Tips

### Prisma
```bash
# 新しいマイグレーション作成
npx prisma migrate dev --name <migration_name>

# データベースをリセット
npx prisma migrate reset
```

### VSCode 拡張機能
 - Terminal Keeper

## テスト

### テスト戦略

```bash
...未検討
```

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