# EVM（Earned Value Management）仕様書

## 1. 概要

### EVMとは

EVM（Earned Value Management）は、プロジェクトの進捗をスケジュールとコストの両面から定量的に測定・管理する手法である。計画値（PV）・出来高（EV）・実績コスト（AC）の3つの基本指標を組み合わせることで、現時点のプロジェクト状態の把握と将来の完了時コスト・スケジュールの予測を可能にする。

### このシステムでの適用範囲

本システムでは、WBS（Work Breakdown Structure）単位でEVMを計算する。具体的には以下の機能を提供する。

- 任意の評価日時点でのEVMメトリクス（PV/EV/AC/BAC/SV/CV/SPI/CPI/EAC/ETC/VAC）の計算
- 工数ベース（hours）またはコストベース（cost）での計算モード切り替え
- 3種類の進捗測定方式（ZERO_HUNDRED / FIFTY_FIFTY / SELF_REPORTED）の選択
- 日次・週次・月次の時系列データ生成
- 将来日付への予測値の算出（`isPredicted` フラグ付き）
- プロジェクトのヘルス判定（healthy / warning / critical）

---

## 2. 用語定義

| 略語 | 正式名称 | 日本語名 | 定義 |
|------|----------|----------|------|
| PV | Planned Value | 計画価値 | 評価日時点までに計画された作業量（工数またはコスト）。予定スケジュールに基づく累計値 |
| PV_BASE | Planned Value (Base) | 基準計画価値 | 基準スケジュール（KIJUN期間）に基づいて計算したPV。変更前の当初計画値 |
| EV | Earned Value | 出来高 | 評価日時点で実際に完了した作業量を、計画単価で換算した値 |
| AC | Actual Cost | 実績コスト | 評価日時点までに実際に投入した工数またはコストの累計値 |
| BAC | Budget At Completion | 完了時予算 | プロジェクト全体の計画総工数またはコスト（バッファを含む） |
| SV | Schedule Variance | スケジュール差異 | EV - PV。正の値はスケジュール前倒し、負の値は遅延を示す |
| CV | Cost Variance | コスト差異 | EV - AC。正の値はコスト節約、負の値はコスト超過を示す |
| SPI | Schedule Performance Index | スケジュール効率指標 | EV / PV。1.0が計画通り、1.0超が前倒し、1.0未満が遅延 |
| CPI | Cost Performance Index | コスト効率指標 | EV / AC。1.0が計画通り、1.0超がコスト節約、1.0未満がコスト超過 |
| EAC | Estimate At Completion | 完了時総コスト予測 | 現在の実績をもとに予測した完了時の総コスト |
| ETC | Estimate To Complete | 完了までの残コスト予測 | 現時点から完了までに必要な残コスト予測 |
| VAC | Variance At Completion | 完了時差異予測 | BAC - EAC。完了時の予算に対する差異予測 |

---

## 3. 計算モード

計算モードは `'hours'`（工数）または `'cost'`（コスト）の2種類がある。

### 工数モード（`hours`）

- 全指標の単位は「時間（h）」
- PV/EV/AC/BACはすべて工数（時間数）で表現する
- 表示フォーマット: `{値.toFixed(1)}h`（例: `100.0h`、`44.4h`）

### コストモード（`cost`）

- 全指標の単位は「円（¥）」
- PV/EV は `plannedManHours × costPerHour × 進捗率` で算出する
- AC は実際の作業記録の `hours_worked × costPerHour` の累計で算出する
- BAC は `plannedManHours × costPerHour` の合計（バッファを加算）で算出する
- 表示フォーマット: `¥{値.toLocaleString()}`（例: `¥500,000`、`¥1,000,000`）

### デフォルト値

計算モードが未指定の場合は `'hours'` が使用される。

---

## 4. 進捗測定方式

進捗測定方式（`ProgressMeasurementMethod`）はEVおよびPVの計算に使用する進捗率の決定方法を制御する。WBSの設定（`projectSettings.progressMeasurementMethod`）で指定するか、API呼び出し時に引数で上書きできる。引数指定が設定より優先される。

### 4.1 ZERO_HUNDRED（0/100法）

**EV計算における進捗率:**

| タスクステータス | 進捗率 |
|-----------------|--------|
| NOT_STARTED | 0% |
| IN_PROGRESS | 0% |
| ON_HOLD | 0% |
| COMPLETED | 100% |

**PV計算（`getPlannedValueAtDate`）における挙動:**

| 評価日の位置 | 返却値 |
|-------------|--------|
| 評価日 < 開始日 | 0 |
| 開始日 <= 評価日 < 終了日 | 0（期間中は未完了とみなす） |
| 評価日 >= 終了日 | 計画工数全体（または計画コスト全体） |

**用途:** リスクを重視した保守的な進捗管理。確実な成果のみを評価する場合に適する。

### 4.2 FIFTY_FIFTY（50/50法）

**EV計算における進捗率:**

| タスクステータス | 進捗率 |
|-----------------|--------|
| NOT_STARTED | 0% |
| IN_PROGRESS | 50% |
| ON_HOLD | 0% |
| COMPLETED | 100% |

**PV計算（`getPlannedValueAtDate`）における挙動:**

| 評価日の位置 | 返却値 |
|-------------|--------|
| 評価日 < 開始日 | 0 |
| 開始日 <= 評価日 < 終了日 | 計画工数の50%（または計画コストの50%） |
| 評価日 >= 終了日 | 計画工数全体（または計画コスト全体） |

**用途:** バランス型の進捗管理。着手時に半分の価値を認める場合に適する。

### 4.3 SELF_REPORTED（自己申告進捗率）

**EV計算における進捗率:**

| 条件 | 進捗率 |
|------|--------|
| status = COMPLETED | 100%（申告値に関わらず） |
| `selfReportedProgress` が null でない | `selfReportedProgress` の値（0〜100にクランプ） |
| `selfReportedProgress` が null かつ IN_PROGRESS | 50%（フォールバック） |
| `selfReportedProgress` が null かつ NOT_STARTED / ON_HOLD | 0% |

`TaskEvmData.getProgressRate` では `selfReportedProgress ?? progressRate` を使用する（`selfReportedProgress` が null の場合は `progressRate` フィールドの値を使用）。

**PV計算（`getPlannedValueAtDate`）における挙動:**

SELF_REPORTED はPV計算においては LINEAR として扱われる（後述の LINEAR 按分計算と同一）。

### 4.4 LINEAR（PV専用の按分計算）

`getPlannedValueAtDate` の `progressMethod` 引数に指定できるPV専用の算出モード。EV計算には使用されない。

| 評価日の位置 | 返却値 |
|-------------|--------|
| 評価日 < 開始日 | 0 |
| 評価日 >= 終了日 | 計画工数全体（または計画コスト全体） |
| 開始日 <= 評価日 < 終了日 | `baseValue × (経過日数 / 総日数)` |

経過日数・総日数は `Math.floor((終了日時刻 - 開始日時刻) / (1000 * 60 * 60 * 24))` で計算する（整数日数）。開始日当日は経過0日のためPV=0となる。

---

## 5. 基本指標の計算式

### 5.1 SV（スケジュール差異）

```
SV = EV - PV
```

- SV > 0: スケジュール前倒し
- SV = 0: 計画通り
- SV < 0: スケジュール遅延

### 5.2 CV（コスト差異）

```
CV = EV - AC
```

- CV > 0: コスト節約
- CV = 0: 計画通り
- CV < 0: コスト超過

### 5.3 SPI（スケジュール効率指標）

```
SPI = EV / PV
```

**ゼロ除算時の挙動:** PV = 0 の場合、SPI = 0 を返す。

### 5.4 CPI（コスト効率指標）

```
CPI = EV / AC
```

**ゼロ除算時の挙動:** AC = 0 の場合、CPI = 0 を返す。

---

## 6. 予測指標の計算式

### 6.1 ETC（完了までの残コスト予測）

```
ETC = (BAC - EV) / CPI
```

**ゼロ除算時の挙動:** CPI = 0 の場合（AC = 0 のためCPIが0になるケース）、ETC = `Infinity` となる。

### 6.2 EAC（完了時総コスト予測）

```
EAC = AC + ETC
```

### 6.3 VAC（完了時差異予測）

```
VAC = BAC - EAC
```

VAC < 0 はコスト超過予測、VAC > 0 はコスト節約予測を意味する。

### 6.4 completionRate（完了率）

```
completionRate = (EV / BAC) × 100  [%]
```

**ゼロ除算時の挙動:** BAC = 0 の場合、completionRate = 0 を返す。

EV が BAC を超える場合（例: SPI > 1 で計画以上に作業が進んだ場合）、completionRate は 100% を超えることがある。

---

## 7. 将来予測アルゴリズム（`isPredicted = true`）

`getEvmTimeSeries` で `includePrediction = true` を指定した場合、評価日が現在時刻（`new Date()`）より未来の日付に対して予測値を計算し、`isPredicted = true` を付与する。過去・現在日付は通常の実績計算を使用し `isPredicted = false` となる。

### 予測EV

現在時点のEVに、将来のPV増加分にSPIを乗じた値を加算する。ただしBACを超えないよう上限をかける。

```
pvIncrement = max(0, 将来日付のPV - 現在時点のPV)
predictedEvIncrement = pvIncrement × SPI（現在時点）
predictedEV = min(BAC, 現在EV + predictedEvIncrement)
```

### 予測AC

現在時点のACに、EVの増加分をCPIで割った値を加算する。CPI = 0 の場合は CPI = 1（計画通りのコスト効率）と仮定して計算する。

```
effectiveCPI = (CPI == 0) ? 1 : CPI
evIncrement = max(0, predictedEV - 現在EV)
predictedAC = 現在AC + (evIncrement / effectiveCPI)
```

### 予測点のPV・PV_BASE・BAC

将来日付に対して通常通り `calculateCurrentEvmMetrics` を呼び出した結果の値をそのまま使用する。

---

## 8. ヘルス判定

`EvmMetrics.healthStatus` および `EvmService.getHealthStatus` で判定する。CPI と SPI の両方を評価する。

| 判定結果 | 条件 |
|---------|------|
| `healthy` | CPI >= 0.9 かつ SPI >= 0.9 |
| `warning` | CPI >= 0.8 かつ SPI >= 0.8（healthyの条件を満たさない場合） |
| `critical` | 上記のいずれにも該当しない（CPI < 0.8 または SPI < 0.8） |

### 境界値の挙動

| CPI | SPI | 判定 |
|-----|-----|------|
| 0.90 | 0.90 | healthy |
| 0.89 | 0.89 | warning |
| 0.80 | 0.80 | warning |
| 0.79 | 0.79 | critical |
| 1.00 | 0.70 | critical（SPIが0.8未満） |
| 0.70 | 1.00 | critical（CPIが0.8未満） |

---

## 9. バッファの取り扱い

WBSに設定されたバッファ（`WbsBuffer`）の工数は、BAC計算時に追加される。

### 工数モード（hours）

```
BAC = Σ(task.plannedManHours) + Σ(buffer.bufferHours)
```

### コストモード（cost）

```
BAC = Σ(task.plannedManHours × task.costPerHour) + Σ(buffer.bufferHours)
```

**注意:** コストモードにおいてもバッファは工数（時間数）のまま加算される。バッファ自体の単価換算は行わない。

### 具体例

- タスク: plannedManHours=100h、costPerHour=5000円/h
- バッファ: bufferHours=20h

| モード | BAC計算 | 結果 |
|--------|---------|------|
| hours | 100 + 20 | 120h |
| cost | (100 × 5000) + 20 | 500,020円 |

---

## 10. エッジケース一覧

| ケース | 挙動 |
|--------|------|
| PV = 0 | SPI = 0（ゼロ除算を回避） |
| AC = 0 | CPI = 0（ゼロ除算を回避） |
| CPI = 0 | ETC = Infinity（(BAC - EV) / 0）、EAC = AC + Infinity = Infinity |
| BAC = 0 | completionRate = 0（ゼロ除算を回避） |
| 全値ゼロ（PV=EV=AC=BAC=0） | SV=0、CV=0、SPI=0、CPI=0、completionRate=0 |
| actualStartDate = null | EV = 0（タスクが未着手とみなし出来高を計上しない） |
| 評価日 < actualStartDate | EV = 0（まだ開始されていないとみなす） |
| plannedManHours = 0 | EV = 0（計画工数が0のため出来高は常に0） |
| 評価日 < plannedStartDate | PV = 0（計画期間前のため計画価値なし） |
| 評価日 >= plannedEndDate | PV = 計画工数全体（計画期間を過ぎているため全額計上） |
| 開始日 = 終了日（同日タスク） | 評価日がその日付以降であればPV = 計画工数全体 |
| LINEAR法で開始日 = 評価日 | PV = 0（経過日数が0日のため） |
| EV > BAC | completionRate > 100%（上限なし） |
| 予測モードでCPI = 0 | effectiveCPI = 1 として予測AC計算（計画通りのコスト効率と仮定） |
| タスクなし（空WBS） | PV=0、EV=0、AC=0、BAC=0 |
| タスク設定の評価日を未指定 | `new Date()`（現在時刻）を使用 |

---

## 11. 計算例

以下はテストコードから抽出した具体的な計算例である。

### 11.1 基本指標（SV / CV / SPI / CPI）

**入力値:** PV=100、EV=80、AC=90、BAC=200

| 指標 | 計算式 | 結果 |
|------|--------|------|
| SV | 80 - 100 | -20（遅延） |
| CV | 80 - 90 | -10（コスト超過） |
| SPI | 80 / 100 | 0.80 |
| CPI | 80 / 90 | 0.889 |

**入力値:** PV=80、EV=100、AC=90、BAC=200（前倒しケース）

| 指標 | 計算式 | 結果 |
|------|--------|------|
| SV | 100 - 80 | +20（前倒し） |
| SPI | 100 / 80 | 1.25 |

**入力値:** PV=100、EV=100、AC=80、BAC=200（コスト効率良好ケース）

| 指標 | 計算式 | 結果 |
|------|--------|------|
| CV | 100 - 80 | +20（コスト節約） |
| CPI | 100 / 80 | 1.25 |

### 11.2 予測指標（ETC / EAC / VAC）

**入力値:** PV=100、EV=80、AC=90、BAC=200

```
CPI  = 80 / 90 ≈ 0.889
ETC  = (200 - 80) / 0.889 ≈ 135h
EAC  = 90 + 135 = 225h
VAC  = 200 - 225 = -25h（コスト超過予測）
completionRate = (80 / 200) × 100 = 40%
```

**入力値:** PV=100、EV=120、AC=90、BAC=200（CPI > 1）

```
CPI  = 120 / 90 ≈ 1.333
ETC  = (200 - 120) / 1.333 ≈ 60h
```

**入力値:** PV=100、EV=0、AC=90、BAC=200（CPI = 0）

```
CPI  = 0（AC != 0 だが EV = 0 のため）
ETC  = 200 / 0 = Infinity
```

**入力値:** PV=100、EV=220、AC=90、BAC=200（EV > BAC）

```
completionRate = (220 / 200) × 100 = 110%
```

### 11.3 TaskEvmData の出来高計算

**工数ベース（hours）:**

| 条件 | 計算式 | 結果 |
|------|--------|------|
| plannedManHours=100、progressRate=50% | 100 × 0.50 | 50h |
| plannedManHours=100、COMPLETED（ZERO_HUNDRED） | 100 × 1.00 | 100h |
| plannedManHours=100、IN_PROGRESS（FIFTY_FIFTY） | 100 × 0.50 | 50h |
| plannedManHours=100、selfReportedProgress=75%（SELF_REPORTED） | 100 × 0.75 | 75h |

**コストベース（cost）:**

| 条件 | 計算式 | 結果 |
|------|--------|------|
| plannedManHours=100、costPerHour=5000、progressRate=50% | 100 × 5000 × 0.50 | 250,000円 |
| plannedManHours=100、costPerHour=5000、IN_PROGRESS（FIFTY_FIFTY） | 100 × 5000 × 0.50 | 250,000円 |
| plannedManHours=100、costPerHour=5000、selfReportedProgress=75%（SELF_REPORTED） | 100 × 5000 × 0.75 | 375,000円 |

### 11.4 PV計算例（LINEAR / ZERO_HUNDRED / FIFTY_FIFTY）

**前提:** plannedStartDate=2025-01-01、plannedEndDate=2025-01-10（9日間）、plannedManHours=100h

| 評価日 | 方式 | 経過日数/総日数 | PV |
|--------|------|----------------|-----|
| 2024-12-31（開始前） | LINEAR | - | 0h |
| 2025-01-01（開始日） | LINEAR | 0/9 | 0h |
| 2025-01-02（翌日） | LINEAR（90h） | 1/9 | 10h |
| 2025-01-05（期間中） | LINEAR | 4/9 | 44.4h |
| 2025-01-06（期間中） | LINEAR（cost, 100h×5000） | 5/9 | 277,777円 |
| 2025-01-15（終了後） | LINEAR | - | 100h |
| 2025-01-05（期間中） | ZERO_HUNDRED | - | 0h |
| 2025-01-15（終了後） | ZERO_HUNDRED | - | 100h |
| 2025-01-05（期間中） | FIFTY_FIFTY | - | 50h |
| 2025-01-05（期間中） | FIFTY_FIFTY（cost, 100h×5000） | - | 250,000円 |
| 2025-01-05（期間中） | SELF_REPORTED（LINEAR扱い） | 4/9 | 44.4h |

### 11.5 EvmService での計算例（工数ベース、SELF_REPORTED）

**入力値:**
- タスク1: plannedManHours=100、IN_PROGRESS、progressRate=50%、期間 2025-01-01〜2025-01-10
- タスク2: plannedManHours=200、COMPLETED、progressRate=100%、期間 2025-01-01〜2025-01-10
- 評価日: 2025-01-05
- AC（作業記録）: 各日30h × 4日 = 120h合計

```
PV（LINEAR按分、4/9）:
  タスク1: 100 × (4/9) ≈ 44.4h
  タスク2: 200 × (4/9) ≈ 88.9h
  合計: ≈ 133.3h

EV（SELF_REPORTED）:
  タスク1: 100 × 0.50 = 50h
  タスク2: 200 × 1.00 = 200h
  合計: 250h

AC: 120h

BAC: 300h（バッファなし）
```

### 11.6 BAC計算例（バッファあり）

**工数モード:**
- totalPlannedManHours = 100h
- buffers: [20h, 30h]
- BAC = 100 + 20 + 30 = 150h

**コストモード:**
- タスク: plannedManHours=100、costPerHour=5000
- buffers: [20h]
- BAC = (100 × 5000) + 20 = 500,020円

### 11.7 AC計算例（統合テストより）

作業記録（WorkRecord）から以下のように実績コストを集計する。

**工数モード（hours）:**
- ユーザー1、設計タスク、2025-04-03: 8h
- ユーザー1、設計タスク、2025-04-04: 7.5h
- ユーザー2、実装タスク、2025-04-10: 6h
- 合計AC = 21.5h

**コストモード（cost）:**
- ユーザー1（costPerHour=5000）: 8h × 5000 + 7.5h × 5000 = 40,000 + 37,500 = 77,500円
- ユーザー2（costPerHour=8000）: 6h × 8000 = 48,000円
- 合計AC = 125,500円

### 11.8 進捗測定方式による EV の違い（統合テスト）

**タスク構成:**
- EVM-001（設計）: COMPLETED、plannedManHours=40h
- EVM-002（実装）: IN_PROGRESS、50%、plannedManHours=100h
- EVM-003（テスト）: NOT_STARTED、plannedManHours=60h

| 方式 | EVM-001 | EVM-002 | EVM-003 | 合計EV |
|------|---------|---------|---------|--------|
| ZERO_HUNDRED | 40h（100%） | 0h（0%） | 0h | 40h |
| FIFTY_FIFTY | 40h（100%） | 50h（50%） | 0h | 90h |
| SELF_REPORTED | 40h（100%） | 50h（50%） | 0h | 90h |

---

## 補足：進捗測定方式の優先順位

EVM計算における進捗測定方式の決定順序は以下の通り。

1. API呼び出し時の引数指定値（最優先）
2. WBSのプロジェクト設定（`progressMeasurementMethod`）
3. デフォルト値: `'SELF_REPORTED'`

## 付録: 関連クラス一覧

| クラス | ファイル | 責務 |
| --- | --- | --- |
| `EvmService` | `src/domains/evm/evm.service.ts` | EVM指標の計算・時系列データ生成 |
| `TaskEvmData` | `src/domains/evm/task-evm-data.ts` | タスク単位のEVM入力データ |
| `EvmMetrics` | `src/domains/evm/evm-metrics.ts` | 計算済みEVM指標の保持 |

---

## 付録: グラフ表示期間の決定ロジック

EVMダッシュボードの「プロジェクト全期間」モードにおける表示期間は、以下のように決定される。

```
表示開始日 = min(全タスクの計画開始日, 全タスクの実績開始日)
表示終了日 = max(全タスクの計画終了日, 全タスクの実績終了日)
```

- **計画開始日**: `TaskEvmData.plannedStartDate`（予定期間の開始日）
- **実績開始日**: `TaskEvmData.actualStartDate`（作業記録の最小日付。null のタスクは除外）
- **計画終了日**: `TaskEvmData.plannedEndDate`（予定期間の終了日）
- **実績終了日**: `TaskEvmData.actualEndDate`（作業記録の最大日付。null のタスクは除外）

これにより、計画期間外に発生した実績（AC/EV）もグラフ上に表示される。タスクが0件の場合は、過去3ヶ月〜現在日にフォールバックする。

その他の期間モード:

| モード | 期間 |
|--------|------|
| 過去3ヶ月 | 現在日の3ヶ月前〜現在日 |
| 過去1ヶ月 | 現在日の1ヶ月前〜現在日 |

---

## 付録: 関連画面一覧

| 画面名 | パス | 関連内容 |
| --- | --- | --- |
| WBS管理（EVMタブ） | `src/app/wbs/[id]/page.tsx` | PV / EV / AC / SPI / CPI などの EVM 指標をグラフ・テーブルで表示する（`EvmDashboard` コンポーネント）。進捗測定方式はプロジェクト設定から取得する |
