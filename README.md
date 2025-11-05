# プロジェクト管理アプリケーション

## ドキュメント一覧

1. [プロジェクト概要](/docs/01-project-overview.md)
2. [画面一覧](/docs/06-screen-list.md)

---

## 開発環境のセットアップ

### 前提
Windowsの場合はWSL上で開発を前提とします。(WSL構築の手順は省略)

#### 必要環境
- Node.js: v22.x
- npm: （Node.jsに同梱）
- Docker: 最新安定版（Compose対応必須）

### 1. 依存関係のインストール

```bash
npm install
```

---

### 2. 環境変数の設定

`.env`ファイルを作成し、必要な環境変数を設定してください。
```bash
TZ = 'Asia/Tokyo'

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
GEPPO_DATABASE_URL=mysql://test_user:test_password@localhost:3307/project_managed_test

NEXT_PUBLIC_BASE_URL=http:localhost:3000

# Push Notification VAPID Keys
CRON_SECRET=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

#### 2.1 プッシュ通知 VAPID キーの生成

Web Push の署名に使用するVAPIDキーは以下で生成します。<br>
出力された `NEXT_PUBLIC_VAPID_PUBLIC_KEY` `VAPID_PRIVATE_KEY` `CRON_SECRET` `VAPID_SUBJECT`を <br>
`.env`に追記して下さい。

```
# 鍵の生成
node script/generate-vapid-keys.js
```

---

### 3. データベース
開発時のDBサーバーはdockerにて構築して下さい。 <br>

#### 3.1 docker セットアップ

```bash
# イメージビルド
docker compose up --build

# postgres立ち上げ
docker compose up db -d
```

#### 3.2 Prismaセットアップ

```bash
# マイグレーション実行
npx prisma migrate dev

# Prismaクライアント生成
npx prisma generate

# シードデータ投入
npx prisma db seed
```

#### mysql構築(WBS・GEPPOデータベース)
mysqlへは読み取りしか行なっていない(※)ため、本番へ接続した状態で開発は可能ですが、テストデータを使用したい場合などは <br>
[mysql/README.md](mysql/README.md)を参考に構築して下さい。
※リードオンリーの制御は行なっていません。

### 4.開発

```bash
# 開発サーバー起動
npm run dev
```

## Tips

### 拡張機能インストール
extensions.jsonに記載されてある拡張機能のインストールを推奨します。<br>
コマンドパレットでExtensions: Add to Recommended Extensionsを選択すると表示されます。

### Prisma

テーブル定義を変更した場合
```bash
# 新しいマイグレーション作成
npx prisma migrate dev --name <migration_name>

# マイグレーションを適応
npx prisma migrate dev
```

```bash
# データベースをリセット
npx prisma migrate reset
```

## テスト

### テスト戦略

```bash
...未検討
```

---

## Cron コンテナの使い方

アプリとは別に、定期実行（通知チェック/クリーンアップ/インポート実行 など）を行う cron 専用コンテナを用意しています。

### ビルド

```bash
docker build -f docker/cron/dockerfile-cron -t project-managed-cron:latest .
```

### docker compose での起動（cron）

```bash
# cron コンテナのみビルド/起動
docker compose build notification-cron
docker compose up -d notification-cron

# ログ確認
docker compose logs -f notification-cron
```

compose による `notification-cron` では、以下の環境変数が設定されています（compose.yml参照）。必要に応じて `.env` で上書きしてください。

- `API_BASE_URL=http://app:3000`（アプリの API を同一ネットワーク内の `app` サービスへ）
- `SYSTEM_USER_ID=system`
- `SLEEP_BETWEEN_TRIGGERS=2`
- `MAX_TO_TRIGGER=50`
- `CRON_SECRET`（`.env` から取り込み）


### テストの種類と実行方法

#### 1. ユニットテスト

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