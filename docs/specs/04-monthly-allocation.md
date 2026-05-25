# 月別工数按分と量子化 仕様書

## 1. 概要

月別工数按分とは、WBS（Work Breakdown Structure）上のタスクが持つ工数（予定・基準・見通し）を、タスクの実施期間に含まれる各月へ営業日ベースで比例配分する機能である。

### 実現すること

- 複数月にまたがるタスクの工数を月ごとに分割し、月別集計レポートを生成する
- 基準工数（ベースライン）・予定工数・実績工数・見通し工数を月単位で管理する
- 分割した工数値を 0.25 時間単位（ハミルトン方式）で量子化し、合計値を保持したまま各月へ整数的な端数を配分する
- 担当者別・工程別それぞれの視点で月別集計テーブルを生成する

---

## 2. 用語定義

| 用語 | 説明 |
|------|------|
| **基準工数（KIJUN）** | プロジェクト計画の基準となる工数。`kijunKosu` フィールドに格納される。基準期間（`kijunStart`〜`kijunEnd`）に基づいて按分される。 |
| **予定工数** | 現時点の計画工数。`yoteiKosu` フィールドに格納される。予定期間（`yoteiStart`〜`yoteiEnd`）に基づいて按分される。 |
| **実績工数** | 実際に作業した工数。`work_records` テーブルから Handler 層で別経路集計される。`MonthlyTaskAllocation` クラス自体は実績工数を常に `0` として扱う。 |
| **見通し工数（forecastKosu）** | 完了見込みの工数。`forecastKosu` フィールドに格納される。予定工数と同じ按分比率で配分される。 |
| **量子化** | 浮動小数点の連続値を指定した最小単位（デフォルト 0.25 時間）に丸める操作。 |
| **ハミルトン方式** | 量子化において合計値を保持しながら端数を配分するアルゴリズム。各月を床取りした後、余った端数分を「小数部の大きい月」から順に 1 単位ずつ付与する。政治学における議席配分のハミルトン方式（最大余剰方式）と同じ原理。 |
| **営業日** | 土日祝日と会社カレンダー上の休日を除いた日数。`BusinessDayPeriod` が担当者のスケジュールと会社カレンダーを考慮して計算する。 |
| **按分比率（allocationRatio）** | 全期間の稼働可能時間（availableHours）の合計に対する当月の稼働可能時間の割合。`availableHours / totalAvailableHours` で算出。 |
| **年月キー（yearMonth）** | 月を識別する文字列。`YYYY/MM` 形式（例: `2025/01`）。 |

---

## 3. MonthlyTaskAllocation の計算ルール

### 3.1 単月タスクの処理

`yoteiEnd` が省略された場合、または呼び出し元が単月と判断した場合の処理。

**デフォルト値（固定）:**

| フィールド | 値 |
|-----------|-----|
| `workingDays` | `1` |
| `availableHours` | `7.5` |
| `allocationRatio` | `1.0` |
| `actualHours` | `0`（常に固定） |

**計算ルール:**

- `plannedHours = task.yoteiKosu`（そのまま適用）
- `baselineHours = task.kijunKosu ?? 0`
- `forecastHours = task.forecastKosu ?? 0`

**計算例:**

```
タスク: yoteiKosu=10.0, kijunKosu=undefined, forecastKosu=undefined
yearMonth: '2025/01'

結果:
  plannedHours  = 10.0
  baselineHours = 0
  forecastHours = 0
  actualHours   = 0
  workingDays   = 1
  availableHours = 7.5
  allocationRatio = 1.0
```

---

### 3.2 複数月タスクの処理

`yoteiEnd` が `yoteiStart` と異なる月にまたがる場合の処理。

#### 按分の流れ

1. `BusinessDayPeriod` が予定期間の月別営業日数（`businessDaysByMonth`）と月別稼働可能時間（`availableHoursByMonth`）を計算する
2. 全期間の稼働可能時間の合計（`totalAvailableHours`）を算出する
3. 予定工数（`yoteiKosu`）は呼び出し元（Handler 層）が上記比率で先に分割した結果を `allocatedPlannedHours: Map<string, number>` として受け取る
4. 基準工数・見通し工数も同様に、呼び出し元が分割した結果を `allocatedBaselineHours`・`allocatedForecastHours` として受け取る
5. 各月の `allocationRatio = availableHours / totalAvailableHours`

#### 実績工数

`actualHours` は `work_records` テーブルから Handler 層で集計するため、`MonthlyTaskAllocation` では常に `0` を設定する。

#### 基準工数の同時按分ルール

基準工数は、**予定期間とは独立した `kijunPeriod`（基準期間）に基づいて別途按分される**。

- 予定期間の月に基準工数も存在する場合: `allocatedBaselineHours.get(yearMonth)` の値を使用
- **基準期間のみに存在する月**（予定期間に含まれない月）: `plannedHours=0`, `forecastHours=0`, `allocationRatio=0` として月別データに追加される
- 基準工数が渡されない場合: 全月で `baselineHours = 0`

**計算例（複数月）:**

```
タスク: yoteiKosu=30.0, yoteiStart=2025-01-15, yoteiEnd=2025-03-15

allocatedPlannedHours:
  '2025/01' => 10.0
  '2025/02' => 15.0
  '2025/03' => 5.0

BusinessDayPeriod の計算結果（例）:
  availableHours['2025/01'] = 12.0
  availableHours['2025/02'] = 18.0
  availableHours['2025/03'] = 6.0
  totalAvailableHours = 36.0

結果:
  '2025/01': plannedHours=10.0, allocationRatio=12/36=0.333
  '2025/02': plannedHours=15.0, allocationRatio=18/36=0.500
  '2025/03': plannedHours= 5.0, allocationRatio= 6/36=0.167
  全月で actualHours=0
```

**基準期間が予定期間と同じ複数月の場合:**

```
基準: kijunKosu=10, kijunStart=2025-11-20, kijunEnd=2025-12-05
予定: yoteiKosu=12, yoteiStart=2025-11-20, yoteiEnd=2025-12-05

allocatedPlannedHours:  '2025/11'=>8, '2025/12'=>4
allocatedBaselineHours: '2025/11'=>6.67, '2025/12'=>3.33

結果:
  '2025/11': plannedHours=8, baselineHours≈6.67
  '2025/12': plannedHours=4, baselineHours≈3.33
```

---

---

## 4. AllocationQuantizer（ハミルトン方式）のアルゴリズム詳細

### 4.1 概要

`AllocationQuantizer` は、月別に按分された浮動小数点の工数値を、指定した最小単位（デフォルト `0.25` 時間）に揃えながら、**全月の合計値を保持する**ドメインサービスである。
デフォルト単位は `0.25` 時間（15分）。`unit` が `0` 以下の場合はエラーをスローする。

### 4.2 量子化手順

入力: 月キー（`YYYY/MM`）→ 工数（時間数）の Map

**ステップ 1: 合計ユニット数の算出**

```
rawTotal    = Σ raw.values()
totalUnits  = Math.round(rawTotal / unit)
```

合計値を `unit` 単位のユニット数に丸める。

**ステップ 2: 各月の床取りと小数部の計算**

```
unitsRaw   = hours / unit
floorUnits = Math.floor(unitsRaw + 1e-9)   // 浮動小数点誤差対策
frac       = unitsRaw - floorUnits
```

`1e-9` を加算することで、例えば `0.25 / 0.25 = 0.9999...` のような計算誤差が床取りに影響しないようにする。

**ステップ 3: 残りユニット数の計算**

```
usedUnits = Σ floorUnits
remaining = max(0, totalUnits - usedUnits)
```

**ステップ 4: 残りユニットを小数部の大きい順に配分**

月エントリを以下の優先度でソートする:
1. `frac` の降順（小数部が大きい月を優先）
2. 同値の場合は `yearMonth` の昇順（年月が早い月を優先）

上位 `remaining` 件の `floorUnits` に `+1` する。

**ステップ 5: 結果を年月昇順で返す**

`floorUnits * unit` を各月の量子化後の値として返す。

### 4.3 不変条件

```
Σ result.values() == totalUnits * unit  (量子化前合計値の丸め値)
```

### 4.4 浮動小数点誤差対策

床取り時に `Math.floor(unitsRaw + 1e-9)` を使用する。これにより以下のケースが正しく処理される:

```
0.1 + 0.2 = 0.30000000000000004  // 浮動小数点誤差
0.30000000000000004 / 0.25 = 1.2000000000000002
Math.floor(1.2000000000000002 + 1e-9) = 1  // 正しく 1 になる
```

### 4.5 計算例

#### 例 1: 基本的な量子化

```
unit = 0.25
raw: { '2025/01': 1.1, '2025/02': 2.2, '2025/03': 3.3 }

rawTotal   = 6.6
totalUnits = Math.round(6.6 / 0.25) = Math.round(26.4) = 26

各月の計算:
  '2025/01': unitsRaw=4.4, floor=4, frac=0.4
  '2025/02': unitsRaw=8.8, floor=8, frac=0.8  ← frac 最大
  '2025/03': unitsRaw=13.2, floor=13, frac=0.2

usedUnits = 4 + 8 + 13 = 25
remaining = 26 - 25 = 1

frac 降順ソート: ['2025/02'(0.8), '2025/01'(0.4), '2025/03'(0.2)]
上位 1 件に +1: '2025/02' の floorUnits = 9

結果:
  '2025/01': 4 * 0.25 = 1.0
  '2025/02': 9 * 0.25 = 2.25  ← +1 unit
  '2025/03': 13 * 0.25 = 3.25
  合計: 6.5（= 26 * 0.25）
```

#### 例 2: 同値 frac の年月昇順安定化

```
unit = 0.25
raw: { '2025/03': 1.1, '2025/01': 1.1, '2025/02': 1.1 }

rawTotal   = 3.3
totalUnits = Math.round(3.3 / 0.25) = Math.round(13.2) = 13

各月: unitsRaw=4.4, floor=4, frac=0.4（全て同値）

usedUnits = 12, remaining = 1

frac 同値のため年月昇順: ['2025/01', '2025/02', '2025/03']
上位 1 件（'2025/01'）に +1

結果:
  '2025/01': 5 * 0.25 = 1.25  ← +1 unit
  '2025/02': 4 * 0.25 = 1.0
  '2025/03': 4 * 0.25 = 1.0
  合計: 3.25
```

#### 例 3: 複雑な按分（3月の frac が最大）

```
unit = 0.25
raw: { '2025/01': 0.33, '2025/02': 0.33, '2025/03': 0.34 }

rawTotal   = 1.0
totalUnits = Math.round(1.0 / 0.25) = 4

各月:
  '2025/01': unitsRaw=1.32, floor=1, frac=0.32
  '2025/02': unitsRaw=1.32, floor=1, frac=0.32
  '2025/03': unitsRaw=1.36, floor=1, frac=0.36  ← frac 最大

usedUnits = 3, remaining = 1

'2025/03' に +1

結果:
  '2025/01': 0.25
  '2025/02': 0.25
  '2025/03': 0.5   ← +1 unit
  合計: 1.0
```

#### 例 4: 既存実装との整合性確認

```
unit = 0.25
raw: { '2025/01': 1.15, '2025/02': 2.35, '2025/03': 1.50 }

rawTotal   = 5.0
totalUnits = Math.round(5.0 / 0.25) = 20

各月:
  '2025/01': unitsRaw=4.6, floor=4, frac=0.6  ← frac 最大
  '2025/02': unitsRaw=9.4, floor=9, frac=0.4
  '2025/03': unitsRaw=6.0, floor=6, frac=0.0

usedUnits = 19, remaining = 1

'2025/01' に +1

結果:
  '2025/01': 5 * 0.25 = 1.25  ← +1 unit
  '2025/02': 9 * 0.25 = 2.25
  '2025/03': 6 * 0.25 = 1.5
  合計: 5.0
```

---

## 5. MonthlySummaryAccumulator の集計ルール

### 5.1 概要

`MonthlySummaryAccumulator` は、複数タスクの月別・担当者別配分結果を逐次受け取り、集計した `MonthlyAssigneeSummary` を返すアキュムレータである。

同一の担当者×月キーのデータは自動的にマージ（累積加算）される。

### 5.2 addTaskAllocation の処理

引数: 担当者名、年月（`YYYY/MM`）、予定・実績・基準工数、タスク詳細、見通し工数（省略可）

マージ時の各フィールドの更新:

| フィールド | 更新方法 |
|-----------|----------|
| `taskCount` | `+= 1` |
| `plannedHours` | `+= plannedHours` |
| `actualHours` | `+= actualHours` |
| `baselineHours` | `+= baselineHours` |
| `forecastHours` | `+= forecastHours`（引数が `undefined` の場合は加算しない） |
| `difference` | `actualHours - plannedHours`（再計算） |

### 5.3 差分（difference）計算

```
difference = actualHours - plannedHours
```

- `actualHours < plannedHours` のとき: 負の値（予定より少ない実績）
- `actualHours > plannedHours` のとき: 正の値（予定より多い実績）

### 5.4 担当者のソート順

`getTotals()` で返される `assignees` 配列は以下の優先度でソートされる:

1. `assigneeSeqMap` に登録された `seq` 値の昇順
2. `seq` が同値の場合は担当者名の `localeCompare` 昇順
3. `assigneeSeqMap` に未登録の担当者は `seq = Number.MAX_SAFE_INTEGER` として末尾に配置

### 5.5 計算例

```
入力:
  addTaskAllocation('田中', '2025/01', 10.0, 8.0, 0,  taskDetail1)
  addTaskAllocation('田中', '2025/01',  5.0, 4.0, 0,  taskDetail2)
  addTaskAllocation('田中', '2025/02', 15.0,12.0, 0,  taskDetail3)
  addTaskAllocation('佐藤', '2025/01', 20.0,16.0, 0,  taskDetail4)
  addTaskAllocation('佐藤', '2025/02', 10.0, 8.0, 0,  taskDetail5)

data（キー別）:
  '2025/01-田中': taskCount=2, planned=15, actual=12, diff=-3
  '2025/02-田中': taskCount=1, planned=15, actual=12, diff=-3
  '2025/01-佐藤': taskCount=1, planned=20, actual=16, diff=-4
  '2025/02-佐藤': taskCount=1, planned=10, actual= 8, diff=-2

monthlyTotals:
  '2025/01': taskCount=3, planned=35, actual=28, diff=-7
  '2025/02': taskCount=2, planned=25, actual=20, diff=-5

assigneeTotals:
  '田中': taskCount=3, planned=30, actual=24, diff=-6
  '佐藤': taskCount=2, planned=30, actual=24, diff=-6

grandTotal: taskCount=5, planned=60, actual=48, diff=-12
```

---

## 6. MonthlyPhaseSummaryAccumulator の集計ルール

### 6.1 概要

`MonthlyPhaseSummaryAccumulator` は `MonthlySummaryAccumulator` と同一の設計パターンを採用するが、集計の軸が**担当者**ではなく**フェーズ（工程）**である。
入力・フィールド更新ルールは `MonthlySummaryAccumulator` と同一。

### 6.2 フェーズのソート順

`getTotals()` で返される `phases` 配列は以下の優先度でソートされる:

1. `phaseSeqMap` に登録された `seq` 値の昇順
2. `seq` が同値の場合はフェーズ名の `localeCompare` 昇順
3. `phaseSeqMap` に未登録のフェーズは `seq = Number.MAX_SAFE_INTEGER` として末尾に配置

### 6.3 計算例

```
入力:
  addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, taskDetail1)
  addTaskAllocation('設計', '2025/01',  5.0, 4.0, 0, taskDetail2)
  addTaskAllocation('設計', '2025/02', 15.0,12.0, 0, taskDetail3)
  addTaskAllocation('実装', '2025/01', 20.0,16.0, 0, taskDetail4)
  addTaskAllocation('実装', '2025/02', 10.0, 8.0, 0, taskDetail5)

monthlyTotals:
  '2025/01': taskCount=3, planned=35(10+5+20), actual=28
  '2025/02': taskCount=2, planned=25(15+10), actual=20

phaseTotals:
  '設計': taskCount=3, planned=30(10+5+15), actual=24
  '実装': taskCount=2, planned=30(20+10), actual=24

grandTotal: taskCount=5, planned=60, actual=48, diff=-12
```

---

## 7. エッジケース一覧

### 7.1 MonthlyTaskAllocation のエッジケース

| ケース | 動作 |
|--------|------|
| `kijunKosu` が `undefined` | `baselineHours = 0` として扱う |
| `forecastKosu` が `undefined` | `forecastHours = 0` として扱う |
| `jissekiKosu` が指定されていても | `actualHours = 0`（work_records 経路で集計するため） |
| 基準期間のみに含まれる月 | `plannedHours=0, forecastHours=0, allocationRatio=0` で追加 |
| `getMonths()` で Mapの挿入順が逆順 | 常に年月昇順でソートして返す |
| 存在しない月に `getAllocation` | `undefined` を返す |
| `totalAvailableHours = 0` | `allocationRatio = 0`（ゼロ除算を防ぐ） |

### 7.2 AllocationQuantizer のエッジケース

| ケース | 動作 |
|--------|------|
| 空の `Map` | そのまま空 `Map` を返す |
| `unit <= 0` | `Error` をスロー |
| 浮動小数点誤差（例: `0.1+0.2`） | `1e-9` オフセットで床取りの誤判定を防ぐ |
| `remaining < 0` になる場合 | `Math.max(0, ...)` で 0 にクランプ |
| 全月の `frac` が同値 | 年月昇順で優先順位を決定（安定ソート） |

### 7.3 MonthlySummaryAccumulator / MonthlyPhaseSummaryAccumulator のエッジケース

| ケース | 動作 |
|--------|------|
| データが 0 件のとき `getTotals()` | 空配列・ゼロ値の集計を返す |
| `forecastHours` を省略して `addTaskAllocation` | `forecastHours` フィールドへの加算をスキップ（`0` を維持） |
| `baselineHours = 0` のデータを追加 | 集計時に加算される（値が `0` でも合計に正しく反映） |
| `seq` が未登録の担当者/フェーズ | `Number.MAX_SAFE_INTEGER` として末尾に配置 |
| `seq` が同値の複数担当者/フェーズ | `localeCompare` による名前順で安定化 |

### 7.4 基準期間と予定期間の不一致（既知の制限事項）

現在の実装には以下の既知の制限がある（TODO として記録されている）:

**ケース A: 基準が単月、予定が複数月**

- 基準: 11/20〜11/30（単月）、予定: 11/20〜12/05（複数月）
- 現状: 基準工数が予定期間の按分比率で 11 月・12 月に分割される
- 理想: 基準工数は 11 月のみに計上されるべき

**ケース B: 基準が複数月、予定が単月**

- 基準: 11/20〜12/10（複数月）、予定: 11/25〜11/30（単月）
- 現状: 基準工数が `createSingleMonth` で 11 月のみに全額計上される
- 理想: 基準期間に基づいて 11 月・12 月に按分されるべき

これらは `createMultiMonth` に `allocatedBaselineHours` と `kijunPeriod` を正しく渡すことで対応可能であるが、呼び出し元（Handler 層）での実装が必要。

---

## 8. 計算例（テストコードより抽出）

### 8.1 単月タスクの生成

```
入力:
  task = { yoteiKosu: 10.0, jissekiKosu: 8.0 }
  yearMonth = '2025/01'

出力:
  plannedHours  = 10.0
  actualHours   = 0      ← jissekiKosu は無視
  workingDays   = 1
  availableHours = 7.5
  allocationRatio = 1.0
```

### 8.2 複数月タスクの生成

```
入力:
  task = { yoteiKosu: 30.0, jissekiKosu: 10.0, yoteiStart: 2025-01-15, yoteiEnd: 2025-03-15 }
  allocatedPlannedHours = { '2025/01': 10.0, '2025/02': 15.0, '2025/03': 5.0 }

出力:
  '2025/01': plannedHours=10.0, actualHours=0
  '2025/02': plannedHours=15.0, actualHours=0
  '2025/03': plannedHours= 5.0, actualHours=0
  getTotalPlannedHours() = 30.0
  getTotalActualHours()  =  0.0
```

### 8.3 ハミルトン量子化の複雑なケース

```
入力 (unit=0.25):
  raw = { '2025/01': 1.15, '2025/02': 2.35, '2025/03': 1.50 }

中間計算:
  rawTotal   = 5.0
  totalUnits = 20

  '2025/01': unitsRaw=4.6,  floor=4, frac=0.6  ← 最大
  '2025/02': unitsRaw=9.4,  floor=9, frac=0.4
  '2025/03': unitsRaw=6.0,  floor=6, frac=0.0

  usedUnits = 19, remaining = 1
  → '2025/01' に +1

出力:
  '2025/01': 1.25  (= 5 * 0.25)
  '2025/02': 2.25  (= 9 * 0.25)
  '2025/03': 1.5   (= 6 * 0.25)
  合計 = 5.0（不変）
```

### 8.4 担当者別月別集計

```
入力:
  田中 / 2025/01: plannedHours=10.0, actualHours=8.0, baselineHours=10
  佐藤 / 2025/02: plannedHours= 5.0, actualHours=4.0, baselineHours=20

出力 (getTotals()):
  monthlyTotals['2025/01']:
    plannedHours=10, actualHours=8, difference=-2, baselineHours=10
  monthlyTotals['2025/02']:
    plannedHours=5,  actualHours=4, difference=-1, baselineHours=20
  assigneeTotals['田中']:
    plannedHours=10, baselineHours=10
  assigneeTotals['佐藤']:
    plannedHours=5,  baselineHours=20
  grandTotal:
    plannedHours=15, actualHours=12, difference=-3, baselineHours=30
```

### 8.5 見通し工数の集計

```
入力:
  田中 / 2025/01: plannedHours=10.0, actualHours=8.0, forecastHours=9.5
  田中 / 2025/01: plannedHours= 5.0, actualHours=4.0, forecastHours=4.8

出力:
  data[0]: forecastHours = 14.3 (= 9.5 + 4.8)
  monthlyTotals['2025/01'].forecastHours = 14.3
  assigneeTotals['田中'].forecastHours   = 14.3
  grandTotal.forecastHours               = 14.3
```

### 8.6 formatYearMonth の変換

```
new Date('2025-01-10') → '2025/01'
new Date('2025-12-31') → '2025/12'
new Date('2024-03-15') → '2024/03'
new Date('2025-09-10') → '2025/09'  ← 1桁の月はゼロパディング
```

---

## 付録: 関連クラス一覧

| クラス | ファイル | 責務 |
| --- | --- | --- |
| `MonthlyTaskAllocation` | `src/domains/wbs/monthly-task-allocation.ts` | 月別按分結果の保持・ファクトリメソッド |
| `AllocationQuantizer` | `src/domains/wbs/allocation-quantizer.ts` | ハミルトン方式による量子化 |
| `MonthlySummaryAccumulator` | `src/applications/wbs/query/monthly-summary-accumulator.ts` | 担当者×月の按分結果集計 |
| `MonthlyPhaseSummaryAccumulator` | `src/applications/wbs/query/monthly-phase-summary-accumulator.ts` | フェーズ×月の按分結果集計 |

---

## 付録: 関連画面一覧

| 画面名 | パス | 関連内容 |
| --- | --- | --- |
| WBS管理（サマリータブ） | `src/app/wbs/[id]/page.tsx` | `WbsSummaryTables` コンポーネントで担当者別×月別・工程別×月別の按分工数クロス集計を表示する |
