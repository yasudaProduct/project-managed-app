# ドメインモデル概要

ER図と実装中の`domains`配下を要約し、主要集約と境界を明確化します。詳細は`ERD.md`及びコード参照。

## 主要集約
- Project 集約
  - `projects`, `project_settings`
  - 責務: プロジェクトのライフサイクル、設定
- WBS 集約
  - `wbs`, `wbs_phase`, `wbs_task`, `task_period`, `task_kosu`, `task_status_log`, `milestone`, `task_dependencies`, `wbs_buffer`
  - 責務: タスク分解、期間/工数、依存関係、バッファ
- WorkRecord 集約
  - `work_records`, 参照: `users`, `wbs_task`
  - 責務: 実績工数の記録（Geppoインポート）
- Notification 集約
  - `notifications`, `notification_preferences`, `push_subscriptions`
  - 責務: 通知の作成/配信/既読管理
- Import 集約
  - `import_jobs`, `import_job_progress`
  - 責務: インポート実行、進捗・監査の記録

## 値オブジェクト（例）
- TaskNo, Period(KIJUN/YOTEI/JISSEKI), Kosu(NORMAL/RISK), PhaseCode

## 不変条件（例）
- Period: startDate ≤ endDate
- Task: フェーズ/担当が存在する場合、参照整合が取れていること
- WorkRecord: hours_worked ≥ 0、1日24h以内

## ドメインサービス（例）
- 依存関係検証: 循環依存の検出、期間整合チェック
- 進捗集計: `wbs_progress_history`作成支援（将来の履歴機能と連携）

## リポジトリ境界
- Application層にIFを定義（例: `ITaskRepository`）
- InfrastructureでPrisma実装（例: `PrismaTaskRepository`）

## 境界づけられたコンテキスト
- 計画（WBS）と実績（WorkRecord）は別境界。同期はインポートが担保
- 通知は横断境界（イベント入力、配信出力）
