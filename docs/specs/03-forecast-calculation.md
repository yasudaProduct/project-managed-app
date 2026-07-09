# 見通し工数計算 仕様書

---

## 1. 概要

### 見通し工数とは

「見通し工数（forecast hours）」とは、プロジェクト現時点の進捗状況をもとに算出した、**タスク完了までに要する総工数の予測値**である。

- **予定工数（planned hours）**: 計画時点で見積もった工数。プロジェクト開始後は原則変更しない。
- **実績工数（actual hours）**: 実際に消費した工数。作業記録（work_records）から集計される。
- **見通し工数（forecast hours）**: 現時点の進捗から「このまま進んだら最終的に何時間かかるか」を推定した値。

### いつ/なぜ使うか

| 用途 | 説明 |
|------|------|
| 完了時コスト予測 (EAC) | 現在の消化ペースから、タスク完了時の総工数超過/節減を予測する |
| WBS月別サマリ表示 | 月別の工数計画に対して「見通し」列を並べ、将来の工数負荷を可視化する |
| リスク早期検知 | 見通し工数が予定工数を大幅に上回っている場合にアラートを出す |

---

## 2. 用語定義

| 用語 | 変数名 | 説明 |
|------|--------|------|
| 予定工数 | `plannedHours` (`yoteiKosu`) | WBS登録時の見積工数（h） |
| 実績工数 | `actualHours` (`jissekiKosu`) | 作業記録から集計された消費工数（h） |
| 自己申告進捗率 | `selfReportedProgress` (`progressRate`) | 担当者が申告した進捗率（0〜100%） |
| 実効進捗率 | `effectiveProgressRate` | 進捗測定方式を適用した後の進捗率（0〜100%）。見通し計算の入力値として使用する |
| 見通し工数 | `forecastHours` (`forecastKosu`) | 見通し計算方式により算出した完了時総工数の予測値（h） |
| 残見通し | `remainingForecast` | `max(0, totalForecast - totalActual)`。月別配分に使用する |

---

## 3. 進捗測定方式

プロジェクト設定で選択された方式（`ProgressMeasurementMethod`）に従い、タスクステータスと自己申告進捗率から**実効進捗率**を決定する。

### 3.1 方式一覧

| 方式 | 定数値 | 特徴 |
|------|--------|------|
| 0/100法 | `ZERO_HUNDRED` | 完了のみ 100%。保守的なリスク評価向き |
| 50/50法 | `FIFTY_FIFTY` | 着手で 50%、完了で 100%。着手時点の貢献を評価したい場合向き |
| 自己申告進捗率 | `SELF_REPORTED` | 担当者申告値をそのまま使用。最も柔軟。デフォルト |

各ステータスでの実効進捗率の詳細（ステータステーブル・SELF_REPORTED補足ルール・計算例）は [02: EVM仕様書 section 4](./02-evm.md#4-進捗測定方式) を参照。

### 3.2 加重平均進捗率（`calculateWeightedAverageProgress`）

複数タスクの全体進捗率を算出する際は、**予定工数を重みとした加重平均**を使用する。

```
加重平均進捗率 = Σ(effectiveProgress_i × plannedHours_i) / Σ(plannedHours_i)
```

全タスクの予定工数合計が 0 の場合は 0 を返す。

**計算例（SELF_REPORTED、3タスク）:**

| タスク | ステータス | 申告進捗率 | 予定工数 | 実効進捗率 | 重み付き値 |
|--------|-----------|----------:|--------:|----------:|---------:|
| A | COMPLETED | 100% | 10h | 100% | 1000 |
| B | IN_PROGRESS | 50% | 20h | 50% | 1000 |
| C | NOT_STARTED | 0% | 30h | 0% | 0 |
| **合計** | | | **60h** | | **2000** |

加重平均 = 2000 / 60 ≈ **33.33%**

**3方式の比較（同じタスク構成）:**

```
SELF_REPORTED : (100*10 + 50*20 + 0*30) / 60 ≈ 33.33%
FIFTY_FIFTY   : (100*10 + 50*20 + 0*30) / 60 ≈ 33.33%  ← 偶然同値
ZERO_HUNDRED  : (100*10 +  0*20 + 0*30) / 60 ≈ 16.67%
```

**4タスクの統合例:**

| タスク | ステータス | 申告進捗率 | 予定工数 |
|--------|-----------|----------:|--------:|
| A | COMPLETED | 100% | 20h |
| B | COMPLETED | 100% | 30h |
| C | IN_PROGRESS | 60% | 40h |
| D | NOT_STARTED | 0% | 10h |

```
SELF_REPORTED : (100*20 + 100*30 + 60*40 + 0*10) / 100 = 74%
FIFTY_FIFTY   : (100*20 + 100*30 + 50*40 + 0*10) / 100 = 70%
ZERO_HUNDRED  : (100*20 + 100*30 +  0*40 + 0*10) / 100 = 50%
```

大小関係: `SELF_REPORTED > FIFTY_FIFTY > ZERO_HUNDRED`（進行中タスクが存在する場合）

---

## 4. 見通し計算方式

`ForecastCalculationService` の内部メソッド `calculateForecastHours`（`private static`）は、入力（`plannedHours`, `actualHours`, `effectiveProgressRate`）と選択された方式に基づき見通し工数を返す。外部からは公開メソッド `calculateTaskForecast`（タスク単体）/ `calculateMultipleTasksForecast`（複数タスク）経由で呼び出される。

### 4.1 方式一覧

| 方式 | 定数値 | 計算の特徴 |
|------|--------|----------|
| 保守的 | `conservative` | 実績ベースの外挿。現在のペースが続くと仮定 |
| 現実的 | `realistic` | 実績ベースと楽観ベースの加重平均。進捗率に応じてバランスを調整 |
| 楽観的 | `optimistic` | 残り工数は予定どおりに完了すると仮定 |
| 予定/実績優先 | `plannedOrActual` | 実績がなければ予定、実績があれば予定と実績の大きい方を採用 |

### 4.2 共通の境界条件（全方式共通、方式の分岐前に適用）

| 条件 | 返り値 | 理由 |
|------|--------|------|
| `effectiveProgressRate >= 100` | `actualHours` | 完了済みのため実績をそのまま返す |
| `effectiveProgressRate <= 0`（`plannedOrActual` を除く） | `plannedHours` | 進捗が計測されていないため予定工数を見通しとする |

### 4.3 conservative（保守的）

```
forecastHours = (actualHours / progressRate) × 100
```

- **意味**: 現在のペース（実績 ÷ 進捗率 = 1% あたりの工数）がそのまま続くと仮定した場合の完了時工数。
- **特性**: 実績が予定より多く消費されているほど大きな値を返す。リスク重視の見積もりに適する。
- `progressRate > 0` の場合のみ適用（= 0 のときは `plannedHours` を返す）。

**計算例:**
```
plannedHours=100, actualHours=30, progressRate=25%
=> (30 / 25) * 100 = 120h
```

### 4.4 optimistic（楽観的）

```
remainingWork   = (100 - progressRate) / 100
forecastHours   = actualHours + plannedHours × remainingWork
```

- **意味**: 残りの作業は予定工数比率どおりに完了すると仮定する。
- **特性**: 「実績は想定外のコスト増だが、残り作業は計画通り」という楽観的な想定。

**計算例:**
```
plannedHours=100, actualHours=30, progressRate=25%
remainingWork = 0.75
=> 30 + 100 * 0.75 = 105h
```

### 4.5 realistic（現実的）

保守的見通しと楽観的見通しを、**進捗率を重みとした加重平均**で合成する。

```
remainingWork        = (100 - progressRate) / 100
estimatedFromActual  = (actualHours / progressRate) × 100   ← 保守的見通し
remainingPlanned     = plannedHours × remainingWork          ← 残り予定工数

actualWeight         = progressRate / 100     ← 進捗率 = 実績への信頼度
plannedWeight        = 1 - actualWeight       ← 残り = 予定への信頼度

forecastHours = estimatedFromActual × actualWeight
              + (actualHours + remainingPlanned) × plannedWeight
```

- **意味**: 進捗が進むほど「実績ベースの外挿」の重みが増し、序盤は「予定ベース」を重視する。
- **特性**: プロジェクト初期は楽観的、後期は実績反映の保守的な値に自然に遷移する。

**計算例（progressRate=25%）:**
```
plannedHours=100, actualHours=30, progressRate=25%
estimatedFromActual = (30/25)*100 = 120
remainingPlanned    = 100 * 0.75 = 75
actualWeight = 0.25, plannedWeight = 0.75

forecastHours = 120 * 0.25 + (30 + 75) * 0.75
              = 30 + 78.75
              = 108.75h
```

**計算例（progressRate=80%）:**
```
plannedHours=100, actualHours=80, progressRate=80%
estimatedFromActual = (80/80)*100 = 100
remainingPlanned    = 100 * 0.20 = 20
actualWeight = 0.80, plannedWeight = 0.20

forecastHours = 100 * 0.80 + (80 + 20) * 0.20
              = 80 + 20
              = 100h
```

### 4.6 plannedOrActual（予定/実績優先）

実績の有無に応じてシンプルに切り替える方式。進捗率による分岐は行わない。

```
if actualHours <= 0:
    return plannedHours          # 未着手: 予定工数を見通しとする
elif plannedHours <= 0:
    return actualHours           # 予定なし: 実績工数を見通しとする
else:
    return max(actualHours, plannedHours)  # 両方ある: 大きい方を採用
```

- **意味**: 実績が存在する場合、予定と実績の大きい方（＝最悪ケース）を見通しとする。
- **特性**: 進捗率の精度に依存しないシンプルな方式。計画管理の初期段階や、進捗率の申告が信頼できない場合に有用。
- **評価順序**: 実装上、`progressRate >= 100`（完了済み → `actualHours`）の共通条件は `plannedOrActual` の分岐よりも**先に**評価される。一方 `progressRate <= 0` の共通条件は `plannedOrActual` の分岐の**後**に評価されるため、`plannedOrActual` には適用されない（上記の実績有無による分岐がそのまま使われる）。

### 4.7 定常タスクの見通し（進捗率非依存）

**定常タスク**（プロジェクト管理・進捗管理など、期間中ずっと一定工数を消費し「完了」概念を持たないタスク。[07: タスクスケジューリング §2](./07-task-scheduling.md) の定義と同一で、`isSteadyTask` によりタスク名がキーワードに部分一致するもの）は、上記4方式の前提である「進捗率＝完了までの距離」が成り立たない。そのため、`ForecastTaskInput.isSteady = true` のタスクは進捗率ベースの4方式を**適用せず**、稼働日数を基準にした専用方式（`SteadyTaskForecastService.calculateSteadyTaskForecast`）で算出する。

方式はプロジェクト設定 `schedulingSettings.steadyTaskForecastMode` で選択する（既定 `PLANNED`）。稼働日数は会社カレンダー（土日祝・会社休日を除外）で数える。

| モード | 見通し工数 | 日次消費ペース（見通しバー用） |
|------|-----------|--------------------------|
| `PLANNED`（予定ベース） | `max(予定, 実績)` | 予定 ÷ 総稼働日数 |
| `ACTUAL_PACE`（実績ペース・保守的） | `(実績 ÷ 経過稼働日数) × 総稼働日数` | 実績 ÷ 経過稼働日数 |
| `PLANNED_PACE`（予定ペース・楽観的） | `実績 + 残り稼働日数 × (予定 ÷ 総稼働日数)` | 予定 ÷ 総稼働日数 |

- **総稼働日数** = 予定期間 `[yoteiStart, yoteiEnd]` の稼働日数。**経過稼働日数** = `yoteiStart` 〜 `min(今日, yoteiEnd)` の稼働日数（`[0, 総稼働日数]` にクランプ）。
- **フォールバック**: 実績なし・経過0日・期間なし（総稼働日数0）等、算出に必要な情報が欠ける場合は `PLANNED`（`max(予定, 実績)`）に落とす。開始日基準の月別集計モード（`START_DATE_BASED`）は月別稼働日数を持たないため、定常タスクは常に `PLANNED` 相当で算出する。
- **不変条件**: いずれの方式でも `見通し ≥ 実績` を満たす（`ACTUAL_PACE`/`PLANNED_PACE` は経過 ≤ 総 により保証、`PLANNED` は `max` により保証）。
- **完了扱いの共通条件**: `isSteady` の分岐は `progressRate >= 100`（→ `actualHours`）の共通条件よりも**後**に評価される。よって完了済み（進捗100%）の定常タスクは実績工数を返す。

**計算例（予定100h・総稼働20日・経過8日・実績48h）:**

```
PLANNED      : max(100, 48) = 100h                （日次ペース 100/20 = 5h/日）
ACTUAL_PACE  : (48/8) × 20  = 120h                （日次ペース 48/8  = 6h/日）
PLANNED_PACE : 48 + (20-8) × (100/20) = 48+60 = 108h（日次ペース 5h/日）
```

**見通しバーの終了日**（ganttV3）: 定常タスクは残見通し（`見通し − 実績`）を上表の**日次消費ペース**で消化して終了日を求める（通常タスクの「標準稼働時間/日」ではなく）。`ACTUAL_PACE`/`PLANNED_PACE` では残見通し ÷ 日次ペース = 残り稼働日数（= 総 − 経過）となり、バーは概ね予定終了日付近に着地する。詳細は [07 §11](./07-task-scheduling.md) 及び `ForecastDateCalculationService`（`hoursPerDay` オプション）を参照。

---

## 5. realistic メソッドの加重平均の詳細

### weight 計算の意図

| 進捗率 | actualWeight | plannedWeight | 結果の特性 |
|:------:|:------------:|:-------------:|-----------|
| 0% | 0.00 | 1.00 | 完全に楽観ベース（予定工数のみ） |
| 25% | 0.25 | 0.75 | 予定重視（序盤） |
| 50% | 0.50 | 0.50 | 均等合成（中盤） |
| 75% | 0.75 | 0.25 | 実績重視（終盤） |
| 100% | ※共通条件で actualHours を返す | | 完了済み |

### 数値的性質

- `progressRate → 100%` のとき、`estimatedFromActual → actualHours`、`remainingPlanned → 0` となり、`forecastHours → actualHours`。
- 実績工数が予定どおりの場合（`actualHours = plannedHours × progressRate / 100`）、保守的見通し = 楽観的見通し = `plannedHours` となるため、`realistic` も `plannedHours` を返す。

---

## 6. 境界条件まとめ

| 条件 | 方式 | 返り値 | 根拠 |
|------|------|--------|------|
| `progressRate >= 100` | 全方式 | `actualHours` | 完了済み。実績が確定値 |
| `progressRate <= 0` | conservative / realistic / optimistic | `plannedHours` | 進捗未計測。予定工数が唯一の根拠 |
| `plannedHours = 0` かつ `actualHours > 0` | plannedOrActual | `actualHours` | 予定なし。実績を見通しとする |
| `actualHours <= 0` | plannedOrActual | `plannedHours` | 未着手。予定工数を見通しとする |
| `plannedHours = 0` かつ `actualHours = 0` | plannedOrActual | `0`（plannedHours） | 工数情報なし |
| `totalForecast = 0`（月別配分） | distributeForecastAcrossMonths | 各月 `monthlyActual`（実績を下回らない） | 既存実績を保持 |
| `totalForecast < totalActual`（月別配分） | distributeForecastAcrossMonths | 各月 `monthlyActual` | `remainingForecast = max(0, ...) = 0` により実績のみ |

---

## 7. 見通し工数の月別配分

`distributeForecastAcrossMonths` は、タスク単位の総見通し工数を月別に展開する純粋関数である。
入力は総見通し工数・月別予定工数・月別実績工数、出力は月別見通し工数マップ（`YYYY/MM` → 時間数）。

### 7.1 計算ロジック

```
totalActual       = Σ actualByMonth
totalPlanned      = Σ plannedByMonth
remainingForecast = max(0, totalForecast - totalActual)

// 各月の見通し工数:
forecastByMonth[m] = monthlyActual[m]
                   + (monthlyRatioSource[m] / totalRatioSource) × remainingForecast
```

### 7.3 配分比率の選定ロジック

残見通しを各月に按分する際の比率基準は以下の優先順で決定する:

1. **予定工数比率**（`totalPlanned > 0` の場合）: `plannedByMonth[m] / totalPlanned`
2. **実績工数比率**（`totalPlanned = 0` かつ `totalActual > 0` の場合）: `actualByMonth[m] / totalActual`
3. **比率なし**（予定も実績もない場合）: 比率 0 となり、結果は空 Map

### 7.4 不変条件

**`monthlyForecast[m] >= monthlyActual[m]`** — 各月の見通し工数は実績工数を必ず上回る（または等しい）。

- 各月の計算式が `monthlyActual + 非負の値` であるため、この不変条件は式の構造上自動的に保証される。

**`Σ monthlyForecast = max(totalForecast, totalActual)`**

- 完了タスク（`forecastHours = actualHours`）では `Σ = totalActual`。
- 進行中タスクでは `Σ = totalForecast`。

---

## 8. 計算例（テストコードからの抜粋）

### 8.1 月別配分 — 標準ケース

**条件:**
- 総見通し: 100h、総実績: 25h → 残見通し: 75h
- 月別予定: 1月 50h、2月 50h
- 月別実績: 1月 25h

**計算:**
```
1月: 25 + (50/100) × 75 = 25 + 37.5 = 62.5h
2月:  0 + (50/100) × 75 =  0 + 37.5 = 37.5h
合計: 100h = totalForecast ✓
```

### 8.2 月別配分 — 完了タスク（見通し = 実績）

**条件:**
- 予定: 1月 50h + 2月 50h
- 実績: 1月 30h + 2月 90h（合計 120h）
- 進捗 100% → `forecastHours = actualHours = 120h`

**計算:**
```
remainingForecast = max(0, 120 - 120) = 0
1月: 30 + 0 = 30h（= 月別実績）
2月: 90 + 0 = 90h（= 月別実績）
```

### 8.3 月別配分 — 予定外の月に実績が計上されるケース

**条件:**
- 予定: 1月のみ 50h
- 実績: 2月に 30h（予定期間外で作業）
- 総見通し: 80h → 残見通し: 50h

**計算:**
```
totalPlanned = 50（>0 なので予定比率を使用）
1月: 0  + (50/50) × 50 = 50h  ← 予定月に残見通しを全配分
2月: 30 + (0/50)  × 50 = 30h  ← 実績のみ（予定なしのため残見通しは配分されない）
```
不変条件確認: `30 >= 30` ✓

### 8.4 月別配分 — 総見通しが総実績を下回るケース

**条件:**
- 予定: 1月 50h
- 実績: 1月 60h + 2月 40h（合計 100h）
- 総見通し: 50h（実績 100h を下回る）

**計算:**
```
remainingForecast = max(0, 50 - 100) = 0
1月: 60 + 0 = 60h（= 月別実績）
2月: 40 + 0 = 40h（= 月別実績）
```
各月の見通し = 実績でクランプされる。

### 8.5 月別配分 — 予定ゼロかつ実績あり

**条件:**
- 予定: なし（空 Map）
- 実績: 1月 20h + 2月 30h（合計 50h）
- 総見通し: 100h → 残見通し: 50h

**計算:**
```
totalPlanned = 0 → 実績比率を使用
1月: 20 + (20/50) × 50 = 20 + 20 = 40h
2月: 30 + (30/50) × 50 = 30 + 30 = 60h
合計: 100h = totalForecast ✓
```

### 8.6 月別集計サマリ — 複数タスクの積み上げ

| タスク | 月 | 予定 | 実績 | 見通し |
|--------|------|-----:|-----:|-------:|
| タスクA | 2024/01 | 40h | 35h | 42h |
| タスクB | 2024/01 | 60h | 50h | 65h |
| タスクC | 2024/02 | 80h | 0h | 85h |

**集計結果（担当者「田中」）:**
```
2024/01 見通し合計: 42 + 65 = 107h
2024/02 見通し合計: 85h
担当者合計: 107 + 85 = 192h
全体合計: 192h
```

### 8.7 月別按分 — 見通し工数が設定されたタスクの按分

タスク期間が複数月にまたがる場合（例: 2024/01〜2024/03、見通し工数 120h）、`WorkingHoursAllocationService` により各月の営業日数比で按分され、合計が 120h となる。

```
totalAllocatedForecast = Σ allocatedForecastHours = 120h ✓
```

単月タスク（例: 2024/01/15〜2024/01/25、見通し工数 60h）の場合:
```
allocations[0].month = '2024/01'
allocations[0].allocatedForecastHours = 60h  ← 全量が1月に配分される
```

---

## 付録: 関連クラス一覧

| クラス/関数 | ファイル | 責務 |
| --- | --- | --- |
| `ForecastCalculationService` | `src/domains/forecast/forecast-calculation-service.ts` | 見通し工数の計算（通常4方式＋定常タスクの分岐） |
| `calculateSteadyTaskForecast` | `src/domains/forecast/steady-task-forecast-service.ts` | 定常タスクの見通し工数・日次消費ペースの計算（3モード） |
| `TaskProgressCalculator` | `src/domains/task/task-progress-calculator.ts` | 実効進捗率の計算・加重平均進捗率 |
| `distributeForecastAcrossMonths` | `src/applications/wbs/query/monthly-forecast-distributor.ts` | 見通し工数の月別配分 |
| `ForecastDateCalculationService` | `src/domains/forecast/forecast-date-calculation-service.ts` | 見通し終了日の算出（`hoursPerDay` で定常タスクの日次ペースに対応） |

---

## 付録: 関連画面一覧

| 画面名 | パス | 関連内容 |
| --- | --- | --- |
| WBS管理（サマリータブ） | `src/app/wbs/[id]/page.tsx` | タスク一覧および月別集計テーブル（`WbsSummaryTables` コンポーネント）の `forecastHours` 列に見通し工数を表示する |
