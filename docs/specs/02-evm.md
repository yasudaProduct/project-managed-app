# EVM（Earned Value Management）仕様書

## 1. 概要

### EVMとは

EVM（Earned Value Management）は、プロジェクトの進捗をスケジュールとコストの両面から定量的に測定・管理する手法である。計画値（PV）・出来高（EV）・実績コスト（AC）の3つの基本指標を組み合わせることで、現時点のプロジェクト状態の把握と将来の完了時コスト・スケジュールの予測を可能にする。

### このシステムでの適用範囲

本システムでは、WBS（Work Breakdown Structure）単位でEVMを計算する。具体的には以下の機能を提供する。

- 任意の評価日時点でのEVMメトリクス（PV/EV/AC/BAC/SV/CV/SPI/CPI/EAC/ETC/VAC）の計算
- 工数ベース（hours）またはコストベース（cost）での計算モード切り替え
- 3種類の進捗測定方式（ZERO_HUNDRED / FIFTY_FIFTY / SELF_REPORTED）の選択
- 3種類のEAC/ETC予測計算方式（CPI_ONLY / CPI_SPI / PLANNED）の選択
- 日次・週次・月次の時系列データ生成
- 将来日付への予測値の算出（`isPredicted` フラグ付き）と予測完了日（Earned Schedule）の推定
- 進捗スナップショット履歴に基づく過去日メトリクス（PV/EV/BAC）のas-of再構築
- ソフトデリート済みタスクの実績も含めた累積AC計算
- プロジェクトのヘルス判定（healthy / warning / critical / no_data。しきい値はプロジェクト設定で変更可能）
- フェーズ別・担当者別のEVM内訳（現在時点）
- PVの営業日按分（プロジェクト設定で選択。既定は暦日按分）
- 時系列・タスク別詳細のCSVエクスポート

---

## 2. 用語定義

| 略語 | 正式名称 | 日本語名 | 定義 |
|------|----------|----------|------|
| PV | Planned Value | 計画価値 | 評価日時点までに計画された作業量（工数またはコスト）。予定スケジュールに基づく累計値 |
| PV_BASE | Planned Value (Base) | 基準計画価値 | 基準スケジュール（KIJUN期間）に基づいて計算したPV。変更前の当初計画値 |
| EV | Earned Value | 出来高 | 評価日時点で実際に完了した作業量を、計画単価で換算した値 |
| AC | Actual Cost | 実績コスト | 評価日時点までに実際に投入した工数またはコストの累計値 |
| BAC | Budget At Completion | 完了時予算 | プロジェクト全体の基準総工数またはコスト（バッファを含む）。基準（KIJUN）未設定タスクは予定工数にフォールバックする |
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
- BAC は `baseManHours × costPerHour` の合計（バッファを加算）で算出する
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

**営業日按分（`evmPvDistribution = BUSINESS_DAYS`）:** プロジェクト設定で営業日按分を選択した場合、経過日数・総日数を **土日・日本の祝日・会社休日を除いた営業日数** で計算する（判定は `CompanyCalendar` を再利用）。既定は `CALENDAR`（暦日按分、従来動作）。

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

**未定義時の挙動:** PV = 0 の場合、SPI = `null` を返す（「進捗ゼロ」との区別。画面では「—」表示）。

### 5.4 CPI（コスト効率指標）

```
CPI = EV / AC
```

**未定義時の挙動:** AC = 0 の場合、CPI = `null` を返す（実績未投入で算出不能。画面では「—」表示）。

---

## 6. 予測指標の計算式

### 6.1 ETC（完了までの残コスト予測）

ETC は予測計算方式（`EvmForecastMethod`）によって算出式が切り替わる。方式はWBSのプロジェクト設定（`projectSettings.evmForecastMethod`）で指定するか、API呼び出し時に引数で上書きできる。引数指定が設定より優先される。デフォルトは `CPI_ONLY`。

| 方式 | 定数値 | ETC計算式 | 意味 |
|------|--------|-----------|------|
| CPI法 | `CPI_ONLY`（デフォルト） | `max(0, BAC - EV) / CPI` | 現在のコスト効率が今後も継続すると仮定 |
| CPI×SPI法 | `CPI_SPI` | `max(0, BAC - EV) / (CPI × SPI)` | スケジュール遅延もコストに反映 |
| 計画法 | `PLANNED` | `max(0, BAC - EV)` | 残りの作業は計画通りのコストで完了すると仮定 |

**下限クランプ:** EV > BAC の場合（予定工数が基準を超えて増えた場合等）でも残作業は負にならないため、いずれの方式でも ETC は 0 を下限とする（負値を返さない）。

**未定義（null）とゼロの扱い:**

- SPI/CPI が `null`（PV/AC未発生で未定義）の場合、その係数は **1（計画通り）とみなして** 計算する。
  - `CPI_ONLY`: CPI = null → ETC = max(0, BAC - EV)（PLANNED式と同値）
  - `CPI_SPI`: `(CPI ?? 1) × (SPI ?? 1)` で計算
- CPI = 0（AC > 0 で EV = 0）の場合、効率が算出不能のため ETC = `0` を返す（従来通り）。
- `CPI_SPI` で係数積が 0 の場合も ETC = `0` を返す。
- `PLANNED`: 除算を行わないためゼロ除算は発生しない。

> **補足:** 計算方式の選択肢・ラベル・説明は `src/types/evm-forecast-method.ts` に定義されている（Prismaの `EvmForecastMethod` enum に対応）。

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

現在時点のEVに、将来のPV増加分にSPIを乗じた値を加算する。ただしBACを超えないよう上限をかける。SPIが未定義（null）の場合は 1（計画通り）とみなす。

```
pvIncrement = max(0, 将来日付のPV - 現在時点のPV)
predictedEvIncrement = pvIncrement × (SPI ?? 1)（現在時点）
predictedEV = min(BAC, 現在EV + predictedEvIncrement)
```

### 予測AC

現在時点のACに、EVの増加分をCPIで割った値を加算する。CPI = 0 または null の場合は CPI = 1（計画通りのコスト効率）と仮定して計算する。

```
effectiveCPI = (CPI == 0 || CPI == null) ? 1 : CPI
evIncrement = max(0, predictedEV - 現在EV)
predictedAC = 現在AC + (evIncrement / effectiveCPI)
```

### 予測点のPV・PV_BASE・BAC

将来日付に対して通常通り `calculateCurrentEvmMetrics` を呼び出した結果の値をそのまま使用する。

### 予測完了日（Earned Schedule）と予測線の延長

`getEvmDashboardData` はEarned Schedule法によるスケジュール予測（`scheduleForecast`）を返す。

```
ES   = PV曲線上で現在EVと同額に達する経過日数（日単位の二分探索＋隣接日の線形補間）
AT   = プロジェクト開始からの実経過日数
SPIt = ES / AT（時間ベースのスケジュール効率）
予測完了日 = 開始日 + 計画総日数 / SPIt（過去日になる場合は現在日にクランプ）
遅延日数   = ceil(予測完了日 - 計画終了日)（負値は前倒し）
```

状態（`status`）:

| 状態 | 条件 |
|------|------|
| `ok` | 予測完了日を算出できた |
| `no_plan` | タスクなし、または総PV = 0 |
| `not_started` | プロジェクト開始前（AT <= 0） |
| `no_progress` | EV <= 0 で予測不能 |
| `completed_scope` | EV >= 総PV（全量完了。予測完了日 = 現在日） |

**予測線の延長:** 表示期間モードが「プロジェクト全期間」かつ予測ONのとき、予測線を計画終了日以降、予測完了日まで延長する。EVは計画終了日時点の予測EVからBACへ線形に増加し、ACはCPI（未定義/0は1）で追随、PV/PV_BASEは計画期間後のため全額フラット。表示の暴走を防ぐため、延長は「開始日から計画期間の2倍」の時点で打ち切る（打ち切り時はEVがBAC未到達のまま線が終わる）。

---

## 8. ヘルス判定

`EvmMetrics.healthStatus` および `EvmService.getHealthStatus` で判定する。CPI と SPI のうち **定義されている指標のみ** を評価する。

| 判定結果 | 条件 |
|---------|------|
| `healthy` | 定義済み指標がすべて healthyしきい値（既定0.9）以上 |
| `warning` | 定義済み指標がすべて warningしきい値（既定0.8）以上（healthyの条件を満たさない場合） |
| `critical` | 上記のいずれにも該当しない |
| `no_data` | SPI・CPIとも `null`（開始前・実績未投入）。画面ではグレーバッジ「開始前」 |

しきい値はプロジェクト設定（`evmHealthyThresholdPct` / `evmWarningThresholdPct`、既定90/80）で変更できる。片方の指標のみ `null` の場合は、残る指標だけで判定する。

### 境界値の挙動（既定しきい値 0.9 / 0.8）

| CPI | SPI | 判定 |
|-----|-----|------|
| 0.90 | 0.90 | healthy |
| 0.89 | 0.89 | warning |
| 0.80 | 0.80 | warning |
| 0.79 | 0.79 | critical |
| 1.00 | 0.70 | critical（SPIが0.8未満） |
| 0.70 | 1.00 | critical（CPIが0.8未満） |
| null | null | no_data |
| null | 0.95 | healthy（SPIのみで判定） |

---

## 9. バッファの取り扱い

WBSに設定されたバッファ（`WbsBuffer`）の工数は、BAC計算時に追加される。

BACのタスク側の値は **基準工数（`baseManHours`、KIJUN）** を用いる。基準（KIJUN）が未設定のタスク（画面からの作成等）は、**予定工数（`plannedManHours`、YOTEI）にフォールバック**してBACに計上する（基準日付も同様に予定日付へフォールバック）。KIJUN期間が存在して工数が0の場合はフォールバックせず、明示的な基準0として扱う。

### 工数モード（hours）

```
BAC = Σ(task.baseManHours) + Σ(buffer.bufferHours)
```

### コストモード（cost）

```
BAC = Σ(task.baseManHours × task.costPerHour) + バッファの金額換算
```

バッファの金額換算はプロジェクト設定（`evmBufferCostMethod`）で選択する。

| 方式 | 定数値 | 換算 |
|------|--------|------|
| WBS平均単価（デフォルト） | `AVERAGE_RATE` | WBS担当者の単価平均 × バッファ時間（担当者未登録時はデフォルト単価¥5,000） |
| デフォルト単価 | `DEFAULT_RATE` | ¥5,000 × バッファ時間 |
| 含めない | `EXCLUDE` | 0（金額モードのBACにバッファを算入しない） |

### 具体例

- タスク: baseManHours=100h、costPerHour=5000円/h
- バッファ: bufferHours=20h、WBS平均単価=6000円/h

| モード | 方式 | BAC計算 | 結果 |
|--------|------|---------|------|
| hours | -（常に時間加算） | 100 + 20 | 120h |
| cost | AVERAGE_RATE | (100 × 5000) + (20 × 6000) | 620,000円 |
| cost | DEFAULT_RATE | (100 × 5000) + (20 × 5000) | 600,000円 |
| cost | EXCLUDE | (100 × 5000) | 500,000円 |

---

## 10. エッジケース一覧

| ケース | 挙動 |
|--------|------|
| PV = 0 | SPI = null（未定義。画面では「—」） |
| AC = 0 | CPI = null（未定義。画面では「—」）。ETCは係数1（計画通り）とみなして計算 |
| CPI = 0（AC>0、EV=0） | ETC = 0（効率算出不能）、EAC = AC + 0 = AC |
| CPI × SPI = 0（CPI_SPI） | ETC = 0（ゼロ除算を回避）、EAC = AC |
| BAC = 0 | completionRate = 0（ゼロ除算を回避） |
| 全値ゼロ（PV=EV=AC=BAC=0） | SV=0、CV=0、SPI=null、CPI=null、completionRate=0、healthStatus=no_data |
| SPI・CPIとも null | healthStatus = no_data（「開始前」表示。従来はcritical表示だった） |
| actualStartDate = null | EV = 0（タスクが未着手とみなし出来高を計上しない） |
| 評価日 < actualStartDate | EV = 0（まだ開始されていないとみなす） |
| plannedManHours = 0 | EV = 0（計画工数が0のため出来高は常に0） |
| 評価日 < plannedStartDate | PV = 0（計画期間前のため計画価値なし） |
| 評価日 >= plannedEndDate | PV = 計画工数全体（計画期間を過ぎているため全額計上） |
| 開始日 = 終了日（同日タスク） | 評価日がその日付以降であればPV = 計画工数全体 |
| LINEAR法で開始日 = 評価日 | PV = 0（経過日数が0日のため） |
| EV > BAC | completionRate > 100%（上限なし）。ETC = 0（残作業を0とみなす）、EAC = AC |
| 基準（KIJUN）未設定タスク | 予定値をベースラインとして扱う（BAC・PV_BASEに予定工数・予定日付で計上） |
| タスク未紐付けの実績（taskId = null、wbsId紐付けあり） | ACに含まれる（Geppo未マッチ・タスク物理削除後の実績も計上） |
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

以下の例はいずれもデフォルトの予測計算方式 `CPI_ONLY`（`ETC = (BAC - EV) / CPI`）を前提とする。

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

**入力値:** PV=100、EV=0、AC=90、BAC=200（CPI = 0、方式: CPI_ONLY）

```
CPI  = 0（AC != 0 だが EV = 0 のため）
ETC  = 0（ゼロ除算を回避し 0 を返す）
EAC  = 90 + 0 = 90h
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
- totalBaseManHours = 100h
- buffers: [20h, 30h]
- BAC = 100 + 20 + 30 = 150h

**コストモード:**
- タスク: baseManHours=100、costPerHour=5000
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
| `EvmService` | `src/applications/evm/evm-service.ts` | EVM指標の計算・時系列データ生成・累積AC計算・スナップショットによる過去メトリクス再構築 |
| `TaskEvmData` | `src/domains/evm/task-evm-data.ts` | タスク単位のEVM入力データ・PV/EV計算 |
| `EvmMetrics` | `src/domains/evm/evm-metrics.ts` | 計算済みEVM指標の保持・派生指標（SV/CV/SPI/CPI/EAC/ETC/VAC）の算出 |
| `EvmForecastMethod` | `src/types/evm-forecast-method.ts` | EAC/ETC予測計算方式の型定義・ラベル・説明 |
| `IWbsEvmRepository` | `src/applications/evm/iwbs-evm-repository.ts` | WBSデータ・実績コスト・進捗スナップショットの取得インターフェース |

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

## 付録: 累積AC計算（ソフトデリート済みタスクの取り扱い）

ACは作業記録（WorkRecord）を日付昇順に累積して算出する。`EvmService` では累積ACの下限を **エポック（`new Date(0)`）** から取得する。

```
actualCostMap = getActualCostByDate(wbsId, new Date(0), evaluationDate, calculationMode)
AC（評価日時点） = Σ（evaluationDate 以前の日付の実績コスト）
```

**ソフトデリート済みタスクの早期実績:**

取得下限をアクティブタスクの開始日で切らないため、後からソフトデリート（論理削除）されたタスクが残した早期の作業実績も累積ACに含まれる。これにより、削除済みタスクへ投入された実績コストが見かけ上消えてしまうことを防ぎ、実際の投入コストを正しく反映する。

**タスク未紐付け実績の取り込み:**

作業記録の検索条件は「タスク経由（`task.wbsId`）」と「作業記録自身の `wbsId` 直接紐付け」の OR で行う。これにより、Geppoインポート時にタスクへマッチしなかった実績（`taskId = null`）や、全量置換同期でタスクが物理削除され `taskId` が NULL 化された実績も、`wbsId` が付与されていれば累積ACに含まれる。

> 時系列計算では、全期間の作業記録を1回だけ取得して評価日ごとの累積ACを返すクロージャ（`buildCumulativeAcFn`）を構築し、各評価日で日付キーが評価日以前のものを合算する。

---

## 付録: スナップショット履歴による過去メトリクスのas-of再構築

時系列の過去〜現在区間（`isPredicted = false`）では、進捗スナップショット履歴（`TaskProgressSnapshotRecord`）を用いて、各評価日時点の **確定済み進捗** から PV / PV_BASE / EV / BAC を再構築する（`buildAsOfMetricsFn`）。

| 状況 | 挙動 |
|------|------|
| 評価日時点で有効なスナップショットが存在する | そのスナップショットの確定進捗を直接使用（`getEarnedValueDirect`）。提案Cの按分は通さない |
| スナップショットが tombstone（`isRemoved = true`） | そのタスクの寄与を0とする（以降は計上しない） |
| スナップショットが未蓄積の区間（最初のスナップショットより前） | ライブタスクのデータでフォールバック計算する（現行の `computeMetricsFromData` と同一の結果） |
| スナップショットが空（履歴なし） | 全タスク・全評価日がフォールバックとなり、結果は現行計算と一致する |

- 各タスクについて「評価日の終了時刻（翌日00:00ローカル）未満の最新スナップショット」をas-of解決する。
- ACはスナップショットではなく前述の累積AC（作業記録ベース）を使用する。

---

## 付録: フェーズ別・担当者別内訳

EVMダッシュボードの「内訳」タブで、現在時点のPV/EV/AC/BAC/SPI/CPIをフェーズ別・担当者別に表示する。

- 集計対象は **ライブタスク × 現在時点** のみ（スナップショットにフェーズ/担当者情報が無いため過去日のas-of内訳は算出しない）
- 担当者軸は **タスクの現担当者**（作業実績の記録者ではない）
- グルーピングキーはID（同名フェーズ・同姓同名の衝突回避）。フェーズ未設定は「未分類」、担当者未設定は「未割当」
- タスク未紐付け実績（taskId=null）とライブタスクに存在しないtaskId（削除済み）のACは「未紐付け・削除済み」行へ合算し、**内訳のAC合計 = 全体AC** を維持する（この行のSPI/CPIはnull）
- バッファはグループBACに含めない（カードのBACとは一致しない。UIに注記あり）

---

## 付録: EVM関連プロジェクト設定一覧

| 設定 | 型 / 既定値 | 用途 |
|------|------------|------|
| `progressMeasurementMethod` | enum / SELF_REPORTED | 進捗測定方式（4章） |
| `evmForecastMethod` | enum / CPI_ONLY | EAC/ETC予測方式（6章） |
| `evmBufferCostMethod` | enum / AVERAGE_RATE | バッファの金額換算方式（9章） |
| `evmPvDistribution` | enum / CALENDAR | PV按分方式（暦日/営業日、4.4） |
| `evmHealthyThresholdPct` | Int / 90 | ヘルス判定healthyしきい値（8章） |
| `evmWarningThresholdPct` | Int / 80 | ヘルス判定warningしきい値（8章） |

---

## 付録: 関連画面一覧

| 画面名 | パス | 関連内容 |
| --- | --- | --- |
| プロジェクト管理（EVMタブ） | `src/app/projects/[id]/page.tsx` | `WbsManagementContent` を `showEvm={true}` で表示し、`EvmDashboard`（`src/components/evm/evm-dashboard.tsx`）で PV / EV / AC / SPI / CPI などの EVM 指標をグラフ・テーブルで表示する。進捗測定方式・予測計算方式はプロジェクト設定から取得する |

> **補足:** WBS管理画面（`src/app/wbs/[id]/page.tsx`）は `showEvm={false}` で表示されるため、EVMダッシュボードは描画されない。EVM指標の表示はプロジェクト管理画面側で行われる。データ取得は Server Action `getEvmDashboardData`（`src/app/actions/evm/evm-actions.ts`）経由で `EvmService.getEvmDashboardData` を呼び出す。
