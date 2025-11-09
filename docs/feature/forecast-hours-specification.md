# 見通し工数算出機能 仕様書

## 1. 概要

### 1.1 目的
プロジェクト管理において、タスクの現在の進捗状況を基に将来の工数を予測する「見通し工数」を算出し、より正確なスケジュール管理と工数管理を支援する機能。

### 1.2 スコープ
- ✅ タスクレベルでの見通し工数算出
- ✅ 月別・担当者別集計での見通し工数表示
- ✅ 複数の算出方式（conservative, realistic, optimistic）
- ✅ UI上での表示切り替え機能
- ⏳ 基準工数との比較機能（部分実装）

### 1.3 用語定義
- **見通し工数（Forecast Hours）**: 現時点での最終的な工数予測値
- **予定工数（Planned Hours）**: プロジェクト開始時に計画された工数
- **実績工数（Actual Hours）**: 現時点までに実際に消費された工数
- **基準工数（Baseline Hours）**: プロジェクト承認時の基準となる工数（現状は予定工数で代用）
- **進捗率（Progress Rate）**: タスクの完了度合い（0-100%）

## 2. 算出ロジック

### 2.1 基本方針
タスクのステータスと進捗率に応じて、以下の優先順位で見通し工数を算出する：

| タスクステータス | 進捗率 | 見通し工数 |
|----------------|-------|-----------|
| COMPLETED | 100% (固定) | 実績工数 |
| IN_PROGRESS | データベース値 | 計算式による算出 |
| NOT_STARTED | 0% | 予定工数 |
| ON_HOLD | 0% | 予定工数 |

**重要**: 完了ステータスのタスクは、データベースの進捗率に関わらず100%として扱う。

### 2.2 計算方式

#### 2.2.1 保守的方式（Conservative）
実績ベースの推定を行い、リスクを重視した見通しを算出。

```typescript
見通し工数 = (実績工数 / 進捗率) × 100
```

**特徴**:
- 現在の実績ペースがそのまま続くと仮定
- 進捗が遅れている場合、大きな値となる
- リスク管理重視のプロジェクトに適する

**例**:
- 予定工数: 40時間
- 実績工数: 30時間
- 進捗率: 50%
- 見通し工数: (30 / 50) × 100 = **60時間**

#### 2.2.2 現実的方式（Realistic）- 推奨
実績ベースと予定ベースの加重平均により、バランスの取れた見通しを算出。

```typescript
実績ベース見通し = (実績工数 / 進捗率) × 100
残り予定工数 = 予定工数 × (100 - 進捗率) / 100

実績重み = 進捗率 / 100
予定重み = 1 - 実績重み

見通し工数 = 実績ベース見通し × 実績重み
           + (実績工数 + 残り予定工数) × 予定重み
```

**特徴**:
- 進捗率が高いほど実績ベースの重みが増加
- 進捗率が低い段階では予定工数を重視
- 最もバランスの取れた予測

**例**:
- 予定工数: 40時間
- 実績工数: 30時間
- 進捗率: 50%
- 実績ベース: (30 / 50) × 100 = 60時間
- 残り予定: 40 × 0.5 = 20時間
- 見通し工数: 60 × 0.5 + (30 + 20) × 0.5 = **55時間**

#### 2.2.3 楽観的方式（Optimistic）
予定工数を基準とし、残り作業は予定通り完了すると仮定。

```typescript
残り予定工数 = 予定工数 × (100 - 進捗率) / 100
見通し工数 = 実績工数 + 残り予定工数
```

**特徴**:
- 残り作業は予定通り完了すると楽観視
- 順調に進んでいるプロジェクトに適する
- 最も小さな値となる傾向

**例**:
- 予定工数: 40時間
- 実績工数: 30時間
- 進捗率: 50%
- 残り予定: 40 × 0.5 = 20時間
- 見通し工数: 30 + 20 = **50時間**

### 2.3 特殊ケースの処理

#### 2.3.1 進捗率0%の場合
```typescript
見通し工数 = 予定工数
```
未着手のため、予定工数をそのまま見通しとする。

#### 2.3.2 進捗率100%の場合
```typescript
見通し工数 = 実績工数
```
完了済みのため、実績工数が確定値となる。

#### 2.3.3 実績が存在するが進捗率0%の場合
```typescript
// 注意: 実績入力があっても申告進捗が0%の場合は予定工数を返す
見通し工数 = 予定工数
```
これは設計上の仕様であり、進捗率の申告が優先される。

## 3. 進捗測定方式（Progress Measurement Method）

### 3.1 概要
プロジェクト設定により、タスクの進捗率をどのように測定するかを3つの方式から選択できます。この設定は見通し工数算出だけでなく、EVM（Earned Value Management）などの他の機能でも共通して使用されます。

### 3.2 3つの測定方式

#### 3.2.1 0/100法（ZERO_HUNDRED）
**完了のみを評価する保守的な方式**

| ステータス | 進捗率 |
|-----------|-------|
| NOT_STARTED | 0% |
| IN_PROGRESS | 0% |
| ON_HOLD | 0% |
| COMPLETED | 100% |

**特徴**:
- 確実な成果のみを評価
- リスク管理重視のプロジェクトに適する
- EVMの保守的な進捗管理

**適用例**:
```typescript
// 進行中のタスクでも0%として扱う
タスクステータス: IN_PROGRESS
自己申告進捗率: 75%（無視される）
実効進捗率: 0%
```

#### 3.2.2 50/50法（FIFTY_FIFTY）
**着手時に半分の価値を認めるバランス型**

| ステータス | 進捗率 |
|-----------|-------|
| NOT_STARTED | 0% |
| IN_PROGRESS | 50% |
| ON_HOLD | 0% |
| COMPLETED | 100% |

**特徴**:
- 着手時点での貢献を評価
- 作業開始のモチベーション向上
- EVMのバランス型進捗管理

**適用例**:
```typescript
// 進行中は一律50%
タスクステータス: IN_PROGRESS
自己申告進捗率: 75%（無視される）
実効進捗率: 50%
```

#### 3.2.3 自己申告進捗率（SELF_REPORTED）- デフォルト
**タスクの進捗率フィールドを使用する詳細管理方式**

| ステータス | 進捗率 |
|-----------|-------|
| NOT_STARTED | 0% |
| IN_PROGRESS | wbs_task.progress_rate（0-100%） |
| ON_HOLD | 0% |
| COMPLETED | 100%（優先） |

**特徴**:
- 最も柔軟で詳細な進捗管理
- 担当者の申告値を使用
- 完了ステータスは100%優先（データ整合性のため）

**適用例**:
```typescript
// 自己申告値を使用
タスクステータス: IN_PROGRESS
自己申告進捗率: 75%
実効進捗率: 75%

// 完了は100%優先
タスクステータス: COMPLETED
自己申告進捗率: 80%（無視される）
実効進捗率: 100%
```

### 3.3 プロジェクト設定

進捗測定方式はプロジェクトごとに設定します。

**データベース構造**:
```sql
-- project_settings テーブル
progressMeasurementMethod ENUM('ZERO_HUNDRED', 'FIFTY_FIFTY', 'SELF_REPORTED')
DEFAULT 'SELF_REPORTED'
```

**設定の取得**:
```typescript
const settings = await prisma.projectSettings.findUnique({
  where: { projectId: query.projectId }
});
const progressMeasurementMethod = settings?.progressMeasurementMethod || 'SELF_REPORTED';
```

### 3.4 実装アーキテクチャ

進捗率計算はドメイン層の`TaskProgressCalculator`で一元管理されます。

```
Domain Layer
  └─ TaskProgressCalculator
      ├─ calculateEffectiveProgress()     // 実効進捗率計算
      ├─ calculateZeroHundred()           // 0/100法
      ├─ calculateFiftyFifty()            // 50/50法
      ├─ calculateSelfReported()          // 自己申告進捗率
      └─ calculateWeightedAverageProgress() // 加重平均進捗率（EVM用）

Application Layer
  └─ ForecastCalculationService
      └─ calculateTaskForecast()          // TaskProgressCalculatorを使用
```

### 3.5 使用箇所

進捗測定方式は以下の機能で使用されます：

- ✅ **見通し工数算出**: ForecastCalculationService
- ⏳ **EVM計算**: 計画中（SPI、CPI計算に使用）
- ⏳ **進捗レポート**: 計画中（全体進捗率計算に使用）

## 4. 月別配分における見通し算出

### 4.1 基本方針
営業日案分モードにおいて、タスク全体の見通し工数を各月に配分する。

### 4.2 配分ロジック

#### 4.2.1 タスク全体の見通し工数計算
```typescript
// ForecastCalculationService で計算
const forecastResult = ForecastCalculationService.calculateTaskForecast(
  task,
  { method: 'realistic' }
);
const totalForecastHours = forecastResult.forecastHours;
```

#### 4.2.2 月別見通し工数の按分
```typescript
// 予定工数の配分比率を使用
const totalPlannedHours = allocation.getTotalPlannedHours();
const monthlyPlannedHours = allocation.getAllocation(yearMonth).plannedHours;

const monthForecastHours = totalPlannedHours > 0
  ? (monthlyPlannedHours / totalPlannedHours) × totalForecastHours
  : 0;
```

**配分ロジックの例**:
```
タスク: 2025/01 ~ 2025/03 (3ヶ月)
予定工数: 60時間
見通し工数: 75時間

月別予定配分:
- 2025/01: 20時間 (33.3%)
- 2025/02: 25時間 (41.7%)
- 2025/03: 15時間 (25.0%)

月別見通し配分:
- 2025/01: 75 × 0.333 = 25時間
- 2025/02: 75 × 0.417 = 31.25時間
- 2025/03: 75 × 0.250 = 18.75時間
合計: 75時間
```

### 4.3 開始日基準モードでの見通し
開始日基準モードでは、タスクの全見通し工数を開始月に計上する。

```typescript
// 開始月に全見通し工数を計上
accumulator.addTaskAllocation(
  assigneeName,
  startYearMonth,
  plannedHours,
  actualHours,
  taskDetail,
  totalForecastHours  // 全見通し工数を開始月に計上
);
```

## 4. データフロー

### 4.1 アーキテクチャ概要
```
UI Layer (wbs-summary-tables.tsx)
  ↓ useWbsSummary フック
Application Layer (get-wbs-summary-handler.ts)
  ↓ calculateMonthlyAssigneeSummaryWithBusinessDayAllocation()
  ├─ Domain Layer (forecast-calculation.service.ts)
  │   └─ calculateTaskForecast()
  ├─ Domain Layer (working-hours-allocation.service.ts)
  │   └─ allocateTaskWithDetails()
  └─ Application Layer (monthly-summary-accumulator.ts)
      └─ addTaskAllocation(forecastHours)
```

### 4.2 処理フロー

#### 4.2.1 集計実行時
```typescript
// 1. タスクデータ取得
const tasks = await this.wbsQueryRepository.getWbsTasks(wbsId);

// 2. タスクごとにループ
for (const task of tasks) {
  // 3. 月別按分実行（WorkingHoursAllocationService）
  const allocation = workingHoursAllocationService.allocateTaskWithDetails(...);

  // 4. 見通し工数計算（ForecastCalculationService）
  const forecastResult = ForecastCalculationService.calculateTaskForecast(
    task,
    { method: 'realistic' }
  );

  // 5. 月別見通し按分
  for (const yearMonth of allocation.getMonths()) {
    const monthForecastHours = (detail.plannedHours / totalPlannedHours)
                              × forecastResult.forecastHours;

    // 6. アキュムレータに追加
    accumulator.addTaskAllocation(
      assigneeName,
      yearMonth,
      plannedHours,
      actualHours,
      taskDetail,
      monthForecastHours
    );
  }
}

// 7. 集計結果取得
return accumulator.getTotals();
```

### 4.3 データ構造

#### 4.3.1 見通し工数を含む月別データ
```typescript
interface MonthlyAssigneeData {
  assignee: string;           // 担当者名
  month: string;              // 年月 (YYYY/MM)
  taskCount: number;          // タスク数
  plannedHours: number;       // 予定工数
  actualHours: number;        // 実績工数
  difference: number;         // 差分 (実績 - 予定)
  forecastHours?: number;     // 見通し工数
  taskDetails: TaskAllocationDetail[];
}
```

#### 4.3.2 集計結果
```typescript
interface MonthlyAssigneeSummary {
  data: MonthlyAssigneeData[];      // 月別・担当者別データ
  months: string[];                 // 月リスト
  assignees: string[];              // 担当者リスト
  monthlyTotals: Record<string, {   // 月別合計
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    forecastHours?: number;
  }>;
  assigneeTotals: Record<string, {  // 担当者別合計
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    forecastHours?: number;
  }>;
  grandTotal: {                     // 総合計
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    forecastHours?: number;
  };
}
```

## 5. UI表示機能

### 5.1 表示切り替え

月別集計表では以下の列を表示/非表示切り替え可能：

| 列名 | 説明 | デフォルト | 実装状況 |
|-----|------|----------|---------|
| 差分 | 実績 - 予定 | ON | ✅ 実装済み |
| 基準工数 | 承認時の基準 | OFF | ✅ 実装済み（予定工数で代用） |
| 見通し工数 | 算出された予測 | OFF | ✅ 実装済み |

### 5.2 表示制御のState管理
```tsx
const [showMonthlyDifference, setShowMonthlyDifference] = useState(true);
const [showMonthlyBaseline, setShowMonthlyBaseline] = useState(false);
const [showMonthlyForecast, setShowMonthlyForecast] = useState(false);
```

### 5.3 コンポーネント構成
```
wbs-summary-tables.tsx
  ├─ MonthlyAssigneeSummary (月別・担当者別)
  │   ├─ 表示切り替えチェックボックス
  │   ├─ 工数単位選択 (時間/人日/人月)
  │   └─ テーブル表示
  └─ MonthlyPhaseSummary (月別・工程別)
      ├─ 表示切り替えチェックボックス
      ├─ 工数単位選択
      └─ テーブル表示
```

### 5.4 見通し工数の表示例

#### 5.4.1 月別・担当者別集計表
```
担当者 | 月 | 予定 | 実績 | 差分 | 見通し |
-------|-----|-----|-----|-----|-------|
田中   | 01  | 40  | 30  | -10 | 55    |
田中   | 02  | 50  | 0   | -50 | 50    |
```

#### 5.4.2 合計行
```
合計   | -   | 90  | 30  | -60 | 105   |
```

## 6. コード構成

### 6.1 主要ファイル

#### 6.1.1 ドメイン層
```
src/domains/forecast/
  └─ forecast-calculation.service.ts
     - calculateTaskForecast()          // タスク単位の見通し算出
     - calculateMultipleTasksForecast() // 複数タスク一括算出
     - getEffectiveProgressRate()       // 完了優先の進捗率取得
     - calculateForecastHours()         // 見通し工数計算（3方式）
```

#### 6.1.2 アプリケーション層
```
src/applications/wbs/query/
  ├─ get-wbs-summary-handler.ts
  │   - calculateMonthlyAssigneeSummaryWithBusinessDayAllocation()
  │   - calculateMonthlyAssigneeSummaryWithStartDateBased()
  └─ monthly-summary-accumulator.ts
      - addTaskAllocation(forecastHours)  // 見通し工数を含む集計
      - getTotals()                        // 見通し工数を含む総計
      - calculateMonthlyTotals()           // 月別見通し合計
      - calculateAssigneeTotals()          // 担当者別見通し合計
```

#### 6.1.3 UI層
```
src/components/wbs/
  ├─ wbs-summary-tables.tsx              // メインコンポーネント
  ├─ monthly-assignee-summary.tsx        // 月別・担当者別表示
  └─ monthly-phase-summary.tsx           // 月別・工程別表示
```

### 6.2 主要インターフェース

#### 6.2.1 ForecastCalculationService
```typescript
interface ForecastCalculationOptions {
  method: 'conservative' | 'realistic' | 'optimistic';
}

interface ForecastCalculationResult {
  taskId: string;
  taskName: string;
  plannedHours: number;
  actualHours: number;
  progressRate: number;
  effectiveProgressRate: number;  // 完了優先適用後
  forecastHours: number;
  completionStatus: string;
}
```

#### 6.2.2 MonthlySummaryAccumulator
```typescript
addTaskAllocation(
  assigneeName: string,
  yearMonth: string,
  plannedHours: number,
  actualHours: number,
  taskDetail: TaskAllocationDetail,
  forecastHours?: number  // オプショナル
): void
```

## 7. 計算例

### 7.1 シナリオ1: 順調に進行中のタスク
```
タスク名: 基本設計書作成
予定工数: 40時間
実績工数: 25時間
進捗率: 60%
ステータス: IN_PROGRESS

【保守的方式】
見通し = (25 / 60) × 100 = 41.67時間

【現実的方式】
実績ベース = 41.67時間
残り予定 = 40 × 0.4 = 16時間
実績重み = 0.6, 予定重み = 0.4
見通し = 41.67 × 0.6 + (25 + 16) × 0.4 = 41.4時間

【楽観的方式】
見通し = 25 + 16 = 41時間
```

### 7.2 シナリオ2: 遅れているタスク
```
タスク名: 詳細設計書作成
予定工数: 50時間
実績工数: 40時間
進捗率: 50%
ステータス: IN_PROGRESS

【保守的方式】
見通し = (40 / 50) × 100 = 80時間

【現実的方式】
実績ベース = 80時間
残り予定 = 50 × 0.5 = 25時間
見通し = 80 × 0.5 + (40 + 25) × 0.5 = 72.5時間

【楽観的方式】
見通し = 40 + 25 = 65時間
```

### 7.3 シナリオ3: 完了タスク
```
タスク名: 要件定義書作成
予定工数: 30時間
実績工数: 35時間
進捗率: 100% (COMPLETED)
ステータス: COMPLETED

【全方式共通】
見通し = 35時間 (実績確定)
```

## 8. 制限事項と注意点

### 8.1 現在の制限事項
1. **基準工数の代用**: 基準工数は現在予定工数で代用している
2. **進捗率の取得**: WbsTaskDataから直接取得（progress_rateカラムの想定）
3. **計算方法の選択**: 現在は'realistic'固定（UI選択は未実装）
4. **過去月の扱い**: 実績工数がある月も見通し按分の対象

### 8.2 注意事項
1. **完了優先ルール**: ステータスがCOMPLETEDの場合、進捗率は必ず100%
2. **進捗率0%の扱い**: 実績があっても進捗率0%の場合は予定工数を返す
3. **除算エラー防止**: 進捗率や予定工数が0の場合の安全処理を実装
4. **数値精度**: 浮動小数点演算による誤差が生じる可能性

## 9. テスト

### 9.1 単体テスト
`src/__tests__/applications/wbs/query/monthly-summary-accumulator.test.ts`

**見通し工数関連テスト**:
- ✅ 見通し工数を追加できる
- ✅ 見通し工数が月別・担当者別に正しく集計される
- ✅ 複数担当者・複数月の見通し工数を正しく集計できる
- ✅ 見通し工数が指定されていない場合は0として扱われる

### 9.2 統合テスト
実装時に以下のシナリオをテストする必要がある:
- タスク全体の見通し工数計算
- 月別按分での見通し配分
- 担当者別・月別の集計
- UI表示での切り替え動作

## 10. 今後の拡張予定

### 10.1 計画中の機能
- [ ] UI上での計算方式選択（conservative/realistic/optimistic）
- [ ] 基準工数の正式実装（task_period.type='KIJUN'からの取得）
- [ ] 見通し工数の履歴管理
- [ ] 信頼度指標の追加
- [ ] 過去月は実績確定値として扱う機能

### 10.2 検討中の改善
- [ ] 進捗率の自動計算オプション（実績/予定ベース）
- [ ] タスク依存関係を考慮した見通し算出
- [ ] 担当者の稼働率を考慮した調整
- [ ] 見通しと実績の乖離分析機能

## 11. 参照

### 11.1 関連ドキュメント
- `/docs/_old/forecast-calculation-design.md` - 基本設計書（設計段階の資料）
- `ERD.md` - データベーススキーマ
- `CLAUDE.md` - プロジェクト全体の開発ガイドライン

### 11.2 関連コードパス
```
src/domains/forecast/forecast-calculation.service.ts
src/applications/wbs/query/get-wbs-summary-handler.ts
src/applications/wbs/query/monthly-summary-accumulator.ts
src/components/wbs/wbs-summary-tables.tsx
src/components/wbs/monthly-assignee-summary.tsx
src/components/wbs/monthly-phase-summary.tsx
```

### 11.3 型定義
```
src/applications/wbs/query/wbs-summary-result.ts
  - MonthlyAssigneeData
  - MonthlyAssigneeSummary
  - TaskAllocationDetail
```

---

**最終更新日**: 2025-11-09
**バージョン**: 1.0
**ステータス**: 実装済み（基本機能）
