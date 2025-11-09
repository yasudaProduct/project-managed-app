# WBS集計ハンドラーのリファクタリング計画（修正版）

**作成日**: 2025-11-08
**更新日**: 2025-11-08（修正版）
**対象**: `GetWbsSummaryHandler.calculateMonthlyAssigneeSummary`
**目的**: オニオンアーキテクチャの原則に従い、巨大メソッドを適切な責務に分割し、既存ドメインサービスとの整合性を保ちながら、保守性とテスタビリティを向上させる

---

## 目次

1. [概要](#概要)
2. [現状の問題点](#現状の問題点)
3. [既存機能との関連](#既存機能との関連)
4. [リファクタリングアプローチ](#リファクタリングアプローチ)
5. [アーキテクチャ設計](#アーキテクチャ設計)
6. [クラス構成と責務](#クラス構成と責務)
7. [処理フロー](#処理フロー)
8. [実装計画](#実装計画)
9. [期待される効果](#期待される効果)

---

## 概要

現在の `GetWbsSummaryHandler` クラスの `calculateMonthlyAssigneeSummary` メソッドは、約430行の巨大メソッドとなっており、以下の問題を抱えています：

- Application層にビジネスロジックが漏れている（オニオンアーキテクチャ違反）
- 複雑な条件分岐による可読性の低下
- コードの重複（3箇所以上）
- 単体テストの困難さ

**修正版のポイント**:
- 既存の `WorkingHoursAllocationService` との重複を回避
- 既存の `TaskAllocation`（日別）との名前衝突を回避
- ドメイン層の一貫性を保持

本計画では、**段階的リファクタリング（Extract Method）** を採用し、既存ドメインサービスを拡張する形でリファクタリングを行います。

---

## 現状の問題点

### 1. メソッドが巨大すぎる

**ファイル**: `src/applications/wbs/query/get-wbs-summary-handler.ts`

| メソッド | 行数 | 状態 |
|---------|------|------|
| `calculateMonthlyAssigneeSummaryWithBusinessDayAllocation` | 430行 | 🔴 巨大 |
| `calculateMonthlyAssigneeSummaryWithStartDateBased` | 150行 | 🟡 やや大きい |

- 単一のメソッドに複数の責務が集中
- 配分処理、データ集約、合計計算が混在

### 2. コードの重複

| 処理 | 重複箇所 | 行数 |
|------|----------|------|
| 単月処理 | 3箇所 | 各60-90行 |
| 複数月処理 | 2箇所 | 各100-150行 |
| 集計処理 | 2箇所 | 各60-80行 |

### 3. 複雑な条件分岐

```
担当者未割当 or WbsAssignee未登録?
  ├─ 単月タスク? → 開始月に全工数計上
  └─ 複数月タスク?
      └─ 会社カレンダーのみで按分

WbsAssignee登録済み?
  ├─ 単月タスク? → 開始月に全工数計上
  └─ 複数月タスク?
      └─ 個人スケジュール考慮で按分
```

3段階にネストした条件分岐により、コードの追跡が困難。

### 4. アーキテクチャ違反

**Application層に含まれるビジネスロジック**:

```typescript
// ❌ これらは本来Domain層にあるべき
- 単月/複数月の判定 (isSameMonth)
- 担当者割当/未割当による処理分岐
- 0.25単位量子化 (quantizeAllocatedHours)
- タスク詳細オブジェクトの生成
- 実績工数の計上ルール（開始月に計上）
```

### 5. テストが困難

- 巨大なメソッドのため単体テストが書きにくい
- モックやスタブの準備が大変
- テストケースが網羅しにくい

---

## 既存機能との関連

### 既存のドメインサービス

調査の結果、以下の既存ドメインサービスが発見されました：

| ドメインサービス | 責務 | 粒度 | ファイル |
|-----------------|------|------|---------|
| **WorkingHoursAllocationService** | 営業日按分 | **月別按分** | `src/domains/calendar/working-hours-allocation.service.ts` |
| **WorkloadCalculationService** | 作業負荷計算 | **日別按分** | `src/domains/assignee-workload/workload-calculation.service.ts` |
| **ForecastCalculationService** | 見通し工数計算 | タスク単位 | `src/domains/forecast/forecast-calculation.service.ts` |

### 既存の Value Object

| クラス | 用途 | ファイル |
|--------|------|---------|
| **TaskAllocation** | 日別のタスク配分結果 | `src/domains/assignee-workload/task-allocation.ts` |
| **DailyWorkAllocation** | 日別の作業配分 | `src/domains/assignee-workload/daily-work-allocation.ts` |
| **AssigneeWorkload** | 担当者の作業負荷 | `src/domains/assignee-workload/assignee-workload.ts` |

### 当初計画の問題点

1. **責務の重複**: 新しい `MonthlyTaskAllocationService` を作ると、既存の `WorkingHoursAllocationService` と重複
2. **名前の衝突**: `TaskAllocationResult` という名前は既存の `TaskAllocation` と紛らわしい
3. **按分ロジックの分散**: 日別・月別の按分ロジックが複数のサービスに分散

### 修正方針

✅ **既存の `WorkingHoursAllocationService` を拡張** （新しいサービスを作らない）
✅ **名前を `MonthlyTaskAllocation` に変更** （既存の `TaskAllocation` と区別）
✅ **按分戦略の抽象化** （将来的に日別・月別を統一的に扱う）

---

## リファクタリングアプローチ

### 選択したアプローチ: **段階的リファクタリング（Extract Method）+ 既存サービスの拡張**

既存のコードベースへの影響を最小限に抑え、既存ドメインサービスとの整合性を保ちながら、段階的に改善する方法を採用します。

**キーポイント**:
- 新しいドメインサービスを作成せず、既存の `WorkingHoursAllocationService` にメソッドを追加
- 既存の `TaskAllocation` との名前衝突を避けるため、`MonthlyTaskAllocation` という名前を使用
- 将来の拡張性を考慮し、`TaskAllocationStrategy` インターフェースを導入（オプション）

---

## アーキテクチャ設計

### レイヤー間の責務の明確化

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
├─────────────────────────────────────────────────────────────┤
│ GetWbsSummaryHandler                                        │
│  - execute()                                                │
│  - オーケストレーション（リポジトリ呼び出し）              │
│  - DTO作成（WbsSummaryResult）                             │
│                                                             │
│ MonthlySummaryAccumulator (新規)                            │
│  - addTaskAllocation()                                      │
│  - getTotals() → MonthlyAssigneeSummary (DTO)              │
│  - データ蓄積と集約計算                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ 呼び出し
┌─────────────────────────────────────────────────────────────┐
│                       Domain Layer                          │
├─────────────────────────────────────────────────────────────┤
│ WorkingHoursAllocationService (既存 - 拡張)                 │
│  - allocateTaskHoursByAssigneeWorkingDays() (既存)         │
│  + allocateTaskWithDetails() (新規)                        │
│    → MonthlyTaskAllocation を返す                          │
│  + isSingleMonth() (新規)                                  │
│                                                             │
│ AllocationQuantizer (新規)                                  │
│  - quantize() → Map<string, number>                         │
│  - 0.25単位量子化のビジネスルール（ハミルトン方式）        │
│                                                             │
│ MonthlyTaskAllocation (新規 Value Object)                   │
│  - monthlyAllocations: Map<string, MonthlyAllocationDetail>│
│  - タスクの月別按分結果を表現                              │
│  - 既存の TaskAllocation（日別）と区別                     │
│                                                             │
│ WbsAssignee (既存 - メソッド追加)                          │
│  + createUnassigned() (新規)                                │
│  - 未割当担当者の生成                                       │
│                                                             │
│ TaskAllocationStrategy (新規 Interface - オプション)        │
│  - 按分戦略の抽象化                                         │
│  - 日別・月別を統一的に扱う                                │
└─────────────────────────────────────────────────────────────┘
```

### アーキテクチャの原則

1. **依存性の方向**: Application → Domain（逆依存なし）
2. **ドメインロジックの配置**: すべてのビジネスルールをDomain層に集約
3. **Application層の責務**: オーケストレーションとDTO変換のみ
4. **既存コードの再利用**: 新しいサービスを作らず、既存サービスを拡張
5. **テスタビリティ**: Domain層は純粋関数として単体テスト可能

---

## クラス構成と責務

### 1. GetWbsSummaryHandler (既存 - リファクタリング)

**レイヤー**: Application
**ファイル**: `src/applications/wbs/query/get-wbs-summary-handler.ts`

**責務**:
- WBS集計全体の処理フローを統括（オーケストレーション）
- 必要なリポジトリからデータを取得
- 計算モード（営業日按分 or 開始日基準）の振り分け
- DTO（WbsSummaryResult）の生成

**主要メソッド**:

```typescript
// 公開メソッド
async execute(query: GetWbsSummaryQuery): Promise<WbsSummaryResult>

// プライベートメソッド（既存のまま）
private calculatePhaseSummary(tasks: WbsTaskData[], phases: PhaseData[]): PhaseSummary[]
private calculateAssigneeSummary(tasks: WbsTaskData[]): AssigneeSummary[]
private calculateTotal(summaries: Array<PhaseSummary | AssigneeSummary>)

// プライベートメソッド（大幅簡素化）
private async calculateMonthlyAssigneeSummary(...): Promise<MonthlyAssigneeSummary> // 20行程度
private async calculateMonthlyAssigneeSummaryWithBusinessDayAllocation(...) // 80行程度（430行→80行）
private calculateMonthlyAssigneeSummaryWithStartDateBased(...) // 30行程度（150行→30行）
```

**変更後のコード行数**: 823行 → 約450行 (-45%)

---

### 2. MonthlySummaryAccumulator (新規)

**レイヤー**: Application
**ファイル**: `src/applications/wbs/query/monthly-summary-accumulator.ts`

**責務**:
- 月別・担当者別の集計データを蓄積
- 月別合計、担当者別合計、全体合計の計算
- 重複データの自動マージ（同一キー: 月-担当者）

**クラス定義**:

```typescript
export class MonthlySummaryAccumulator {
  private dataMap = new Map<string, MonthlyAssigneeData>();
  private taskDetailsMap = new Map<string, TaskAllocationDetail[]>();
  private months = new Set<string>();
  private assignees = new Set<string>();

  /**
   * タスク配分結果を追加
   */
  addTaskAllocation(
    assigneeName: string,
    yearMonth: string,
    plannedHours: number,
    actualHours: number,
    taskDetail: TaskAllocationDetail
  ): void

  /**
   * 集計結果を取得
   */
  getTotals(): MonthlyAssigneeSummary

  // プライベートメソッド
  private calculateMonthlyTotals(data: MonthlyAssigneeData[], months: string[])
  private calculateAssigneeTotals(data: MonthlyAssigneeData[], assignees: string[])
  private calculateGrandTotal(data: MonthlyAssigneeData[])
}
```

---

### 3. WorkingHoursAllocationService (既存 - 拡張)

**レイヤー**: Domain
**ファイル**: `src/domains/calendar/working-hours-allocation.service.ts`

**責務**:
- タスクの営業日按分（既存機能）
- 詳細な按分結果の生成（新規機能）
- 単月/複数月の判定（新規機能）

**拡張内容**:

```typescript
export class WorkingHoursAllocationService {
  constructor(private readonly companyCalendar: CompanyCalendar) {}

  // ✅ 既存メソッド（そのまま維持）
  allocateTaskHoursByAssigneeWorkingDays(
    task: TaskForAllocation,
    assignee: WbsAssignee,
    userSchedules: UserSchedule[]
  ): Map<string, number>

  // ✅ 既存メソッド（そのまま維持）
  allocateMultipleTasksHours(...)
  getTotalAllocatedHoursByMonth(...)

  // 🆕 新規メソッド: 詳細な按分結果を返す
  allocateTaskWithDetails(
    task: TaskForAllocation,
    assignee: WbsAssignee | undefined,
    userSchedules: UserSchedule[],
    quantizer?: AllocationQuantizer
  ): MonthlyTaskAllocation {
    // 単月/複数月の判定
    const isSingleMonth = this.isSingleMonth(task);

    if (isSingleMonth) {
      return this.allocateSingleMonth(task);
    }

    // 担当者未割当の場合はダミーを作成
    const targetAssignee = assignee || WbsAssignee.createUnassigned(task.wbsId);

    // BusinessDayPeriodを作成
    const period = new BusinessDayPeriod(
      task.yoteiStart,
      task.yoteiEnd!,
      targetAssignee,
      this.companyCalendar,
      userSchedules
    );

    // 既存の按分メソッドを呼び出し
    const allocatedHoursRaw = this.allocateTaskHoursByAssigneeWorkingDays(
      task,
      targetAssignee,
      userSchedules
    );

    // 量子化（必要な場合）
    const allocatedHours = quantizer
      ? quantizer.quantize(allocatedHoursRaw)
      : allocatedHoursRaw;

    // MonthlyTaskAllocation を作成
    return MonthlyTaskAllocation.createMultiMonth(
      task,
      allocatedHours,
      period
    );
  }

  // 🆕 ビジネスルール: 単月タスクの判定
  private isSingleMonth(task: TaskForAllocation): boolean {
    if (!task.yoteiEnd) return true;
    const start = new Date(task.yoteiStart);
    const end = new Date(task.yoteiEnd);
    return start.getFullYear() === end.getFullYear()
      && start.getMonth() === end.getMonth();
  }

  // 🆕 単月タスクの按分
  private allocateSingleMonth(task: TaskForAllocation): MonthlyTaskAllocation {
    const yearMonth = this.formatYearMonth(task.yoteiStart);
    return MonthlyTaskAllocation.createSingleMonth(task, yearMonth);
  }

  private formatYearMonth(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

// TaskForAllocation の拡張
export interface TaskForAllocation {
  wbsId: number;
  taskId: string;
  taskName: string;
  phase?: string;
  yoteiStart: Date;
  yoteiEnd?: Date;
  yoteiKosu: number;
  jissekiKosu?: number;
}
```

---

### 4. AllocationQuantizer (新規)

**レイヤー**: Domain
**ファイル**: `src/domains/wbs/allocation-quantizer.ts`

**責務**:
- 0.25単位量子化のビジネスルール
- ハミルトン方式による合計保持

**クラス定義**:

```typescript
/**
 * 工数の量子化を行うドメインサービス
 * ビジネスルール: 0.25単位で丸め、合計を保持する（ハミルトン方式）
 */
export class AllocationQuantizer {
  private readonly unit: number;

  constructor(unit: number = 0.25) {
    if (unit <= 0) {
      throw new Error('単位は0より大きい値である必要があります');
    }
    this.unit = unit;
  }

  /**
   * 按分結果を量子化
   * @param raw 元の按分結果
   * @returns 量子化後の按分結果
   */
  quantize(raw: Map<string, number>): Map<string, number> {
    if (raw.size === 0) return raw;

    // 合計を保持（ビジネスルール）
    const rawTotal = Array.from(raw.values()).reduce((a, b) => a + b, 0);
    const totalUnits = Math.round(rawTotal / this.unit);

    // 各月を床取り + 残りを小数部の大きい順に配分（ハミルトン方式）
    const entries = Array.from(raw.entries()).map(([month, hours]) => {
      const unitsRaw = hours / this.unit;
      const floorUnits = Math.floor(unitsRaw + 1e-9);
      const frac = unitsRaw - floorUnits;
      return { month, hours, unitsRaw, floorUnits, frac };
    });

    const usedUnits = entries.reduce((sum, e) => sum + e.floorUnits, 0);
    let remaining = Math.max(0, totalUnits - usedUnits);

    // 小数部の大きい順、同値なら年月昇順
    entries.sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      return a.month.localeCompare(b.month);
    });

    // 残りユニットを配分
    for (let i = 0; i < entries.length && remaining > 0; i++) {
      entries[i].floorUnits += 1;
      remaining -= 1;
    }

    // 年月昇順で安定化
    entries.sort((a, b) => a.month.localeCompare(b.month));

    const result = new Map<string, number>();
    entries.forEach(e => {
      result.set(e.month, e.floorUnits * this.unit);
    });

    return result;
  }

  /**
   * 単位を取得
   */
  getUnit(): number {
    return this.unit;
  }
}
```

**ビジネスルール（ハミルトン方式）**:

1. 各月を0.25単位で床取り
2. 残りユニットを小数部の大きい順に配分
3. 同値の場合は年月昇順で安定化
4. 合計は元の按分結果の合計を保持

---

### 5. MonthlyTaskAllocation (新規)

**レイヤー**: Domain
**ファイル**: `src/domains/wbs/monthly-task-allocation.ts`

**責務**:
- タスクの月別按分結果を表現（Value Object）
- 不変性の保証

**クラス定義**:

```typescript
/**
 * 月別タスク按分結果（Value Object）
 * 既存の TaskAllocation（日別）と区別するため "Monthly" を付与
 */
export class MonthlyTaskAllocation {
  private constructor(
    public readonly task: TaskForAllocation,
    public readonly monthlyAllocations: Map<string, MonthlyAllocationDetail>
  ) {}

  /**
   * 単月タスクの按分結果を生成
   */
  static createSingleMonth(
    task: TaskForAllocation,
    yearMonth: string
  ): MonthlyTaskAllocation {
    const allocations = new Map<string, MonthlyAllocationDetail>();
    allocations.set(yearMonth, {
      plannedHours: task.yoteiKosu,
      actualHours: task.jissekiKosu || 0,
      workingDays: 1,
      availableHours: 7.5, // デフォルト値
      allocationRatio: 1.0
    });
    return new MonthlyTaskAllocation(task, allocations);
  }

  /**
   * 複数月タスクの按分結果を生成
   */
  static createMultiMonth(
    task: TaskForAllocation,
    allocatedHours: Map<string, number>,
    period: BusinessDayPeriod
  ): MonthlyTaskAllocation {
    const allocations = new Map<string, MonthlyAllocationDetail>();
    const startYearMonth = formatYearMonth(task.yoteiStart);
    const businessDaysByMonth = period.getBusinessDaysByMonth();
    const availableHoursByMonth = period.getAvailableHoursByMonth();
    const totalAvailableHours = Array.from(availableHoursByMonth.values())
      .reduce((sum, h) => sum + h, 0);

    allocatedHours.forEach((plannedHours, yearMonth) => {
      const workingDays = businessDaysByMonth.get(yearMonth) || 0;
      const availableHours = availableHoursByMonth.get(yearMonth) || 0;
      const allocationRatio = totalAvailableHours > 0
        ? availableHours / totalAvailableHours
        : 0;

      // ビジネスルール: 実績工数は開始月のみ計上
      const actualHours = yearMonth === startYearMonth
        ? (task.jissekiKosu || 0)
        : 0;

      allocations.set(yearMonth, {
        plannedHours,
        actualHours,
        workingDays,
        availableHours,
        allocationRatio
      });
    });

    return new MonthlyTaskAllocation(task, allocations);
  }

  /**
   * 全ての月を取得
   */
  getMonths(): string[] {
    return Array.from(this.monthlyAllocations.keys()).sort();
  }

  /**
   * 指定月の按分データを取得
   */
  getAllocation(yearMonth: string): MonthlyAllocationDetail | undefined {
    return this.monthlyAllocations.get(yearMonth);
  }

  /**
   * 予定工数の合計を取得
   */
  getTotalPlannedHours(): number {
    return Array.from(this.monthlyAllocations.values())
      .reduce((sum, detail) => sum + detail.plannedHours, 0);
  }

  /**
   * 実績工数の合計を取得
   */
  getTotalActualHours(): number {
    return Array.from(this.monthlyAllocations.values())
      .reduce((sum, detail) => sum + detail.actualHours, 0);
  }
}

/**
 * 月別按分詳細
 */
export interface MonthlyAllocationDetail {
  plannedHours: number;
  actualHours: number;
  workingDays: number;
  availableHours: number;
  allocationRatio: number;
}

/**
 * 年月フォーマット用ヘルパー関数
 */
function formatYearMonth(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
```

---

### 6. WbsAssignee (既存 - メソッド追加)

**レイヤー**: Domain
**ファイル**: `src/domains/wbs/wbs-assignee.ts`

**追加メソッド**:

```typescript
export class WbsAssignee {
  // ... 既存コード ...

  /**
   * 未割当担当者を作成（ビジネスルール）
   * 担当者が割り当てられていないタスクの按分時に使用
   */
  public static createUnassigned(wbsId: number): WbsAssignee {
    return new WbsAssignee({
      wbsId,
      userId: 'unassigned',
      rate: 1,
      seq: 0
    });
  }
}
```

---

### 7. TaskAllocationStrategy (新規 Interface - オプション)

**レイヤー**: Domain
**ファイル**: `src/domains/wbs/task-allocation-strategy.ts`

**目的**: 将来的に日別・月別按分を統一的に扱うための抽象化

```typescript
/**
 * タスク按分戦略のインターフェース
 * 日別・月別など、異なる粒度の按分を統一的に扱う
 */
export interface TaskAllocationStrategy<T> {
  /**
   * タスクを按分
   */
  allocate(
    task: TaskForAllocation,
    assignee: WbsAssignee | undefined,
    userSchedules: UserSchedule[]
  ): Promise<T>;
}

/**
 * 月別按分戦略
 */
export class MonthlyAllocationStrategy implements TaskAllocationStrategy<MonthlyTaskAllocation> {
  constructor(
    private readonly allocationService: WorkingHoursAllocationService,
    private readonly quantizer?: AllocationQuantizer
  ) {}

  async allocate(
    task: TaskForAllocation,
    assignee: WbsAssignee | undefined,
    userSchedules: UserSchedule[]
  ): Promise<MonthlyTaskAllocation> {
    return this.allocationService.allocateTaskWithDetails(
      task,
      assignee,
      userSchedules,
      this.quantizer
    );
  }
}

/**
 * 日別按分戦略（将来の拡張用）
 * 既存の WorkloadCalculationService を活用
 */
export class DailyAllocationStrategy implements TaskAllocationStrategy<DailyTaskAllocation> {
  // 実装は将来の拡張として保留
}
```

---

## 処理フロー

### 全体フロー

```
[Client]
  → GetWbsSummaryHandler.execute()
      |
      ├─> リポジトリからデータ取得
      |   ├─ wbsQueryRepository.getWbsTasks()
      |   ├─ wbsQueryRepository.getPhases()
      |   ├─ companyHolidayRepository.findAll()
      |   ├─ wbsAssigneeRepository.findByWbsId()
      |   └─ prisma.projectSettings.findUnique()
      |
      ├─> 工程別集計
      |   └─ calculatePhaseSummary() → PhaseSummary[]
      |
      ├─> 担当者別集計
      |   └─ calculateAssigneeSummary() → AssigneeSummary[]
      |
      └─> 月別・担当者別集計
          └─ calculateMonthlyAssigneeSummary()
              |
              └─> calculateMonthlyAssigneeSummaryWithBusinessDayAllocation()
                  |
                  ├─> [Domain] ドメインサービスの初期化
                  |   ├─ new CompanyCalendar(holidays)
                  |   ├─ new WorkingHoursAllocationService(calendar)
                  |   └─ new AllocationQuantizer(0.25) ← roundToQuarter=true
                  |
                  ├─> [Application] データ蓄積の準備
                  |   └─ new MonthlySummaryAccumulator()
                  |
                  └─> タスクループ
                      |
                      └─ for each task:
                          |
                          ├─> [Domain] WorkingHoursAllocationService.allocateTaskWithDetails()
                          |   ├─ 単月/複数月判定（isSingleMonth）
                          |   ├─ allocateTaskHoursByAssigneeWorkingDays 呼び出し
                          |   ├─ AllocationQuantizer 呼び出し
                          |   └─ MonthlyTaskAllocation を返す
                          |
                          └─> [Application] MonthlySummaryAccumulator.addTaskAllocation()
                              └─ DTO構築

                      └─> MonthlySummaryAccumulator.getTotals()
                          └─ MonthlyAssigneeSummary

  ← WbsSummaryResult
```

### 詳細フロー（営業日按分モード）

```typescript
// [Application Layer] GetWbsSummaryHandler

async calculateMonthlyAssigneeSummaryWithBusinessDayAllocation(
  tasks: WbsTaskData[],
  wbsId: number,
  roundToQuarter: boolean
) {
  // [Domain] ドメインサービスの初期化
  const companyHolidays = await this.companyHolidayRepository.findAll();
  const companyCalendar = new CompanyCalendar(companyHolidays);
  const workingHoursAllocationService = new WorkingHoursAllocationService(companyCalendar);
  const quantizer = roundToQuarter ? new AllocationQuantizer(0.25) : undefined;

  // WBS担当者情報を取得
  const wbsAssignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);
  const assigneeMap = new Map(wbsAssignees.map(a => [a.userId, a]));

  // [Application] データ蓄積の準備
  const accumulator = new MonthlySummaryAccumulator();

  // タスクごとに按分
  for (const task of tasks) {
    if (!task.yoteiStart) continue;

    const assigneeName = task.assignee?.displayName ?? '未割当';
    const wbsAssignee = task.assignee
      ? assigneeMap.get(task.assignee.id.toString())
      : undefined;

    // 個人スケジュールを取得（担当者割当済みの場合のみ）
    const userSchedules = wbsAssignee
      ? await this.userScheduleRepository.findByUserIdAndDateRange(
          wbsAssignee.userId,
          new Date(task.yoteiStart),
          task.yoteiEnd ? new Date(task.yoteiEnd) : new Date(task.yoteiStart)
        )
      : [];

    // [Domain] 月別按分を実行（単月/複数月の判定も含む）
    const allocation = workingHoursAllocationService.allocateTaskWithDetails(
      {
        wbsId,
        taskId: task.id,
        taskName: task.name,
        phase: task.phase?.name || (typeof task.phase === "string" ? task.phase : undefined),
        yoteiStart: new Date(task.yoteiStart),
        yoteiEnd: task.yoteiEnd ? new Date(task.yoteiEnd) : undefined,
        yoteiKosu: Number(task.yoteiKosu || 0),
        jissekiKosu: Number(task.jissekiKosu || 0)
      },
      wbsAssignee,
      userSchedules,
      quantizer
    );

    // [Application] 按分結果を蓄積
    for (const yearMonth of allocation.getMonths()) {
      const detail = allocation.getAllocation(yearMonth)!;
      accumulator.addTaskAllocation(
        assigneeName,
        yearMonth,
        detail.plannedHours,
        detail.actualHours,
        this.createTaskDetail(task, allocation, yearMonth, detail)
      );
    }
  }

  return accumulator.getTotals();
}
```

---

## 実装計画

### フェーズ1: ドメイン層の実装（3-4日）

**目的**: ビジネスロジックをドメイン層に実装

**タスク**:

1. ✅ `AllocationQuantizer` の実装とテスト
   - ハミルトン方式の実装
   - エッジケースのテスト（0.25単位量子化）
   - ファイル: `src/domains/wbs/allocation-quantizer.ts`
   - テスト: `src/__tests__/domains/wbs/allocation-quantizer.test.ts`

2. ✅ `MonthlyTaskAllocation` の実装とテスト
   - Value Object としての不変性
   - ファクトリメソッドの実装
   - ファイル: `src/domains/wbs/monthly-task-allocation.ts`
   - テスト: `src/__tests__/domains/wbs/monthly-task-allocation.test.ts`

3. ✅ `WbsAssignee.createUnassigned()` の追加とテスト
   - 既存ファイルへのメソッド追加
   - ファイル: `src/domains/wbs/wbs-assignee.ts`
   - テスト: 既存のテストファイルに追加

4. ✅ `WorkingHoursAllocationService` の拡張とテスト
   - `allocateTaskWithDetails()` メソッドの追加
   - `isSingleMonth()` メソッドの追加
   - `TaskForAllocation` インターフェースの拡張
   - ファイル: `src/domains/calendar/working-hours-allocation.service.ts`
   - テスト: 既存のテストファイルに追加

5. ✅ ドメイン層のユニットテスト作成
   - すべてのビジネスルールのテストカバレッジ80%以上

**成功基準**: ドメイン層のすべてのユニットテストが通過

---

### フェーズ2: Application層の実装（3-4日）

**目的**: Application層を実装し、ドメイン層を活用

**タスク**:

1. ✅ `MonthlySummaryAccumulator` の実装とテスト
   - データ蓄積ロジック
   - 合計計算ロジック
   - ファイル: `src/applications/wbs/query/monthly-summary-accumulator.ts`
   - テスト: `src/__tests__/applications/wbs/query/monthly-summary-accumulator.test.ts`

2. ✅ `GetWbsSummaryHandler` のリファクタリング
   - `calculateMonthlyAssigneeSummaryWithBusinessDayAllocation` の簡素化
   - `calculateMonthlyAssigneeSummaryWithStartDateBased` の簡素化
   - ドメインサービスの活用

3. ✅ 既存の統合テストが通過することを確認
   - リグレッションテストの実行

**成功基準**: すべての統合テストが通過し、動作に変更がないこと

---

### フェーズ3: レビューと最適化（1-2日）

**目的**: コード品質の向上と最適化

**タスク**:

1. ✅ コードレビュー
   - アーキテクチャの確認
   - 命名の統一
   - ドキュメントの更新

2. ✅ パフォーマンステスト
   - 大量データでの動作確認
   - メモリ使用量の確認

3. ✅ リファクタリングドキュメントの更新

**成功基準**: コードレビュー承認、パフォーマンス劣化なし

---

### フェーズ4: デプロイと監視（1日）

**目的**: 本番環境への安全なデプロイ

**タスク**:

1. ✅ ステージング環境でのテスト
2. ✅ 本番環境へのデプロイ
3. ✅ 動作監視（1週間）
4. ✅ 問題発生時のロールバック準備

**成功基準**: 本番環境で正常動作、エラー率の増加なし

---

## 期待される効果

### コード品質の向上

| 指標 | Before | After | 改善率 |
|------|--------|-------|--------|
| **GetWbsSummaryHandler** | 823行 | 約450行 | -45% |
| **calculateMonthlyAssigneeSummaryWithBusinessDayAllocation** | 430行 | 約80行 | -81% |
| **calculateMonthlyAssigneeSummaryWithStartDateBased** | 150行 | 約30行 | -80% |
| **コード重複** | 3箇所以上 | なし | -100% |

### テスタビリティの向上

| テスト種別 | Before | After |
|-----------|--------|-------|
| **ユニットテスト** | ❌ 困難（リポジトリモック必須） | ✅ 容易（純粋関数） |
| **統合テスト** | 🟡 可能（複雑） | ✅ 容易（明確な境界） |
| **テストカバレッジ** | 不明（計測困難） | 目標: 80%以上 |

### アーキテクチャの改善

| 観点 | Before | After |
|------|--------|-------|
| **Application層の責務** | ❌ ビジネスロジック混在 | ✅ オーケストレーションのみ |
| **Domain層の完全性** | ❌ 不完全（ロジック漏れ） | ✅ 完全（全ロジック包含） |
| **再利用性** | ❌ Handler専用 | ✅ 他のユースケースでも利用可 |
| **既存コードとの整合性** | - | ✅ WorkingHoursAllocationService を拡張 |
| **オニオンアーキテクチャ準拠** | ❌ 違反 | ✅ 準拠 |

### 保守性の向上

- **可読性**: 複雑な条件分岐が整理され、コードの意図が明確に
- **変更容易性**: ビジネスルールの変更がドメイン層に限定
- **デバッグ容易性**: 各クラスの責務が明確で、問題箇所を特定しやすい
- **拡張性**: TaskAllocationStrategy により、日別・月別・週別など様々な粒度に対応可能

---

## ファイル構成（最終形）

```
src/
├── applications/
│   └── wbs/
│       └── query/
│           ├── get-wbs-summary-handler.ts (リファクタリング)
│           ├── monthly-summary-accumulator.ts (新規)
│           ├── wbs-summary-result.ts (既存)
│           ├── wbs-summary-query.ts (既存)
│           └── allocation-calculation-mode.ts (既存)
│
└── domains/
    ├── calendar/
    │   └── working-hours-allocation.service.ts (拡張)
    │       + allocateTaskWithDetails()
    │       + isSingleMonth()
    │
    └── wbs/
        ├── allocation-quantizer.ts (新規)
        ├── monthly-task-allocation.ts (新規)
        ├── task-allocation-strategy.ts (新規 - オプション)
        └── wbs-assignee.ts (既存 - メソッド追加)
            + createUnassigned()
```

---

## リスクと対策

### リスク1: 既存機能の破壊

**対策**:
- フェーズ1で包括的な統合テストを作成
- 各フェーズでリグレッションテストを実行
- ステージング環境での十分なテスト

### リスク2: パフォーマンス劣化

**対策**:
- パフォーマンステストの実施
- 大量データでの動作確認
- 必要に応じてキャッシュ機構の導入

### リスク3: 既存の WorkingHoursAllocationService への影響

**対策**:
- 既存メソッドは一切変更せず、新しいメソッドを追加のみ
- 既存のテストが全て通過することを確認
- 既存の使用箇所（WorkloadCalculationService など）への影響がないことを確認

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-08 | 1.0 | 初版作成 |
| 2025-11-08 | 2.0 | 修正版（既存ドメインサービスとの整合性を考慮） |

**修正版の主な変更点**:
- 新しい `MonthlyTaskAllocationService` を作成せず、既存の `WorkingHoursAllocationService` を拡張
- `TaskAllocationResult` を `MonthlyTaskAllocation` に名前変更（既存の `TaskAllocation` との衝突回避）
- `TaskAllocationStrategy` インターフェースを追加（将来の拡張性）
- ファイル構成の簡素化

---

## 参考資料

- [オニオンアーキテクチャ](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)
- [ドメイン駆動設計（DDD）](https://www.domainlanguage.com/ddd/)
- [Extract Method リファクタリング](https://refactoring.guru/extract-method)
- [Value Object パターン](https://martinfowler.com/bliki/ValueObject.html)

---

**作成者**: Claude Code
**レビュー**: 未実施
**承認**: 未実施
