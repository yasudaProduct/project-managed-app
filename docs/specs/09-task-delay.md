# 遅延タスク判定 仕様書

## 1. 概要

タスクの「遅れ」と「期限間近」を判定し、WBS のサマリータブに一覧表示する。判定はドメイン（`src/domains/task/task-delay.ts`）に一本化し、画面の一覧と通知の検知で同じ判定を使う。

関連: [要件整理 1-1・1-2](../plans/progress-management-analysis-requirements.md)

## 2. 判定ルール

対象は論理削除されていないタスク。予定（YOTEI）期間の開始日・終了日で判定する。

| 種類 | 条件 | 日数 |
|---|---|---|
| 終了遅れ（`END_OVERDUE`） | 予定終了日 < 今日、かつ未完了 | 今日 − 予定終了日 |
| 開始遅れ（`START_OVERDUE`） | 状態が未着手、かつ予定開始日 < 今日 | 今日 − 予定開始日 |
| 期限間近（`DUE_SOON`） | 今日 ≦ 予定終了日 ≦ 今日 + 期限間近日数 | 予定終了日 − 今日（本日=0） |

- 完了（`COMPLETED`）・保留（`ON_HOLD`）は対象外。保留は意図的に止めているため遅れとして扱わない
- 複数に当てはまる場合は「終了遅れ → 開始遅れ → 期限間近」の順で1つに決める
- 予定開始日の当日はまだ着手できるため、開始遅れは翌日から
- 期限間近日数はプロジェクト設定の `deadlineAlertDays`（既定 1）
- 予定日が未設定の条件は判定しない

## 3. 「今日」の決め方

サーバーは UTC で動くため、「今日」は業務タイムゾーン（`Asia/Tokyo`）の暦日とする（`calendarDateInTimeZone`、`src/utils/date-util.ts`）。予定日（`@db.Date`、UTC 深夜0時）とは暦日で比較し、時刻成分は無視する。

> 以前はサマリータブのコンポーネント内でブラウザのローカル日付を使って判定していた。サーバー側に移したことで、通知と同じ判定になり、閲覧者の端末のタイムゾーンにも左右されない。

## 4. 並び順

重い順に並べる。

1. 種類：終了遅れ → 開始遅れ → 期限間近
2. 同じ種類の中：遅れは日数の多い順、期限間近は残日数の少ない順

## 5. 画面

WBS のサマリータブ「遅れ・期限間近のタスク」（`src/components/wbs/task-delay-list.tsx`）。

- 表示: タスク番号・名前・種類と日数（「終了遅れ 3日」「開始遅れ 2日」「本日期限」「残り2日」）・フェーズ・担当者・予定期間・進捗率
- 担当者で絞り込める（作業者が自分の分を確認する用途）。担当者未設定は「未割当」
- 前回の確認日（進捗確認サイクルから決まる。[02-evm 付録「前回からの変化」](./02-evm.md)）以降に遅れ始めたタスクに「新規」を付け、その件数を示す
  - 判定: 遅れ（終了遅れ・開始遅れ）で、遅延日数 ≦ 前回の確認日からの経過日数（`isNewlyDelayedSince`）
  - 予定日の変更は追わず、現在の予定日で判定する
- データ取得: `listTaskDelays`（`src/app/wbs/[id]/actions/task-delay-actions.ts`）→ `TaskDelayApplicationService`

## 6. 通知

cron（`/api/cron/notifications`、6時間ごと）から `NotificationEventDetector` が呼ばれ、同じ判定でタスク担当者へ通知する（`src/applications/notification/notification-event-detector.ts`）。

| 検知 | 通知種別 | 条件 | 優先度 |
|---|---|---|---|
| `detectTaskDeadlines` | `TASK_DEADLINE_OVERDUE` | 終了遅れ | URGENT |
| `detectTaskDeadlines` | `TASK_DEADLINE_WARNING` | 期限間近 | HIGH |
| `detectScheduleDelays` | `SCHEDULE_DELAY` | 開始遅れ | HIGH |
| `detectManhourExceeded` | `TASK_MANHOUR_EXCEEDED` | 未完了で 実績工数 / 予定工数 ≧ `costOverrunThresholdPct` | 120%以上は URGENT、それ以外は HIGH |
| `detectManhourExceeded` | `TASK_MANHOUR_WARNING` | 未完了で 実績工数 / 予定工数 ≧ `costOverrunThresholdPct` × 0.8 | 同上 |

- 対象: 未開始・進行中プロジェクトの最新 WBS（担当者負荷の横断集計と同じ `ITargetWbsQueryRepository`）
- しきい値: 各プロジェクトの設定（未作成なら既定値）
- 宛先: タスク担当者のユーザーID（`Users.id`）。担当者のいないタスクは通知しない
- 重複防止: 同じ宛先・種類・タスクの通知が業務日（JST）の当日中にあれば作成しない（cron が1日4回動くため）
- 1件の作成に失敗しても残りは続行する
- 通知のリンク先はプロジェクト画面（サマリータブに遅れ・期限間近のタスク一覧がある）。タスク詳細画面は存在しない
- 工数超過の判定は `src/domains/task/task-manhour-overrun.ts`

> 以前の実装は仮実装で、工数（実績 50h / 予定 40h）と遅延日数（5日）が固定値だった。また宛先に WBS 担当者の行ID（ユーザーIDではない）を使い、プロジェクト単位の遅延通知は存在しないユーザー `system-admin` 宛てになっていた。プロジェクトマネージャーの概念がまだないため、プロジェクト単位の遅延まとめ通知は廃止し、タスク単位の開始遅れ通知に置き換えた。
