# 担当者別作業負荷ヒートマップ仕様書

## 1. 概要

本仕様書は、担当者ごとの**日別作業負荷**（担当者×日付のマトリクスで配分工数・稼働可能時間・過負荷状態を可視化する機能。タスクバー式のガントチャートではない）を定義する。行=担当者、列=日付、セル=その日の配分工数で、稼働率に応じて色分け表示する。

> **関連仕様書との位置づけ**
> - [01: 営業日按分ロジック](./01-working-hours-allocation.md): 担当者の「いつ・何時間稼働できるか」（`AssigneeWorkingCalendar` / `CompanyCalendar`）を計算する。本機能はこれを稼働可能時間の基盤として利用する。
> - 本仕様書（08）: その稼働可能時間を分母に、**タスクの工数を日別に比例按分し、担当者単位の負荷として可視化する**。単一WBSだけでなく、複数WBS（プロジェクト）を横断した合算表示にも対応する。
> - [07: タスクスケジューリング](./07-task-scheduling.md): 前詰め計算の結果プレビューとして本機能の計算ロジック・UIコンポーネントを再利用する（`previewWorkloads` props）。他WBS考慮のスケジューリングへの反映（担当者の空き容量からの先行消費）は07仕様書側の管轄。

利用画面:
- `/wbs/[id]/assignee-gantt`（単体ページ）、WBS管理画面「担当者ガント」タブ（`wbs-management-content.tsx`）— WBS単位。「他WBSの負荷を考慮」トグルあり
- `/assignee-gantt`（新規・プロジェクト横断ページ）— 対象WBS全体を横断してユーザー単位に合算表示
- タスクスケジューリングのプレビュー（[07仕様書 §9.2](./07-task-scheduling.md#92-担当者別負荷)）— 計算結果を `previewWorkloads` として同じUIコンポーネントで表示

---

## 2. 用語定義

### 配分工数 (Allocated Hours)
その日にその担当者へ按分されたタスク工数の合計。`DailyWorkAllocation.allocatedHours`（タスク配分の合計、ゲッター）。

### 稼働可能時間 (Available Hours)
その日に担当者が使える時間の上限。[01仕様書](./01-working-hours-allocation.md)の `AssigneeWorkingCalendar.getAvailableHours` に従う（会社休日・個人予定・参画率を考慮）。

### 対象WBS (Target WBS)
横断計算（プロジェクト横断ページ・トグルON・他WBS考慮スケジューリング）の対象となるWBS。**未開始(`INACTIVE`)・進行中(`ACTIVE`)** プロジェクトの**最新WBS**（`createdAt desc, id desc` の先頭）を、プロジェクトごとに1件とする。画面操作上は1プロジェクト1WBSだが、テーブル構造上は複数作成できるため最新の1件のみを対象とする。保留(`PENDING`)・完了(`DONE`)・中止(`CANCELLED`)のプロジェクトは対象外。

### 合算 (Merge)
複数WBS（プロジェクト）分の日別配分を、担当者（ユーザー）単位で1つに集約すること。`WorkloadMergeService.mergeDailyAllocations` が担う。

### 取り分 (Rate Cap Hours)
担当者がそのWBS（プロジェクト）に割ける時間の上限。`標準勤務時間 × 参画率`。合算ビューにおける「Rバッジ（レート超過）」判定の基準として使う（[§7.4](#74-レート超過rバッジのハイブリッド判定)）。

---

## 3. 全体フロー（アーキテクチャ）

```
[UI] WorkloadGanttChart (client, src/components/assignee-gantt/)
  └─ fetcher(startYmd, endYmd) → AssigneeGanttResponse
       │
       ├─ [WBS単位・他WBS考慮OFF]
       │    assignee-gantt-actions.ts → IAssigneeGanttService.getAssigneeWorkloads/getAssigneeWarnings
       │      → WorkloadCalculationService.calculateDailyAllocations（単一WBSの日別按分）
       │
       ├─ [WBS単位・他WBS考慮ON]
       │    assignee-gantt-actions.ts → ICrossWbsWorkloadService.getWbsWorkloadsWithExternal
       │      → 現WBS分(按分) + 対象WBS(現プロジェクト除外)の外部分(按分) → WorkloadMergeService でユーザー単位に合算
       │
       └─ [プロジェクト横断ページ]
            app/assignee-gantt/actions.ts → ICrossWbsWorkloadService.getCrossProjectUserWorkloads
              → 全対象WBS分(按分) → WorkloadMergeService でユーザー単位に合算
  ↓ toWorkloadData でプレーンDTO化（ISO日付・派生指標を付与）
[UI] WorkloadGanttChart が週/月ナビ・セル色分け・詳細Sheetを描画
```

| 層 | 主なファイル |
| --- | --- |
| ドメイン（按分） | `src/domains/assignee-workload/workload-calculation-service.ts` |
| ドメイン（合算） | `src/domains/assignee-workload/workload-merge-service.ts` |
| ドメイン（カレンダー） | `src/domains/calendar/assignee-working-calendar.ts`, `company-calendar.ts` |
| ドメイン（警告） | `src/domains/assignee-workload/workload-warning-service.ts` |
| アプリケーション（単一WBS） | `src/applications/assignee-gantt/assignee-gantt-service.ts` |
| アプリケーション（横断） | `src/applications/cross-wbs-workload/cross-wbs-workload-service.ts` |
| アプリケーション（DTO変換） | `src/applications/assignee-gantt/workload-data-mapper.ts` |
| Server Action（WBS単位） | `src/app/wbs/[id]/assignee-gantt/assignee-gantt-actions.ts` |
| Server Action（横断） | `src/app/assignee-gantt/actions.ts` |
| UI（汎用チャート） | `src/components/assignee-gantt/workload-gantt-chart.tsx` ほか同ディレクトリ |
| UI（WBS単位コンテナ） | `src/app/wbs/[id]/assignee-gantt/assignee-gantt-chart.tsx` |
| UI（横断コンテナ） | `src/app/assignee-gantt/_components/cross-project-gantt-chart.tsx` |

---

## 4. 対象WBSの決定

`ITargetWbsQueryRepository.findTargetWbs()`（実装: `src/infrastructures/cross-wbs-workload/target-wbs-query-repository.ts`）が、`status IN ('INACTIVE', 'ACTIVE')` のプロジェクトについて、`wbs` を `[{createdAt: 'desc'}, {id: 'desc'}]` で1件取得する単一クエリ（`take: 1`のネストselect）で解決する。WBSを持たないプロジェクトは結果に含めない。

`ICrossWbsWorkloadService.resolveTargetWbs(excludeProjectId?)` がこれをラップし、`excludeProjectId` 指定時は当該プロジェクトを除外する（WBS内トグルが「現プロジェクトの二重計上」を避けるために使う）。

---

## 5. 単一WBSでの日別配分計算（既存ロジック・共通基盤）

`WorkloadCalculationService.calculateDailyAllocations(tasks, assignee, userSchedules, companyCalendar, startDate, endDate)`（`src/domains/assignee-workload/workload-calculation-service.ts`）が中核。全ての表示モード（単一WBS・合算）はこの関数を(WBS×担当者)単位で呼び出した結果を土台にする。

対象タスクは各タスクの **YOTEI（予定）期間** と、その期間内の **NORMALタイプの工数**（`RISK`工数は対象外。`Task.getYoteiKosus()`）。

### 5.1 日別ループ
期間内の各日について:
1. `availableHours = workingCalendar.getAvailableHours(date)`（[01仕様書](./01-working-hours-allocation.md)）
2. その日にアクティブなタスク（YOTEI期間がその日を含む、ローカルYYYY-MM-DD比較）を抽出
3. 各タスクの工数を日割り按分（[§5.2](#52-タスク工数の日割り按分)）
4. `DailyWorkAllocation`（`availableHours`, `taskAllocations`, `isWeekend`, `isCompanyHoliday`, `userSchedules`）を生成

### 5.2 タスク工数の日割り按分

```
totalHours = タスクのYOTEI期間のNORMAL工数（総工数）
totalAvailableInPeriod = そのタスクの期間全体(開始〜終了)を1日ずつ回して
                         workingCalendar.getAvailableHours() を合計した値
totalAvailableInPeriod <= 0 ならスキップ（全日非稼働の期間）

availableToday = 今日の getAvailableHours()
ratio = availableToday / totalAvailableInPeriod
allocatedHours = totalHours × ratio
```

稼働可能時間が少ない日（個人予定・低参画率等）は自動的に配分も少なくなり、その分は期間内の他の稼働日に多く配分される。1日のセルの値（`DailyWorkAllocation.allocatedHours`）は、その日にアクティブな全タスクの配分工数を合計したもの。

### 5.3 スケジューリング結果からの按分（別入力）
`calculateDailyAllocationsFromSchedule(items: ScheduleAllocationInput[], ...)` は、YOTEI期間ではなく前詰め計算結果（開始/終了/工数）を入力とする並行パス。式は§5.2と同じ（比例按分）で、タスクスケジューリングのプレビュー用（[07仕様書](./07-task-scheduling.md)）。

---

## 6. 派生指標（UI表示用フラグ）

`toWorkloadData(workload, options?)`（`src/applications/assignee-gantt/workload-data-mapper.ts`）がドメインの `AssigneeWorkload` をプレーンDTOへ変換する際に計算する。

| 指標 | 既定（`rateBasis` 未指定） |
| --- | --- |
| 過負荷 (`isOverloaded`) | `配分工数 > 稼働可能時間` |
| 稼働率 (`utilizationRate`) | `配分工数 ÷ 稼働可能時間` |
| 標準超過 (`isOverloadedByStandard`) | `配分工数 > 7.5h`（固定値。会社設定の標準勤務時間とは独立したハードコード） |
| レート超過 (`isOverRateCapacity`) | `配分工数 > 稼働可能時間 × assigneeRate` |

セルの色分け（`GanttCell.getCellColor`, `src/components/assignee-gantt/gantt-cell.tsx`）: 休日/週末=グレー、配分0=白、過負荷=赤、稼働率80%以上=オレンジ、60%以上=黄、それ未満=緑。レート超過は青い「R」バッジで別途表示。実現不可能タスク警告（[§8](#8-警告実現不可能タスク)）は⚠マークで表示。

> **既知の挙動（単一WBSモード）**: `availableHours` は既に `AssigneeWorkingCalendar.getAvailableHours` で参画率キャップ（`min(標準−個人予定, 標準×rate)`）が適用済みの値である。上記の `isOverRateCapacity` はその `availableHours` に対して**さらに** `× assigneeRate` を掛けるため、参画率が1未満の担当者では参画率が実質的に二重適用された、より厳しい閾値になる（例: 標準7.5h・参画率0.5・個人予定なしの日は `availableHours=3.75`、`isOverRateCapacity` の閾値は `3.75×0.5=1.875`）。これは本機能の既存仕様であり、本ドキュメント作成時点で変更の予定はない。

---

## 7. 複数WBSの合算（他WBS考慮）

### 7.1 2つの合算経路と行の範囲

| 経路 | サービスメソッド | 行の範囲 | 対象WBS |
| --- | --- | --- | --- |
| WBS内トグルON | `ICrossWbsWorkloadService.getWbsWorkloadsWithExternal(wbsId, start, end)` | **現WBSの担当者のみ** | 対象WBS全体から**現プロジェクトの全WBSを除外**（2重計上防止） |
| プロジェクト横断ページ | `ICrossWbsWorkloadService.getCrossProjectUserWorkloads(start, end)` | 対象WBSに登場する**全ユーザー** | 対象WBS全体（除外なし） |

いずれも実装（`src/applications/cross-wbs-workload/cross-wbs-workload-service.ts`）は共通の私設メソッド `loadExternalContext` / `buildAllocationSets` を経由する。(対象WBS × その担当者行)ごとに [§5](#5-単一wbsでの日別配分計算既存ロジック・共通基盤) の按分を**そのWBS自身の参画率カレンダー**で実行し、結果を `LabeledAllocationSet`（`wbsId`, `projectId`, `projectName`, `dailyAllocations`）としてユーザーID単位（`WbsTask.assigneeId → WbsAssignee.id → WbsAssignee.userId` の橋渡しに注意。タスクの担当者照合は **join行のPK**（`WbsAssignee.id`）で行い、`userId` 文字列ではない）にまとめる。

### 7.2 マージ規則（WorkloadMergeService）

`WorkloadMergeService.mergeDailyAllocations({ sets, mergedCalendar, companyCalendar, userSchedules, startDate, endDate })`（`src/domains/assignee-workload/workload-merge-service.ts`）が、複数の `LabeledAllocationSet` を1人分の `DailyWorkAllocation[]` へ集約する。

```
1. セットごとに ymd → TaskAllocation[] を事前構築（日ループ内の走査を避ける）
2. 各セットのタスク配分は、そのセットの projectName をラベルとして載せ替えてコピーする
   （タスクID自体はグローバル一意=autoincrement PKのため衝突なし）
3. 期間内の各日について:
   availableHours = mergedCalendar.getAvailableHours(date)   ← §7.3
   taskAllocations = 全セットのその日のタスク配分を連結
   → DailyWorkAllocation を生成（配分工数はタスク配分の合計、ゲッターで自動算出）
```

セットが存在しない日・タスクが存在しない担当者でも、カレンダー由来の `availableHours` を持つ行は生成される（0配分として表示される）。

### 7.3 合算時の稼働可能時間（分母）

合算行の `availableHours` は、各WBSの参画率を無視した **rate=1 のカレンダー** で算出する。

```
mergedCalendar = new AssigneeWorkingCalendar(
  WbsAssignee.create({ userId, rate: 1 }),
  companyCalendar,
  userSchedules
)
availableHours = 標準勤務時間 − 個人予定    （参画率キャップなし。rate=1のためキャップが効かない）
```

DTOの `assigneeRate` も合算行では常に `1` を返す。

**理由**: セルの値（分子）は「複数WBS分の合計負荷」であるため、特定の1WBSの参画率で頭打ちした値を分母にすると単位が合わない（例: 参画率0.5・当PJ3h+他PJ3h=計6hの日を、当PJの取り分3.75hで割ると160%の誤過負荷になる）。「この担当者は物理的に何時間使えるか」という一貫した基準（標準−個人予定）で過負荷・稼働率を判定する。

### 7.4 レート超過（Rバッジ）のハイブリッド判定

[§7.3](#73-合算時の稼働可能時間分母)により合算行では通常の参画率キャップが失われるため、「このプロジェクトが自分の取り分を超えて使っていないか」という情報が見えなくなる問題がある。これを補うため、**Rバッジのみ**別基準で判定する（過負荷・稼働率は§7.3のまま）。

`toWorkloadData(workload, { rateBasis: { rate, standardWorkingHours } })` を呼ぶと、レート超過判定が次のように切り替わる。

```
rateAllowedHours = standardWorkingHours × rateBasis.rate    （現WBSでの取り分）
rateJudgedHours  = その日のタスク配分のうち projectName が無い（＝現WBS分）ものの合計
isOverRateCapacity = rateJudgedHours > rateAllowedHours
```

- `getWbsWorkloadsWithExternal` の各行は `{ workload, rateBasis: { rate: 現WBSでの参画率, standardWorkingHours } }`（型 `MergedAssigneeWorkload`）を返し、`assignee-gantt-actions.ts` がこの `rateBasis` を `toWorkloadData` に渡す。
- 現WBS分のタスク配分には `projectName` を付与しない（ラベルなし）。外部（他プロジェクト対象WBS）分の配分には必ず `projectName` を付与する。この「ラベルの有無で現WBS分/外部分を判別する」規約に依存した実装のため、ラベル付与ロジックを変更する場合は本判定への影響に注意すること。
- `getCrossProjectUserWorkloads`（プロジェクト横断ページ）は「現WBS」という基準を持たないため `rateBasis` を使わない。Rバッジは実質発火しない（過負荷判定と同義になる）。

#### 例
標準7.5h・現WBS参画率0.5（取り分3.75h）の担当者が、当日「現WBS 4h + 他PJ 2h = 計6h」の場合:

| 指標 | 値 |
| --- | --- |
| 過負荷判定 | 6h ≤ 7.5h → 適正（赤くならない） |
| 稼働率 | 6/7.5 = 80% |
| Rバッジ判定 | 現WBS分4h > 取り分3.75h → **R点灯** |

物理的には過負荷ではないが、このプロジェクトが自分の取り分を超えて使っていることが分かる。

---

## 8. 警告（実現不可能タスク）

`WorkloadWarningService.validateTaskFeasibility`（`src/domains/assignee-workload/workload-warning-service.ts`）が、タスクのYOTEI期間全体で稼働可能時間の合計が0（担当者ありなら個人予定・参画率も考慮、担当者なしなら会社休日のみで判定）の場合に `NO_WORKING_DAYS` 警告を出す。

**警告は常に現WBSのみを対象とする**（他WBS考慮トグルのON/OFFに関わらず、`IAssigneeGanttService.getAssigneeWarnings(wbsId, ...)` を呼ぶ）。プロジェクト横断ページには警告表自体が無い（`warnings: []` を返す）。

---

## 9. スケジューリングとの関係

タスクスケジューリング（[07仕様書](./07-task-scheduling.md)）の「他WBSの負荷を考慮」オプション（`considerOtherWbsLoad`, 既定true）は、本機能の `ICrossWbsWorkloadService.getExternalAllocationSets` を呼び、他WBSの日別配分を前詰め計算のカレンダー（`ExternalLoadAwareCalendar`）へ注入する。参画率は「取り分の予約」として扱われ、外部負荷は取り分外の時間から優先的に消費される（詳細は[07仕様書 §7.4](./07-task-scheduling.md#74-開始日の丸めと工数消化)）。

スケジューリング結果の担当者別負荷プレビュー（[07仕様書 §9.2](./07-task-scheduling.md#92-担当者別負荷)）も、他WBS考慮ONの場合は本機能の[§7](#7-複数wbsの合算他wbs考慮)と同じ合算・ハイブリッドRバッジのロジックを適用する。

---

## 10. 既知の制約と今後の課題

- **単一WBSモードのレート超過二重適用**: [§6の注記](#6-派生指標ui表示用フラグ)参照。既存仕様として維持している。
- **同一WBS内の重複担当者行**: 同一ユーザーが同一WBSに複数の `WbsAssignee` 行を持つ場合、合算時の外部負荷は各行に同じ値が乗る（稀なデータ形状として許容）。
- **期間外の個人予定近似**: タスク単位の按分（§5.2）は期間全体を走査するが、個人予定の取得範囲は呼び出し元が指定した表示範囲に限られる。表示範囲外にタスク期間がまたがる場合、範囲外分の個人予定は考慮されない近似が生じる（既存仕様。[07仕様書 §10](./07-task-scheduling.md#10-既知の制約と今後の課題)と同じ制約）。
- **標準超過閾値のハードコード**: `7.5h` は会社設定の標準勤務時間から独立した固定値（[§6](#6-派生指標ui表示用フラグ)）。
- **横断計算のパフォーマンス**: 按分計算量は概ね `O(日数 × タスク数 × タスク期間日数)`。月表示・週表示では問題ないが、対象WBS・タスクが非常に多い環境では `WorkloadCalculationService.calculateTaskAllocationsForDate` 内の `totalAvailableInPeriod` 再計算がボトルネックになり得る（タスク単位のメモ化は未実装）。

---

## 11. 主要ファイル一覧

### ドメイン
- `src/domains/assignee-workload/workload-calculation-service.ts` — 日別按分（単一WBS共通ロジック）
- `src/domains/assignee-workload/workload-merge-service.ts` — 複数WBSの合算
- `src/domains/assignee-workload/workload-warning-service.ts` — 実現不可能タスク警告
- `src/domains/assignee-workload/assignee-workload.ts` / `daily-work-allocation.ts` / `task-allocation.ts`（`projectName` ラベル対応）
- `src/domains/calendar/assignee-working-calendar.ts` / `company-calendar.ts`
- `src/domains/task-scheduling/external-load-aware-calendar.ts` — 他WBS考慮スケジューリング用（[07仕様書](./07-task-scheduling.md)）

### アプリケーション
- `src/applications/assignee-gantt/assignee-gantt-service.ts` / `iassignee-gantt-service.ts` — 単一WBS
- `src/applications/cross-wbs-workload/cross-wbs-workload-service.ts` / `icross-wbs-workload-service.ts` — 横断
- `src/applications/cross-wbs-workload/itarget-wbs-query-repository.ts` — 対象WBS解決IF
- `src/applications/assignee-gantt/workload-data.ts` — DTO型（`WorkloadData`, `RateBasis`, `AssigneeWarningData`, `AssigneeGanttResponse`）
- `src/applications/assignee-gantt/workload-data-mapper.ts` — `toWorkloadData`（派生指標・ハイブリッドRバッジ）
- `src/applications/task/itask-repository.ts` の `findActiveByWbsIds` / `src/applications/wbs/iwbs-assignee-repository.ts` の `findByWbsIds` — 複数WBS一括取得

### インフラストラクチャ
- `src/infrastructures/cross-wbs-workload/target-wbs-query-repository.ts` — 対象WBS解決の実装
- `src/infrastructures/task-repository.ts` の `findActiveByWbsIds` / `src/infrastructures/wbs-assignee-repository.ts` の `findByWbsIds`

### UI
- `src/components/assignee-gantt/workload-gantt-chart.tsx` — 汎用チャート本体（週/月ナビ・詳細Sheet・色分け）
- `src/components/assignee-gantt/gantt-header.tsx` / `gantt-row.tsx` / `gantt-cell.tsx` — 表示部品
- `src/app/wbs/[id]/assignee-gantt/assignee-gantt-chart.tsx` — WBS単位コンテナ（他WBS考慮トグル）
- `src/app/wbs/[id]/assignee-gantt/assignee-gantt-actions.ts` — Server Action（`includeOtherWbs` オプション）
- `src/app/assignee-gantt/page.tsx` / `actions.ts` / `_components/cross-project-gantt-chart.tsx` — プロジェクト横断ページ
- `src/components/side-menu.tsx` — 「担当者負荷」リンク

### DI
- `SYMBOL.ICrossWbsWorkloadService` / `SYMBOL.ITargetWbsQueryRepository`（`src/types/symbol.ts`）
- `src/lib/inversify.config.ts` の対応する `bind`

---

## 12. テスト

| 対象 | テスト |
| --- | --- |
| 日別按分（単一WBS） | `src/__tests__/domains/assignee-workload/workload-calculation-service.test.ts` |
| 合算ロジック | `src/__tests__/domains/assignee-workload/workload-merge-service.test.ts` |
| 実現不可能タスク警告 | `src/__tests__/domains/assignee-workload/workload-warning-service.test.ts` |
| タスク配分の`projectName` | `src/__tests__/domains/assignee-workload/task-allocation.test.ts` |
| 稼働カレンダー | `src/__tests__/domains/calendar/assignee-working-calendar.test.ts` |
| 他WBS考慮スケジューリング用カレンダー | `src/__tests__/domains/task-scheduling/external-load-aware-calendar.test.ts` |
| 単一WBSアプリサービス | `src/__tests__/applications/assignee-gantt/assignee-gantt.service.test.ts` |
| 横断アプリサービス（対象WBS解決・合算・ハイブリッドRバッジ） | `src/__tests__/applications/cross-wbs-workload/cross-wbs-workload-service.test.ts` |
| DTOマッパー（派生指標・`rateBasis`） | `src/__tests__/applications/assignee-gantt/workload-data-mapper.test.ts` |
| WBS単位 Server Action（`includeOtherWbs`分岐） | `src/__tests__/actions/assignee-gantt-actions.test.ts` |
| 横断 Server Action | `src/__tests__/actions/cross-project-assignee-gantt-actions.test.ts` |
| 統合テスト | `src/__integration_tests__/assignee-gantt/assignee-gantt.integration.test.ts` |
