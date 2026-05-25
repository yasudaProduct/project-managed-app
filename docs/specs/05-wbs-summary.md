# WBSサマリー集計 仕様書

## 1. 概要

WBSサマリーは、WBS（Work Breakdown Structure）に登録されたタスクを複数の軸で集計・可視化するための機能である。
プロジェクト管理画面において、各担当者・各工程の工数の予実をひと目で確認できるクロス集計表として使用される。

具体的には以下の集計を一括で提供する。

- **工程別集計**：各フェーズのタスク数・予定工数・実績工数・差分
- **担当者別集計**：各担当者のタスク数・予定工数・実績工数・差分
- **月別×担当者別集計**：月・担当者を2軸としたクロス集計（予定・実績・基準・見通し工数）
- **月別×工程別集計**：月・工程を2軸としたクロス集計（予定・実績・基準・見通し工数）

---

## 2. 用語定義

| 用語 | 説明 |
|------|------|
| **WBSサマリー** | 工程別・担当者別・月別のクロス集計結果を束ねたデータ構造（`WbsSummaryResult`） |
| **計算モード（AllocationCalculationMode）** | 月別集計における工数の月への振り分け方式。`BUSINESS_DAY_ALLOCATION`（営業日按分）と `START_DATE_BASED`（開始日基準）の2種類がある |
| **担当者（Assignee）** | タスクに設定されたユーザー。月別集計では予定工数の帰属先となる |
| **WBS担当者（WbsAssignee）** | WBSに登録されたメンバー一覧。`seq`（表示順）を持ち、担当者のソート順に使用される |
| **フェーズ（Phase）** | タスクに設定された工程（例：設計、実装、テスト）。`seq`（表示順）を持つ |
| **予定工数（yoteiKosu）** | タスクに設定された予定作業時間（時間） |
| **実績工数（jissekiKosu）** | タスクに直接記録された実績作業時間（時間）。工程別・担当者別集計で使用 |
| **基準工数（kijunKosu）** | タスクの基準（ベースライン）工数。月別集計の `baselineHours` に反映される |
| **work_records** | 実際の作業記録テーブル。作業日・作業者・作業時間を記録する。月別集計の「実績」の計上源となる |
| **見通し工数（forecastHours）** | タスクの進捗状況から算出した完了見込み工数。`ForecastCalculationService` が算出し、`distributeForecastAcrossMonths` で月別に配分される |
| **量子化（roundToQuarter）** | 工数を0.25時間単位に丸める処理。プロジェクト設定で有効/無効を制御する |

---

## 3. 入力パラメータ（クエリの構造）

クエリは以下のフィールドを持つ。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `projectId` | `string` | プロジェクトID（プロジェクト設定の取得に使用） |
| `wbsId` | `number` | 集計対象のWBS ID |
| `calculationMode` | `AllocationCalculationMode` | 計算モード（デフォルト: `BUSINESS_DAY_ALLOCATION`） |

---

## 4. 出力データ構造（結果の構造）

### 4.1 WbsSummaryResult（最上位）

最上位の結果は以下の4つのデータを持つ。

| フィールド | 説明 |
| --- | --- |
| `phaseSummaries` | 工程別集計（seq順でソート済み） |
| `phaseTotal` | 工程別合計 |
| `assigneeSummaries` | 担当者別集計（seq順でソート済み） |
| `assigneeTotal` | 担当者別合計 |
| `monthlyAssigneeSummary` | 月別×担当者別クロス集計 |
| `monthlyPhaseSummary` | 月別×工程別クロス集計（省略可） |

### 4.2 PhaseSummary（工程別集計の1行）

工程名・表示順・タスク数・予定工数・実績工数（`jissekiKosu` ベース）・差分を持つ。

### 4.3 AssigneeSummary（担当者別集計の1行）

担当者名・表示順（`WbsAssignee.seq`。未登録の場合は末尾に配置）・タスク数・予定工数・実績工数（`jissekiKosu` ベース）・差分を持つ。

### 4.4 MonthlyAssigneeSummary（月別×担当者別集計）

月×担当者の組み合わせごとのセルデータ・昇順ソート済み月リスト・担当者ソート済みリスト・月別合計・担当者別合計・全体合計を持つ。
各セルデータは担当者名・月（`YYYY/MM`）・タスク数・予定/実績/基準/見通し工数・差分・タスク詳細（省略可）を含む。

### 4.5 MonthlyPhaseSummary（月別×工程別集計）

`MonthlyAssigneeSummary` と同構造。`assignee` の代わりに `phase` フィールドを持つ。

### 4.6 TaskAllocationDetail（タスクの月別按分詳細）

タスクID・名称・工程・担当者・期間・総工数に加え、月ごとの営業日数・利用可能時間・按分比率・各工数（予定/実績/見通し）を含む月別按分配列を持つ。

---

## 5. 2つの計算モード

### 5.1 BUSINESS_DAY_ALLOCATION（営業日按分）

月を跨ぐタスクの工数を、各月の**営業日数**に比例して按分する方式。

**処理フロー：**

1. `WorkingHoursAllocationService.allocateTaskWithDetails()` を呼び出し、タスクの予定期間（`yoteiStart`〜`yoteiEnd`）を月ごとの営業日数で按分する。
2. 会社休日（`CompanyHoliday`）とユーザースケジュール（`UserSchedule`）を考慮して各月の利用可能時間を計算する。
3. `roundToQuarter = true` の場合、`AllocationQuantizer(0.25)` を用いて工数を0.25単位に量子化する。
4. 月別の予定工数を `MonthlyTaskAllocation` として取得し、`MonthlySummaryAccumulator` に蓄積する。

**特徴：**

- 月をまたぐタスクは複数月にわたって工数が分散される
- `2025/01/15〜2025/02/14`、`yoteiKosu=40h` のタスクであれば、1月と2月にそれぞれの営業日数比で工数が分配される（例：1月 >0h かつ 2月 >0h で合計が 40h に一致する）
- `allocationRatio`（按分比率）と `workingDays`（営業日数）がタスク詳細に記録される

### 5.2 START_DATE_BASED（開始日基準）

タスクの全工数を**予定開始日（yoteiStart）の月に一括計上**する方式。

**処理フロー：**

1. `yoteiStart` から `YYYY/MM` 形式の月キーを生成する。
2. `yoteiKosu` の全量を当該月に計上する。
3. `kijunKosu` の全量を `baselineHours` として当該月に計上する。

**特徴：**

- シンプルで高速。月またぎ按分を行わない。
- 月またぎタスク（例：`2024/01/25〜2024/02/05`、`yoteiKosu=60h`）でも、全60hが1月に計上される。
- `TaskAllocationDetail.monthlyAllocations` における `workingDays`は常に1、`availableHours` は常に7.5、`allocationRatio` は常に1.0となる（ダミー値）。

---

## 6. 予定/実績/見通しの計上ルール

### 6.1 予定（plannedHours）

**タスクの担当者行に計上する。**

- 計上先：`task.assignee.displayName`（担当者未設定の場合は「未割当」）
- 計上月：BUSINESS_DAY_ALLOCATION では按分後の各月、START_DATE_BASED では `yoteiStart` の月
- work_records に実際の作業者が存在しても、予定はあくまでタスク担当者へ計上される

### 6.2 実績（actualHours）

**work_records の実作業者行・実作業月に計上する。**

- 計上先：`work_records.userDisplayName`（タスクの担当者とは無関係）
- 計上月：`work_records.date` から導出した `yearMonth`（`YYYY/MM`形式）
- タスク担当者が異なる場合でも、実際に作業した人物の行に計上される

**具体例（統合テストより）：**

```
タスク担当者: 田中太郎（yoteiKosu=30h, 2025/01）
実作業者:     佐藤花子（2025/01に10h作業）

→ 2025/01 田中太郎: plannedHours=30, actualHours=0
→ 2025/01 佐藤花子: plannedHours=0,  actualHours=10
```

工程別集計（monthlyPhaseSummary）でも同様に、work_records の作業月に実績が計上される（タスクの予定開始月ではない）。

### 6.3 見通し（forecastHours）

`ForecastCalculationService.calculateTaskForecast()` でタスク単体の総見通し工数を算出し、`distributeForecastAcrossMonths()` で月別に配分する。

配分の数式・不変条件は [03: 見通し工数計算仕様書 section 7](./03-forecast-calculation.md#7-見通し工数の月別配分) を参照。

**見通しの担当者・工程への配分先：**

| 月の種別 | 計上先（担当者別集計） |
|----------|----------------------|
| 予定あり月（allocation が存在する月） | タスク担当者行 |
| 予定なし月（実績のみの月） | 実作業者行（実績比率で按分） |

予定なし月に複数の作業者がいる場合、各作業者の実績時間の比率に応じて見通し工数を割り当てる。

---

## 7. 担当者ソートルール

ソートルールの詳細（seq昇順 → localeCompare昇順 → 未登録はMAX_SAFE_INTEGER末尾）は [04: 月別工数按分仕様書 section 5.4](./04-monthly-allocation.md#54-担当者のソート順) を参照。担当者・工程ともに同一ルールを適用する。

**具体例（統合テスト）：**

```
WbsAssignee: 田中太郎 (seq=1), 佐藤花子 (seq=2)
→ result.assigneeSummaries[0].assignee === '田中太郎'
→ result.assigneeSummaries[1].assignee === '佐藤花子'
```

---

## 8. フェーズ別月別集計のルール

`monthlyPhaseSummary` は `MonthlyPhaseSummaryAccumulator` によって構築される。

- **工程の帰属**：タスクに設定された `phase.name` を使用する（タスクごとに固定）
- **月のキー**：担当者別集計と同じロジックで決定（計算モードに従う）
- **予定・実績の計上**：
  - 予定：タスクの `phase` に対して計上（担当者は無関係）
  - 実績：work_records の作業月に計上（タスク担当者・作業者は無関係）
- **工程のソート**：`PhaseData.seq` 昇順（同値なら `localeCompare`）
- **工程未設定タスク**：`phase` が `null` のタスクは「未設定」として集計される

**具体例（統合テスト）：**

```
テストフェーズ (seq=1): T-050(田中, 2025/01, 10h) + T-051(佐藤, 2025/01, 15h)
実装フェーズ  (seq=2): T-052(田中, 2025/02, 25h)

→ monthlyPhaseSummary.data:
  { phase: 'テストフェーズ', month: '2025/01', plannedHours: 25, actualHours: 10 }
  { phase: '実装',           month: '2025/02', plannedHours: 25, actualHours: 10 }
```

担当者別集計の月別合計と工程別集計の月別合計は一致する（双方の `grandTotal.forecastHours` が等しい）。

---

## 9. 未割当・未設定の処理

| ケース | 処理 |
|--------|------|
| タスクに担当者が設定されていない（`assignee = null`） | 予定工数は「未割当」キーに集計される |
| WbsAssignee に未登録の担当者名 | `seq = Number.MAX_SAFE_INTEGER` としてリスト末尾に表示 |
| タスクに工程が設定されていない（`phase = null`） | 月別工程別集計では「未設定」として集計される |
| 工程別集計でフェーズに対応するタスクがない | `taskCount=0`、`plannedHours=0`、`actualHours=0` として初期化される（`phaseSummaries` には必ず全フェーズが含まれる） |

---

## 10. 量子化（roundToQuarter）の適用タイミング

プロジェクト設定 `ProjectSettings.roundToQuarter = true` の場合のみ適用される。

- **適用対象**：`BUSINESS_DAY_ALLOCATION` モードのみ
- **適用箇所**：`WorkingHoursAllocationService.allocateTaskWithDetails()` の呼び出し時に `AllocationQuantizer(0.25)` を渡す
- **量子化単位**：0.25時間（15分）
- **START_DATE_BASED モード**：量子化は行われない（タスクの `yoteiKosu` をそのまま計上する）
- **`roundToQuarter = false` または `null`**：量子化器は生成されず（`quantizer = undefined`）、工数はそのままの値で使用される

---

## 11. エッジケース一覧

### 11.1 yoteiStart が null のタスク

- **工程別・担当者別集計**：`yoteiKosu`、`jissekiKosu` は通常通り集計される
- **月別集計（予定）**：按分・月集計はスキップされる（`yoteiStart` がないため月が特定できない）
- **月別集計（実績）**：`work_records` に実績があれば、その作業月・作業者で集計に含まれる

```
// テストより
Task: yoteiStart=null, yoteiEnd=null
work_records: John Doe, 2024/06, 12h

→ monthlyAssigneeSummary.months には '2024/06' が含まれる
→ monthlyTotals['2024/06'].actualHours === 12
```

### 11.2 担当者未割当タスク（assignee = null）

- 月別集計では `assignee: '未割当'` として計上される
- `seq = Number.MAX_SAFE_INTEGER`

### 11.3 工程未設定タスク（phase = null）

- 月別工程別集計では `phase: '未設定'` として計上される

### 11.4 kijunKosu が null

- `baselineHours = 0` として扱われる

### 11.5 実績が予定月以外に発生したケース

予定月（`plannedYearMonth`）以外の月に work_records が存在した場合：
- その月が `months` リストに追加される
- その月の `plannedHours = 0` で実績のみの行が追加される
- 見通しは実績比率で実作業者行に割り当てられる（`forecastHours >= actualHours` は保証される）

```
// テストより（START_DATE_BASED）
Task: yoteiStart=2024/01, yoteiKosu=20h
work_records: 2024/01に5h, 2024/02に3h

→ 2024/01: plannedHours=20, actualHours=5
→ 2024/02: plannedHours=0,  actualHours=3
→ grandTotal.plannedHours=20, grandTotal.actualHours=8
```

### 11.6 実績が予定を超過したタスク（jissekiKosu > yoteiKosu）

- 差分（`difference`）は負の値になる（実績超過を示す）
- 見通し工数は少なくとも実績以上になる（不変条件①より）

### 11.7 不明な計算モード

- ハンドラーは `throw new Error('不明な計算モード: ${mode}')` を投げる

---

## 12. 計算例

### 12.1 工程別集計の例（ユニットテストより）

**入力データ：**

| タスク | 工程 | 担当者 | yoteiKosu | jissekiKosu |
|--------|------|--------|-----------|-------------|
| Task 1 | Phase 1 | John Doe | 40h | 35h |
| Task 2 | Phase 2 | John Doe | 60h | 55h |
| Task 3 | Phase 1 | Jane Smith | 30h | 32h |

**出力（phaseSummaries）：**

```
Phase 1: taskCount=2, plannedHours=70, actualHours=67, difference=-3
Phase 2: taskCount=1, plannedHours=60, actualHours=55, difference=-5

phaseTotal: taskCount=3, plannedHours=130, actualHours=122, difference=-8
```

### 12.2 担当者別集計の例（ユニットテストより）

同じ入力データを使用した場合：

```
John Doe:  taskCount=2, plannedHours=100, actualHours=90,  difference=-10
Jane Smith: taskCount=1, plannedHours=30,  actualHours=32,  difference=2

assigneeTotal: taskCount=3, plannedHours=130, actualHours=122, difference=-8
```

### 12.3 START_DATE_BASED モードの月別集計例（ユニットテストより）

**入力：**
- Task 1: `yoteiStart=2024/01/15`, `yoteiKosu=40h`（担当者: John Doe）
- Task 2: `yoteiStart=2024/01/25`, `yoteiKosu=60h`（担当者: John Doe）
- Task 3: `yoteiStart=2024/02/01`, `yoteiKosu=30h`（担当者: Jane Smith）

**出力：**

```
John Doe / 2024/01: plannedHours=100  （Task1の40h + Task2の60hが全て1月に計上）
Jane Smith / 2024/02: plannedHours=30
```

### 12.4 BUSINESS_DAY_ALLOCATION モードの月別集計例（ユニットテストより）

**入力：**
- Task: `yoteiStart=2024/01/15`, `yoteiEnd=2024/02/10`, `yoteiKosu=40h`

**出力：**

```
John Doe / 2024/01: plannedHours > 0 かつ < 40
John Doe / 2024/02: plannedHours > 0 かつ < 40
grandTotal.plannedHours ≈ 40（営業日比で按分）
```

### 12.5 予定担当者と実作業者が異なる例（統合テストより）

**入力：**
- タスク：担当者=田中太郎、`yoteiKosu=30h`、`yoteiStart=2025/01/10`
- work_records：佐藤花子が `2025/01/15` に10h作業

**出力：**

```
月別・担当者別集計:
  田中太郎 / 2025/01: plannedHours=30, actualHours=0
  佐藤花子 / 2025/01: plannedHours=0,  actualHours=10
```

### 12.6 見通し工数の配分例（ユニットテストより）

**入力：**
- Task 1: `yoteiStart=2025/01`, `yoteiKosu=40h`, `jissekiKosu=20h`, `progressRate=50%`（IN_PROGRESS）
- Task 2: `yoteiStart=2025/02`, `yoteiKosu=30h`, `jissekiKosu=30h`, `progressRate=100%`（COMPLETED）

**出力（START_DATE_BASED）：**

```
assigneeMonthlyTotals['2025/01'].forecastHours ≈ 40
assigneeMonthlyTotals['2025/02'].forecastHours ≈ 30
grandTotal.forecastHours ≈ 70

（工程別も同値になる）
phaseMonthlyTotals['2025/01'].forecastHours ≈ 40
phaseMonthlyTotals['2025/02'].forecastHours ≈ 30
```

### 12.7 基準工数（kijunKosu）の反映例（統合テストより）

**入力：**
- タスク: `yoteiKosu=20h`, `kijunKosu=50h`, `yoteiStart=2025/03/01`

**出力（START_DATE_BASED）：**

```
grandTotal.baselineHours = 50
（工程別も同様: monthlyPhaseSummary.grandTotal.baselineHours = 50）
```

`kijunKosu` が未設定（`null`）の場合:

```
grandTotal.baselineHours = 0
```

### 12.8 複合ケース（統合テストより）

**入力：**

| タスク | 工程 | 担当者 | yoteiStart | yoteiKosu | 実績 |
|--------|------|--------|------------|-----------|------|
| T-050 | テストフェーズ | 田中太郎 | 2025/01 | 10h | 田中4h (01月) |
| T-051 | テストフェーズ | 佐藤花子 | 2025/01 | 15h | 佐藤6h (01月) |
| T-052 | 実装フェーズ | 田中太郎 | 2025/02 | 25h | 田中10h (02月) |

**月別担当者別出力：**

```
monthlyTotals['2025/01']: plannedHours=25, actualHours=10
monthlyTotals['2025/02']: plannedHours=25, actualHours=10

assigneeTotals['田中太郎']: plannedHours=35, actualHours=14
assigneeTotals['佐藤花子']: plannedHours=15, actualHours=6

grandTotal: taskCount=3, plannedHours=50, actualHours=20
```

**月別工程別出力：**

```
{ phase: 'テストフェーズ', month: '2025/01', plannedHours=25, actualHours=10 }
{ phase: '実装フェーズ',   month: '2025/02', plannedHours=25, actualHours=10 }
```

---

## 付録: 関連クラス一覧

| クラス | ファイル | 責務 |
| --- | --- | --- |
| `GetWbsSummaryQuery` | `src/applications/wbs/query/get-wbs-summary.query.ts` | 集計クエリの入力パラメータ |
| `WbsSummaryQueryHandler` | `src/applications/wbs/query/get-wbs-summary.handler.ts` | サマリー集計のオーケストレーション |
| `MonthlySummaryAccumulator` | `src/applications/wbs/query/monthly-summary-accumulator.ts` | 担当者×月集計 |
| `MonthlyPhaseSummaryAccumulator` | `src/applications/wbs/query/monthly-phase-summary-accumulator.ts` | フェーズ×月集計 |

---

## 付録: 関連画面一覧

| 画面名 | パス | 関連内容 |
| --- | --- | --- |
| WBS管理（サマリータブ） | `src/app/wbs/[id]/page.tsx` | `WbsSummaryTables` コンポーネントで工程別集計・担当者別集計・月別×担当者クロス集計・月別×工程クロス集計を表示する |
| WBSダッシュボード | `src/app/wbs/[id]/dashboard/page.tsx` | 工程別の基準・予定・実績工数サマリーを表示する（`getKosuSummary` アクション経由） |
