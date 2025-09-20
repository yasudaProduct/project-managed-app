# プロジェクト概要

## 環境
- **Dev**: Docker ComposeでPostgreSQL/MySQL（参照用）を起動、`npm run dev`
- **Stg/Prod**: URL/環境変数/ジョブスケジュールが異なる（詳細は後続ドキュメント参照）

## 技術スタック
- Next.js(App Router), TypeScript, Tailwind CSS
- Prisma, PostgreSQL（主系）
- MySQL（参照: WBS, Geppo）
- Jest/Playwright（テスト）
- Docker/Compose, Cron/Jenkins（運用）
- Web Push (VAPID)

## 既知の前提/制約
- 参照用MySQLは原則リードオンリー（本番接続での開発は可能だが注意）
- テスト戦略は整備中（暫定は `README.md` のコマンド参照）
- 詳細仕様は整備中