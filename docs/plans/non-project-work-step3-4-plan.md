# 実装計画: 案件外作業 Step 3・Step 4

- ステータス: **計画（未着手）**（2026-11-03 作成。[§9 確認事項](#9-確認事項) の回答後に TDD で着手する）
- 前提: Step 1・2（種別・定常枠・負荷への反映）は実装済み（ブランチ `feature/non-project-work`）
- 関連: [構想・実装設計](./non-project-work-management.md)（§6 設計、§7 ロードマップ、§11 Step 1・2 の実装設計）、[08: 担当者別作業負荷](../specs/08-assignee-workload-heatmap.md)、[06: MySQLインポート](../specs/06-mysql-import.md)、[10: データの鮮度](../specs/10-data-freshness.md)

---

## 1. 全体像

構想の Step 3・4 を、独立して出せる 6 つのサブステップに分ける。各サブステップは 1 本の PR とし、テストを先に書いてから実装する（[§10](#10-進め方tdd)）。

| サブステップ | 内容 | 満たす目標（構想 §2） | 規模（目安） | 依存 |
|---|---|---|---|---|
| **3-A** 割込み作業の簡易登録 | 名前・担当者・期間・工数だけで常設 WBS に単発タスクを作る | G4 | 小（1 人日） | なし |
| **3-B** 担当者負荷の予定／実績切替 | 昨日以前は実績、今日以降は予定。未入力の強調と最終取込の表示 | G2 | 中（2〜3 人日） | なし |
| **3-C** 実績タブと枠の見直し提案 | 常設 WBS で 月 × タスク の 枠／実績／差 を見る。直近 3 か月平均から枠を提案し、翌月から適用 | G5 | 中〜大（3〜4 人日） | 3-B の実績取得を共有 |
| **4-A** Geppo 取込の案件外行の不具合修正 | 構想 §9.1（上書き・増殖）の修正 | 前提 | 小（0.5〜1 人日） | なし |
| **4-B** Geppo PROJECT_ID の別名 | WBS 名と一致しない PROJECT_ID を WBS に対応づける | G4 | 中（1.5〜2 人日） | 4-A |
| **4-C** 保守契約の工数管理 | 契約工数（h/月）・消化率・超過通知 | 保守の契約管理 | 中（2〜3 人日） | 3-C の月別実績集計 |

推奨順: **3-A → 3-B → 3-C → 4-A → 4-B → 4-C**。4-A は不具合修正なので、着手できるならいつでも先に出してよい。

---

## 2. Step 3-A: 割込み作業の簡易登録

### 2.1 仕様
- 常設 WBS の「定常枠」タブと、プロジェクト横断の担当者負荷ページ（`/assignee-gantt`）に **「割込み作業を追加」** ボタンを置く。
- 入力: 常設プロジェクト（横断ページのみ。未開始・進行中の常設から選ぶ）、タスク名、担当者（その WBS の担当者）、開始日、終了日、工数（合計 h）。補助表示として期間の稼働日数と 1 日あたりの時間（工数 ÷ 稼働日数）を出す。
- 保存すると常設 WBS の **通常タスク**（YOTEI 期間＋NORMAL 工数、未着手、工程は既定の「定常」を再利用）になり、既存の按分でそのまま負荷に載る。横断ページでは保存後に負荷を再取得する。
- 一覧・編集・削除は既存のリストタブと TaskModal で行う（新しい一覧は作らない）。

### 2.2 設計
| 層 | 変更 |
|---|---|
| application | `StandingWorkApplicationService.createAdHocTask({ wbsId, name, assigneeId, startDate, endDate, hours })`。検証: 常設のみ・担当者は WBS 内・`startDate ≤ endDate`・`hours ≥ 0`。工程解決は既存の `resolvePhaseId` を共用。`listStandingWbsOptions()`: `findTargetWbs({ kinds: ['STANDING'] })` と担当者一覧（横断ページの選択肢） |
| Server Action | `createAdHocTask`（`src/app/wbs/[id]/actions/steady-work-plan-actions.ts` に追加）、`listStandingWbsOptions`（`src/app/assignee-gantt/actions.ts`） |
| UI | `src/components/standing-work/ad-hoc-task-dialog.tsx`（react-hook-form + zod）。常設 WBS では定常枠パネルのヘッダー、横断ページでは `CrossProjectGanttChart` の `headerExtra` に配置 |

### 2.3 テスト
- application: 常設以外・他 WBS の担当者・期間逆転を弾く、生成タスクの期間・工数・工程
- action: Zod 検証、日付（YYYY-MM-DD）の UTC 変換、再検証
- component: 送信ペイロード、稼働日数と 1 日あたり時間の表示、横断ページでのプロジェクト選択

---

## 3. Step 3-B: 担当者負荷の予定／実績切替

### 3.1 仕様
- `WorkloadGanttChart` のヘッダーに **「表示: 予定 / 実績」** の切替（既定は予定）。スケジューリングのプレビューでは出さない。
- **実績モード**: 昨日（JST）以前の日は実績（`WorkRecord` の合計。全 WBS 横断。案件・常設・未紐付けの内訳）、今日以降は予定。
- セル: 実績時間を表示し、色分けは稼働率（実績 ÷ 稼働可能時間）で予定と同じ基準。**未入力**（営業日・全日休暇でない・その日に予定配分または定常枠がある・実績 0）は黄色の縁取りと「!」バッジ。
- 詳細シート: 実績モードでは「実績の内訳（プロジェクト / タスク / h）」と「予定の内訳」を並べ、タスク単位で見比べられる。
- ヘッダーに「実績の最終取込: YYYY/MM/DD HH:mm」（Geppo 取込ジョブの最新の完了時刻。履歴が無ければ「取込履歴なし」）。
- 対象: 横断ページ、WBS 内の担当者ガント（他WBS考慮 ON/OFF とも）。

### 3.2 設計
| 層 | 変更 |
|---|---|
| DTO | `WorkloadData.dailyAllocations[]` に任意項目 `actual?: { hours: number; isMissingEntry: boolean; entries: { taskId: string \| null; taskName: string \| null; projectName: string \| null; hours: number }[] }`。`AssigneeGanttResponse` に `actualsAsOf?: string \| null`。既存の利用側は変更不要 |
| repository | `IWorkRecordRepository.findDailyRecordsByUsers(userIds, start, end)` → `{ userId, date, taskId, taskName, wbsId, projectName, hours }[]`（`work_records ⟕ wbs_task ⟕ wbs ⟕ projects`）。`IImportJobRepository.findLatestCompletedAt(type)` |
| application | 純粋関数 `enrichWorkloadWithActuals(workload, records, { today, isFullDayOffTitle })`（`src/applications/assignee-gantt/workload-actuals-enricher.ts`。未入力判定もここ）。`IWorkloadActualsService.attachActuals(workloads, start, end, now)` が取得と付与をまとめる。既存の負荷計算サービスは触らない |
| Server Action | `getAssigneeWorkloads(wbsId, start, end, { includeOtherWbs, includeActuals })`、`getCrossProjectAssigneeWorkloads(start, end, { includeActuals })` |
| UI | `WorkloadFetcher` に options を追加。`WorkloadGanttChart` に表示モード・凡例・最終取込。`GanttCell` に実績表示と未入力バッジ。詳細 Sheet に実績内訳 |

未入力の判定は [10 仕様書 §3](../specs/10-data-freshness.md) と同じ考え方（営業日・予定あり・全日休暇でない・実績 0）で、10 営業日の窓ではなく表示範囲の過去日すべてに適用する。

### 3.3 テスト
- enricher: 昨日／今日の境界、休日・全日休暇は未入力にしない、定常枠だけの担当者の未入力、案件外の実績がラベル付きで載る、実績の無い日は 0
- repository 統合: 結合（タスク名・プロジェクト名）と範囲
- action: options の受け渡し、`actualsAsOf`
- component: 切替で fetcher の options が変わる、過去セルに実績・未来セルに予定、未入力バッジ、最終取込の表示

---

## 4. Step 3-C: 実績タブ（常設 WBS）と枠の見直し提案

### 4.1 仕様
- 常設 WBS に **「実績」タブ**（タブ構成: サマリー / リスト / 定常枠 / 実績 / 担当者ガント / 設定）。
- 表示範囲は既定で直近 3 か月＋当月。月の前後移動あり。
- 表: 行 = 定常タスク・単発タスク（担当者付き）＋**「未紐付け」行**（この WBS に紐づくが taskId の無い実績）、列 = 月、セル = **枠（予定）／実績／差**。合計行を付ける。分類・担当者別の小計は v1 では省く。
- 枠（予定）の月額は `SteadyWorkAllocationService` の日別配分を月で合計する（担当者ガントと同じ値）。単発タスクの予定は YOTEI 按分の月合計。
- 実績は `work_records` を taskId × 年月で集計する。
- **見直し提案**: 定常タスクごとに「直近 3 か月（当月を除く）の実績平均（h/月）」と現在の枠の月額との差を表示。**「枠に反映」** で `SteadyWorkPlanDialog` を PER_MONTH・平均値（0.5h 単位で丸め）・開始日 = 翌月 1 日で開く。保存は新設の `applySteadyWorkPlanFrom` で行い、翌月以降に重なる既存の枠を前日で終了させてから作成する（重なりの自動解消。翌月以降に始まる既存の枠があれば従来どおり重複エラー）。
- 実績タブにも「最終取込」を表示する（3-B と共通）。

### 4.2 設計
| 層 | 変更 |
|---|---|
| repository | `IWorkRecordRepository.findMonthlyHoursByWbs(wbsId, start, end)` → `{ taskId: number \| null, yearMonth: 'YYYY-MM', hours }[]`（`TO_CHAR(date, 'YYYY-MM')`。`WorkRecord.date` は UTC 深夜の暦日）。`ISteadyWorkPlanRepository.closeAndCreate(from, plan)`（既存枠のクローズと作成を 1 トランザクション） |
| domain | `src/domains/standing-work/steady-plan-suggestion.ts`: `suggestMonthlyHours(actuals: number[])`（平均・0.5h 丸め・実績月が 1 か月未満なら null） |
| application | `IStandingWorkActualsApplicationService.getMonthlyComparison(wbsId, { fromMonth, toMonth, now })` → `StandingMonthlyComparisonDto { months, rows: [{ taskId, taskNo, name, assignee, kind: 'STEADY' \| 'AD_HOC' \| 'UNLINKED', cells: [{ month, plannedHours, actualHours }], suggestion? }], totals, actualsAsOf }`。表の組み立ては純粋関数 `buildMonthlyComparison`。`StandingWorkApplicationService.applySteadyWorkPlanFrom({ taskId, unit, hours, validFrom })` |
| Server Action | `getStandingMonthlyComparison`、`applySteadyWorkPlanFrom` |
| UI | `src/components/standing-work/standing-actuals-panel.tsx`（月ナビ・表・提案バッジ・「枠に反映」）。`getWbsTabs('STANDING')` に `steady-actuals` を追加 |

### 4.3 テスト
- domain: 平均・丸め・データ不足時 null
- 純粋関数: 月の列生成、未紐付け行、合計、定常と単発の予定の出し分け
- application: 取得の組み合わせ、`applySteadyWorkPlanFrom` のクローズ規則（無期限枠は前日で終了、翌月以降に始まる枠は重複エラー）
- repository 統合: 月集計と `closeAndCreate` の原子性
- action / component: 月ナビで取得範囲が変わる、提案の表示と「枠に反映」のプリセット

---

## 5. Step 4-A: Geppo 取込の案件外行の不具合修正（前提）

- 内容: [構想 §9.1](./non-project-work-management.md#91-geppo-の案件外行の取込挙動現状の不具合)。`PROJECT_ID` が WBS に対応づかない行が、merge では同じユーザー・同じ日の別タスクの実績を上書きし、replace では再取込のたびに増殖する。
- 方針: **プロジェクト未マッピングの行は変換時にスキップ**し、`skippedCount` に計上する（ユーザーだけ紐づく `WorkRecord` は作らない。表示先が無く、実績としても扱えないため）。取込結果の警告に「未マッピングの PROJECT_ID: X（n 行）」を出し、4-B の別名登録を促す。
- 変更: `GeppoImportApplicationService.convertGeppoToWorkRecords`（`wbsId` 未解決は continue）、`GeppoImportResult.skippedCount`、`docs/specs/06-mysql-import.md` の未マッピング時の挙動。
- テスト: application（スキップ件数・警告、既存の正常系は不変）、`bulkUpsert` が `taskId` 未指定の行を受けない前提の確認。

---

## 6. Step 4-B: Geppo PROJECT_ID の別名

### 6.1 仕様
- WBS の設定タブに **「月報の PROJECT_ID 別名」**: この WBS に取り込む Geppo の `PROJECT_ID` を複数登録する（WBS 名との完全一致に加えて使う）。案件・常設どちらでも使える。
- 取込は **名前一致 → 別名** の順で解決する。インポート画面の対象 WBS の選択肢と、事前検証の「マッピング済み」判定も別名を考慮する。
- 制約: 1 つの `PROJECT_ID` は 1 つの WBS にだけ紐づく（一意）。WBS 名と同じ値は登録できない。空白のみは不可。

### 6.2 設計
| 層 | 変更 |
|---|---|
| Prisma | `geppo_project_alias { id, geppoProjectId @unique, wbsId FK(onDelete: Cascade), createdAt }` |
| domain | `GeppoProjectAlias`（trim・空白不可） |
| application | `IGeppoProjectAliasRepository`（`findAll` / `findByWbsId` / `create` / `delete`）。`ProjectMappingService` の `createProjectMap` / `filterGeppoByTargetProjects` / `getAvailableProjectsForImport` / `validateProjectMapping` を別名対応。`GeppoProjectAliasApplicationService`（登録・削除・重複検証） |
| Server Action / UI | `src/app/wbs/[id]/geppo-alias-actions.ts`、`src/components/wbs/geppo-project-alias-settings.tsx`（`WbsImportScheduleSettings` の隣） |

### 6.3 テスト
- mapping service: 名前優先、別名で解決、別名のある WBS が取込対象に出る、検証で別名をマッピング済みと数える
- application: 一意制約・WBS 名と同値の拒否
- repository 統合、action、component

---

## 7. Step 4-C: 保守契約の工数管理

### 7.1 仕様
- 常設プロジェクトに **契約工数**（h/月）と契約期間（開始、終了は任意。複数期間可・重複不可）を持てる。設定タブ（常設のみ）で管理する。分類が保守以外でも設定できる（社内業務の予算管理にも使える）。
- 実績タブのヘッダーに当月の **消化率**（実績 ÷ 契約工数）とプログレスバー、直近 6 か月の 契約／枠／実績 の推移を表示する。
- **通知**: 月の実績が契約工数の 80% で警告、100%（プロジェクト設定 `costOverrunThresholdPct` を上限として使う）で超過。宛先はその WBS の担当者全員。既存と同じく業務日（JST）ごとに 1 回。`NotificationType` に `CONTRACT_BUDGET_WARNING` / `CONTRACT_BUDGET_EXCEEDED` を追加する（Prisma enum のマイグレーションと表示名・アイコン）。
- ポートフォリオには載せない（将来の検討）。

### 7.2 設計
| 層 | 変更 |
|---|---|
| Prisma | `standing_contract { id, projectId FK(onDelete: Cascade), monthlyBudgetHours Decimal, validFrom Date, validTo Date?, memo String? }` |
| domain | `StandingContract`（`hours ≥ 0`・期間・重複なし。`SteadyWorkPlan` と同じ規約）。`calculateBudgetConsumption({ budgetHours, actualHours, thresholdPct })` → `{ percentage, level: null \| 'WARNING' \| 'EXCEEDED' }`（`detectManhourOverrun` と同じ比率の規約） |
| application | `IStandingContractRepository`、`StandingContractApplicationService`（CRUD と月次集計。3-C の `findMonthlyHoursByWbs` を再利用）。`NotificationEventDetector.detectContractBudget(now)`（対象は `findTargetWbs({ kinds: ['STANDING'] })`。cron から呼ぶ） |
| Server Action / UI | `standing-contract-actions.ts`、設定タブ `standing-contract-settings.tsx`、実績タブの契約カード |

### 7.3 テスト
- domain: 消化率・しきい値（80% / 100%）・契約なし・実績なし
- application: 月集計、通知の作成と重複抑止、契約期間の重複拒否
- repository 統合、action、component

---

## 8. 横断的な事項

- **日付の扱い**: `WorkRecord.date` は UTC 深夜の暦日。月の集計は `TO_CHAR(date, 'YYYY-MM')`、日のキーは `utcDateKey`。「今日」は JST（`calendarDateInTimeZone`）。CLAUDE.md の日付ポリシーに従い、API の入出力は ISO 8601。
- **性能**: 実績の付与は表示範囲の `work_records` を 1 クエリで取る（ユーザー IN・日付 BETWEEN）。横断ページの月表示でも数千行程度。
- **既存機能への影響**: DTO は任意項目の追加のみ。既存 Server Action は options 省略時の挙動を変えない。既存テストの変更は、任意項目の追加と DI の引数追加に限る。
- **ドキュメント**: 3-B 完了時に [08 仕様書](../specs/08-assignee-workload-heatmap.md) に実績モードを追記。4-B 完了時に [06 仕様書](../specs/06-mysql-import.md) に別名を追記。3-C 完了時に常設プロジェクト・定常枠・実績・契約をまとめた `docs/specs/15-standing-work.md` を起こし、構想の §6 と §11 の内容を仕様書へ移す。

---

## 9. 確認事項

| # | 質問 | 影響 |
|---|---|---|
| Q1 | 実績モードの境界は「昨日以前が実績、今日以降は予定」でよいか（当日は取込前のため） | 3-B |
| Q2 | 未入力の強調は、定常枠だけの担当者（予定タスクなし）にも適用してよいか | 3-B |
| Q3 | 実績タブの既定範囲（直近 3 か月＋当月）と、見直し提案の丸め（0.5h 単位）・適用方法（翌月 1 日から。既存の無期限枠は前月末で終了）でよいか | 3-C |
| Q4 | 割込み作業の工数入力は「合計 h」でよいか（「h/日 × 日数」の方が自然なら変える）。登録場所は常設 WBS と横断負荷ページの 2 か所でよいか | 3-A |
| Q5 | 契約工数はプロジェクト単位・月額でよいか。契約が月の途中で始まる場合の按分は不要か。通知の宛先は WBS の担当者全員でよいか | 4-C |
| Q6 | Geppo の別名は WBS 設定タブで管理する形でよいか。`WBS_NO` が一致しない実績は「未紐付け」行のままでよいか（受け皿タスクの設定は作らない） | 4-B |
| Q7 | 4-A（取込の不具合修正）を Step 3 より先に出してよいか | 順序 |

---

## 10. 進め方（TDD）

各サブステップで次を繰り返す。

1. 設計の確定（本書の該当節。差分があれば本書を更新）
2. テストを先に書く（domain → application → repository 統合 → action → component）。失敗を確認してコミット
3. 実装してテストを通す。テストは変えない（テスト自体の誤りを除く）
4. `npm run lint`、`tsc`（develop 比で新規エラーなし）、`npm run test`、統合テスト（ローカル DB）、`next build`
5. 仕様書・画面一覧・ドメインモデルを更新
6. サブステップごとに PR（`feature/non-project-work-3a` のように分ける）
