# システム構成（Overview）

本システムの技術構成とデータフローの全体像を示します。詳細は各ドキュメントを参照してください。

## 構成要素
- Webアプリ: Next.js(App Router, API Routes)
- データストア（主系）: PostgreSQL + Prisma
- 参照データストア: MySQL（WBS/Geppo）
- バッチ/自動化: Cron/Jenkins（アプリ内API呼び出し）
- 通知: Web Push (VAPID) / In-App

## アーキテクチャ図
```
[Browser,Cron/Jenkins]
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