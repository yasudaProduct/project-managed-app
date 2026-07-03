# ドメインモデル概要

ER図と実装中の`src/domains/`配下を要約し、主要集約と境界を明確化します。詳細は`ERD.md`及びコード参照。

## 主要集約

### Project 集約
- `projects`, `project_settings`
- 責務: プロジェクトのライフサイクル、ステータス管理、設定（進捗測定方式・見通し計算方式・EVM除外設定等）
- 主要エンティティ: `Project`（id, name, status, description, startDate, endDate）

### WBS 集約
- `wbs`, `wbs_phase`, `wbs_task`, `task_period`, `task_kosu`, `task_status_log`, `milestone`, `task_dependencies`, `wbs_buffer`, `wbs_assignee`, `wbs_tag`
- 責務: タスク分解、期間/工数管理、依存関係、バッファ、担当者割当、タグ分類
- 主要エンティティ:
  - `Wbs`（id, projectId, name）
  - `WbsAssignee`（wbsId, userId, rate, costPerHour, seq）
  - `WbsTag`（wbsId, name）
  - `MonthlyTaskAllocation`（月別工数按分結果）

### Task 集約
- `wbs_task`, `task_period`, `task_kosu`
- 責務: 個別タスクの管理、期間・工数・進捗率の保持
- 主要エンティティ:
  - `Task`（taskNo, wbsId, name, status, phaseId, assigneeId, periods, workRecords, progressRate）
  - `Period`（startDate, endDate, type, manHours）
  - `ManHour`（kosu, type）
  - `Assignee`（担当者情報）

### Phase 集約
- `wbs_phase`, `phase_template`
- 責務: プロジェクトフェーズの定義・順序管理
- 主要エンティティ: `Phase`（id, name, code, seq, period, templateId）

### TaskDependency 集約
- `task_dependencies`
- 責務: タスク間の依存関係の定義・循環検出
- 主要エンティティ: `TaskDependency`（predecessorTaskId, successorTaskId, wbsId）

### Milestone
- `milestone`
- 責務: マイルストーンの定義
- 主要エンティティ: `Milestone`（id, name, date）

### WorkRecord 集約
- `work_records`, 参照: `users`, `wbs_task`
- 責務: 実績工数の記録（Geppoインポート対応）
- 主要エンティティ: `WorkRecord`（userId, taskId, startDate, endDate, manHours）

### Calendar 集約
- `company_holidays`, `user_schedule`
- 責務: 会社カレンダー（祝日・休日）、担当者固有の稼働カレンダー、営業日計算・工数按分
- 主要エンティティ:
  - `CompanyCalendar`（standardWorkingHours, 会社休日リスト）
  - `AssigneeWorkingCalendar`（担当者固有の稼働率・個人予定を考慮）
  - `BusinessDayPeriod`（期間内の営業日計算・月別工数按分）

### AssigneeWorkload 集約
- 参照: `wbs_assignee`, `user_schedule`, `company_holidays`
- 責務: 担当者ごとの日別作業負荷・超過警告
- 主要エンティティ:
  - `AssigneeWorkload`（assigneeId, dailyAllocations, assigneeRate）
  - `DailyWorkAllocation`（特定日の稼働可能時間・タスク配分）

### EVM 集約
- 参照: `wbs_task`, `task_period`, `task_kosu`, `work_records`, `project_settings`
- 責務: EVM指標（PV, EV, AC, BAC, SPI, CPI, EAC等）の計算
- 主要エンティティ:
  - `EvmMetrics`（PV, EV, AC, BAC + 計算プロパティ群）
  - `TaskEvmData`（タスク単位のEVM計算データ）

### Notification 集約
- `notifications`, `notification_preferences`, `push_subscriptions`
- 責務: 通知の作成/配信/既読管理、ユーザー別通知設定、プッシュ通知購読管理
- 主要エンティティ:
  - `Notification`（userId, type, priority, title, message, channels, isRead）
  - `NotificationPreference`（enablePush/InApp/Email, タイプ別設定）
  - `NotificationRule`（type, priority, channels, conditions, テンプレート）

### Import 集約
- `import_jobs`, `import_job_progress`
- 責務: インポートジョブのライフサイクル管理（ステートマシン）、進捗・監査の記録
- 主要エンティティ: `ImportJob`（type, status, progress, totalRecords, processedRecords）

### Auth 集約
- `users`, `user_sessions`
- 責務: 認証・セッション管理
- 主要エンティティ:
  - `User`（id, email, name, displayName, password）
  - `UserSession`（userId, token, expiresAt）

### User 集約
- `users`, `user_schedule`
- 責務: ユーザー情報管理、人員原価
- 主要エンティティ: `User`（id, name, displayName, email, costPerHour）

### SystemSettings
- `system_settings`
- 責務: システム全体設定（シングルトン）
- 主要エンティティ: `SystemSettings`（standardWorkingHours, defaultUserCostPerHour）

### Sync 集約
- `sync_logs`
- 責務: Excel WBSインポートの変換・差分検出・同期ログ
- 主要型: `ExcelWbs`, `SyncChanges`, `SyncResult`, `SyncStatus`

### Geppo 集約
- 参照: `work_records`, `import_jobs`
- 責務: Geppo月報データの取得・インポート
- 主要型: `Geppo`, `GeppoImportOptions`, `GeppoImportResult`

### Forecast
- 参照: `wbs_task`, `task_kosu`, `work_records`, `project_settings`
- 責務: 見通し工数の計算（保守的/現実的/楽観的/予定実績優先）

## 値オブジェクト

| 値オブジェクト | ドメイン | 説明 |
|---|---|---|
| TaskNo | task | タスクID（`<工程コード>-<番号>` 形式） |
| PeriodType | task | `KIJUN`（基準）/ `YOTEI`（予定）/ `JISSEKI`（実績） |
| KosuType (ManHourType) | task | `NORMAL` / `RISK` |
| TaskStatus | task | `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` / `ON_HOLD` |
| PhaseCode | phase | フェーズコード（英数字のみ） |
| ProjectStatus | project | `INACTIVE` / `ACTIVE` / `DONE` / `CANCELLED` / `PENDING` |
| TaskAllocation | assignee-workload | タスクIDと配分工数のペア（不変） |
| EvmCalculationMode | evm | `hours` / `cost` |
| ProgressMeasurementMethod | evm | `ZERO_HUNDRED` / `FIFTY_FIFTY` / `SELF_REPORTED` |
| ForecastCalculationMethod | project-settings | `CONSERVATIVE` / `REALISTIC` / `OPTIMISTIC` / `PLANNED_OR_ACTUAL` |
| NotificationType | notification | タスク期限警告・工数警告・アサイン・遅延等 |
| NotificationPriority | notification | `LOW` / `MEDIUM` / `HIGH` / `URGENT`（数値序列 1〜4） |
| NotificationChannel | notification | `PUSH` / `IN_APP` / `EMAIL` |
| ImportJobType | import-job | `WBS` / `GEPPO` |
| ImportJobStatus | import-job | `PENDING` / `RUNNING` / `COMPLETED` / `FAILED` / `CANCELLED` |
| BufferType | wbs | `RISK` / `OTHER` |
| SyncStatus | sync | `SUCCESS` / `FAILED` / `PARTIAL` |
| CompanyHolidayType | calendar | `NATIONAL` / `COMPANY` / `SPECIAL` |

## 不変条件

### Project
- `startDate ≤ endDate`（開始日は終了日より前）
- 新規作成時のデフォルトステータスは `INACTIVE`

### Task / Period / ManHour
- `Period`: `startDate ≤ endDate`
- `ManHour`: `kosu ≥ 0`
- `Task.update()`: name、status、assigneeId、phaseId は全て必須
- `TaskNo`: `<工程コード>-<番号>` 形式（`/^.+-[0-9-A-Za-z]+$/`）

### Phase
- `PhaseCode`: 英数字のみ（`/^[a-zA-Z0-9]+$/`）
- `Phase`: `period.start < period.end`

### TaskDependency
- 自己依存禁止（`predecessorTaskId ≠ successorTaskId`）
- タスクID・wbsId は正整数
- 先行・後続タスクは同一WBS内に存在すること
- 重複依存関係の禁止
- 循環参照の禁止（DFSで検出）

### WorkRecord
- `manHours ≥ 0`
- `startDate ≤ endDate`

### User
- メールアドレスフォーマット検証
- `costPerHour ≥ 0`

### Calendar / AssigneeWorkload
- `CompanyCalendar.standardWorkingHours > 0`
- `DailyWorkAllocation.availableHours ≥ 0`
- `TaskAllocation.allocatedHours ≥ 0`
- 稼働率 0 の担当者は稼働不可
- 全日休暇キーワード一致で稼働不可

### ImportJob（ステートマシン）
- `start()`: `PENDING` → `RUNNING` のみ
- `updateProgress()`: `RUNNING` 状態のみ
- `complete()`: `RUNNING` → `COMPLETED` のみ
- `fail()`: `RUNNING` or `PENDING` → `FAILED` のみ
- `cancel()`: `COMPLETED` / `FAILED` からはキャンセル不可

### SystemSettings
- `standardWorkingHours > 0`
- `defaultUserCostPerHour ≥ 0`（null許容）

### WbsTag
- タグ名は空・空白のみ不可

### AllocationQuantizer
- 量子化単位（unit） > 0
- ハミルトン方式で合計値を保持（丸め誤差を最終要素で吸収）

### Notification
- `NotificationType` / `NotificationPriority` / `NotificationChannel`: 不明な文字列は拒否
- `markAsRead()`: 冪等性保証（既読済みは変更なし）

## ドメインサービス

| サービス | ドメイン | 責務 |
|---|---|---|
| AuthService | auth | ログイン・ログアウト・セッション検証・期限切れセッション削除 |
| WorkingHoursAllocationService | calendar | タスク工数の月別営業日按分（単月/複数月対応） |
| WorkloadCalculationService | assignee-workload | 担当者の日別作業配分計算（稼働可能時間比率で按分） |
| WorkloadWarningService | assignee-workload | 実現不可能タスクの検知（`NO_WORKING_DAYS`） |
| TaskDependencyValidator | task-dependency | 循環参照チェック・重複検出・妥当性検証 |
| TaskProgressCalculator | task | 実効進捗率計算（0/100法・50/50法・自己申告）、加重平均進捗率 |
| ForecastCalculationService | forecast | 見通し工数計算（conservative/realistic/optimistic/plannedOrActual） |
| PhaseCoefficientService | wbs | 基準フェーズに対するフェーズ係数の計算 |
| PhaseProportionService | wbs | フェーズ構成比の計算（全体比・カスタム比） |
| AllocationQuantizer | wbs | 0.25単位での工数量子化（ハミルトン方式） |
| ScheduleGenerate | wbs | 稼働可能時間を考慮したスケジュール自動生成 |
| WbsDataMapper | sync | Excel → ドメインモデル変換（ステータス・進捗率・期間のマッピング） |
| NotificationRule | notification | デフォルト通知ルールの定義、テンプレート補間（`{{field.path}}`） |

## リポジトリ境界

- Application層にIFを定義（例: `ITaskRepository`, `IWbsRepository`, `IProjectRepository`）
- InfrastructureでPrisma実装（例: `PrismaTaskRepository`）
- 主要リポジトリIF:
  - `IProjectRepository`, `ITaskRepository`, `IPhaseRepository`
  - `IWbsRepository`, `IWbsAssigneeRepository`, `IWbsTagRepository`, `IWbsCrossQueryRepository`
  - `IAuthRepository`, `IUserRepository`
  - `ICompanyHolidayRepository`, `IUserScheduleRepository`
  - `INotificationRepository`, `IImportJobRepository`
  - `IWorkRecordRepository`, `IGeppoRepository`
  - `IWbsEvmRepository`, `IDashboardQueryRepository`
  - `ISystemSettingsRepository`
  - `ISyncLogRepository`, `IExcelWbsRepository`
  - `ITaskDependencyRepository`

## 境界づけられたコンテキスト

- **計画（WBS/Task）と実績（WorkRecord）** は別境界。同期はGeppoインポートが担保
- **EVM / Forecast** は計画・実績の双方を横断する分析境界
- **通知（Notification）** は横断境界（イベント入力、配信出力）
- **カレンダー（Calendar）** は計画・負荷計算の共通基盤
- **認証（Auth）** は独立境界（セッションベース認証）
- **Sync** はExcel連携の外部境界（変換・差分検出・ログ記録）
- **SystemSettings** はシステム全体の設定を提供する共有カーネル
