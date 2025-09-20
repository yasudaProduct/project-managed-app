# MySQL Database Setup

このプロジェクトでMySQLを使用する場合の設定手順です。

## ファイル構成

- `compose.mysql.yml` - MySQL用のDocker Compose設定
- `prisma/schema.mysql.prisma` - MySQL用のPrismaスキーマ
- `mysql/init/` - MySQL初期化スクリプト

## 環境変数設定

`.env`ファイルに以下の環境変数を設定してください：

```env
GEPPO_DATABASE_URL="mysql://test_user:test_password@localhost:3307/project_managed_test?charset=utf8mb4"
```

## セットアップと実行

### ワンコマンドセットアップ
```bash
# MySQL環境の一括セットアップ（推奨）
npm run mysql:setup
```

### 個別実行

```bash
# MySQL用compose.ymlを使用してコンテナを起動
npm run mysql:start
# または
docker compose -f compose.mysql.yml up -d

# シードデータのみ投入
npm run mysql:seed

# ログの確認
npm run mysql:logs

# コンテナの停止
npm run mysql:stop
```

## MySQL用Prismaマイグレーション

MySQLを使用する場合は、専用のスキーマファイルを使用してください：

```bash
# スキーマをプル
npx prisma db pull --schema=prisma/schema.mysql.prisma

# MySQL用Prismaクライアントの生成
npx prisma generate --schema=/prisma/schema.mysql.prisma
```