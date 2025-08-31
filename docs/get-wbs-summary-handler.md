## GetWbsSummaryHandler ドキュメント

### 目的
WBSに紐づくタスク群から、以下の3種類の集計結果を生成して返却します。
- 工程別集計
- 担当者別集計
- 月別×担当者別集計（会社休日・個人スケジュール・稼働率を考慮した営業日案分）

### 入力（クエリ）
`GetWbsSummaryQuery`（`src/applications/wbs/query/get-wbs-summary-query.ts`）

```ts
export class GetWbsSummaryQuery extends Query {
  constructor(
    public readonly projectId: string,
    public readonly wbsId: number
  ) { super(); }
}
```

### 出力（結果）
`WbsSummaryResult`（`src/applications/wbs/query/wbs-summary-result.ts`）

主要フィールド:
- `phaseSummaries: PhaseSummary[]` / `phaseTotal`
- `assigneeSummaries: AssigneeSummary[]` / `assigneeTotal`
- `monthlyAssigneeSummary: MonthlyAssigneeSummary`（月リスト、担当者リスト、月合計、担当者合計、全体合計、および詳細）

`TaskAllocationDetail` を通じて、タスクの案分結果（各月の稼働日数・利用可能時間・配賦工数・比率）も参照可能です。

### 依存関係
- `IWbsQueryRepository`：WBSタスク・工程の取得
- `ICompanyHolidayRepository`：会社休日の取得
- `IUserScheduleRepository`：ユーザー個別スケジュールの取得
- `IWbsAssigneeRepository`：WBS配属情報（稼働率など）の取得
- ドメインサービス
  - `CompanyCalendar`：会社休日に基づく営業日判定
  - `BusinessDayPeriod`：期間内の営業日数/利用可能時間の月別集計と案分補助
  - `WorkingHoursAllocationService`：稼働率・個別スケジュールを加味した工数の月別案分

### 処理フロー（execute）
1. `getWbsTasks(projectId, wbsId)` でタスクを取得
2. `getPhases(wbsId)` で工程を取得
3. 工程別集計を計算（件数・予定工数・実績工数・差分）
4. 担当者別集計を計算（件数・予定工数・実績工数・差分）
5. 月別×担当者別集計を計算（下記詳細）
6. 上記を `WbsSummaryResult` にまとめて返却

### 工程別集計（calculatePhaseSummary）
- 全工程を初期化し、各タスクをその工程名で集約
- `plannedHours` は `yoteiKosu`、`actualHours` は `jissekiKosu`
- `difference = actualHours - plannedHours`

### 担当者別集計（calculateAssigneeSummary）
- 担当者表示名で集約
- カウント・予定/実績工数・差分を加算

### 月別×担当者別集計（calculateMonthlyAssigneeSummary）
前提準備:
- 会社休日を取得し `CompanyCalendar` を構築
- `WorkingHoursAllocationService` を生成
- `IWbsAssigneeRepository.findByWbsId(wbsId)` でWBS配属情報を取得（`userId`と稼働率を保持）

タスクごとの処理:
- 担当者名と開始日がないタスクはスキップ
- 対象担当者の `WbsAssignee` が見つからない場合：
  - 従来ロジック（開始月に全予定工数を計上、実績はタスクの実績工数）
- 同月内タスク（`yoteiEnd` が未設定または開始・終了が同一月）：
  - 従来ロジック（開始月に集計）
  - `TaskAllocationDetail` を単月として追加（稼働日:1、利用可能時間:7.5 で固定）
- 月跨ぎタスク：
  - `IUserScheduleRepository.findByUserIdAndDateRange(userId, start, end)` で個人スケジュール取得
  - `BusinessDayPeriod` を生成し、月別の営業日数・利用可能時間を取得
  - `WorkingHoursAllocationService.allocateTaskHoursByAssigneeWorkingDays` で予定工数を各月に案分
  - 実績工数は開始月へ計上（将来、実績の案分に対応予定）
  - `TaskAllocationDetail.monthlyAllocations` に各月の稼働日数・利用可能時間・案分工数・比率を保存

集計の最終整形:
- `months` と `assignees` をソートして返却
- `monthlyTotals`（各月の合計）と `assigneeTotals`（各担当者の合計）、および `grandTotal` を計算

### 合計計算（calculateTotal）
- 任意のサマリー配列に対し `taskCount/ plannedHours/ actualHours` を合算し、`difference` を算出

### 主な注意点・仕様
- `WbsTaskData` の日付は `Date | null` 型。null の場合は単月扱いまたはスキップの分岐が存在
- 月跨ぎ時の案分は、利用可能時間（会社休日・個人スケジュール・稼働率考慮）の比率で配賦
- 実績工数は現状、開始月にのみ計上（将来拡張で案分可能）
- `TaskAllocationDetail` により、タスク単位の案分内訳をトレース可能

### 関連ファイル
- `src/applications/wbs/query/get-wbs-summary-handler.ts`
- `src/applications/wbs/query/get-wbs-summary-query.ts`
- `src/applications/wbs/query/wbs-summary-result.ts`
- `src/applications/wbs/query/wbs-query-repository.ts`
- `src/applications/wbs/iwbs-assignee-repository.ts`
- `src/applications/calendar/icompany-holiday-repository.ts`
- `src/applications/calendar/iuser-schedule-repository.ts`
- `src/domains/calendar/company-calendar.ts`
- `src/domains/calendar/business-day-period.ts`
- `src/domains/calendar/working-hours-allocation.service.ts`

### 既知のリント警告
`Date | null` を `new Date(...)` に渡す部分は、事前に null ガードするか、非null 代入（開始日をフォールバック）などの対処が必要です。該当箇所の修正は別対応とします。


