# EVM実装分析レポート

## 1. 現状分析

### 1.1 既存のEVM実装

現在、以下のEVM関連の実装が既に存在します：

#### ドメイン層
- **EvmMetrics** (`src/domains/evm/evm-metrics.ts`)
  - PV, EV, AC, dateフィールドを持つ
  - CV, SV, CPI, SPIなどの計算プロパティを実装
  - **問題点**: BACフィールドがない（BAC依存の計算ができない）
  - **問題点**: 算出方式（工数/金額）や進捗率測定方法のフィールドがない

- **ProjectEvm** (`src/domains/evm/project-evm.ts`)
  - プロジェクト単位のEVMデータ集約
  - budgetAtCompletionフィールドあり
  - 時系列データ（metrics配列）を保持

#### リポジトリ層
- **IEvmRepository** (`src/applications/evm/ievm-repository.ts`)
  - プロジェクト単位でのEVMデータ取得
  - **問題点**: 外部MySQL（geppo）のwbsテーブルからデータを取得
  - **問題点**: 本プロジェクトのPostgreSQLデータベースを使用していない

- **EvmRepository** (`src/infrastructures/evm/evm-repository.ts`)
  - geppoPrismaを使用して外部データベースから取得
  - **問題点**: 本プロジェクトのWBS構造と異なるデータソース

### 1.2 既存のWBS関連リポジトリ

#### WbsQueryRepository
- **IWbsQueryRepository** (`src/applications/wbs/query/wbs-query-repository.ts`)
  - `getWbsTasks(wbsId)`: タスク一覧を取得
  - **利点**: 既に以下のデータを取得可能
    - 基準工数（kijunKosu）、予定工数（yoteiKosu）、実績工数（jissekiKosu）
    - 基準期間、予定期間、実績期間
    - 進捗率（progressRate）
    - ステータス
    - フェーズ情報
    - 担当者情報

- **実装の特徴**:
  - 複雑なSQLクエリでLATERAL JOINを使用
  - TaskPeriodとTaskKosuの最新レコードのみを取得
  - WorkRecordを集計して実績工数を算出

## 2. 設計ドキュメントとの差分分析

### 2.1 ドメインエンティティの差分

| 項目 | 設計ドキュメント | 既存実装 | 対応方針 |
|------|-----------------|---------|---------|
| **EvmMetrics** | BAC, calculationMode, progressMethodを含む | BAC, calculationMode, progressMethodがない | **拡張が必要** |
| **TaskEvmData** | タスク別EVMデータエンティティ | 存在しない | **新規作成が必要** |
| **EvmSnapshot** | 履歴スナップショット | 存在しない | **第2フェーズで作成** |

### 2.2 リポジトリの差分

| 項目 | 設計ドキュメント | 既存実装 | 対応方針 |
|------|-----------------|---------|---------|
| **データソース** | 本プロジェクトのPostgreSQL | 外部MySQL（geppo） | **新規リポジトリが必要** |
| **WBS単位の取得** | WBS ID指定 | Project ID指定 | **要件が異なる** |
| **タスク詳細** | タスク別EVM計算 | なし | **新規実装が必要** |

## 3. EvmRepository新規作成の必要性

### 3.1 結論: **新規リポジトリの作成が必要**

理由：
1. **データソースが異なる**
   - 既存: 外部MySQL（geppo）の既存wbsテーブル
   - 新規: 本プロジェクトのPostgreSQL（wbs, wbs_task, task_period, task_kosu, work_records）

2. **責務の分離**
   - 既存EvmRepository: 外部システムとの連携（月報システム用）
   - 新規EvmRepository: 本プロジェクト内のWBSからのEVM計算

3. **設計思想の違い**
   - 既存: プロジェクト単位で集約済みデータを取得
   - 新規: WBS単位で詳細な計算を実行（タスク別、期間別、進捗率測定方法別）

### 3.2 推奨アプローチ

以下の2つのリポジトリを並存させる：

1. **既存EvmRepository（維持）**
   - 外部システム（geppo）からのEVMデータ取得専用
   - ダッシュボードの既存機能で使用

2. **新規WbsEvmRepository（作成）**
   - 本プロジェクトのPostgreSQLからEVMデータを計算
   - プロジェクト詳細ページの新EVMタブで使用
   - 段階的に既存EvmRepositoryを置き換え可能

## 4. WbsQueryRepositoryとの関係

### 4.1 WbsQueryRepositoryの活用

**結論: WbsQueryRepositoryは活用すべき**

理由：
1. **データ取得ロジックの重複を避ける**
   - 既にタスク一覧、工数、期間、進捗率を取得可能
   - EVM計算に必要なデータがほぼ揃っている

2. **保守性の向上**
   - WBS関連のクエリロジックを一箇所に集約
   - スキーマ変更時の修正箇所を最小化

### 4.2 推奨アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│ EvmService (アプリケーションサービス)            │
│ - EVM計算ロジック                                │
│ - 進捗率測定方法の適用                           │
│ - 算出方式の切り替え                             │
└──────────┬──────────────────────────────────────┘
           │
           ├─→ WbsEvmRepository (新規)
           │   - WBS単位のEVMデータ取得
           │   - 実績コスト集計
           │   - バッファ情報取得
           │
           └─→ WbsQueryRepository (既存活用)
               - タスク一覧取得
               - 工数・期間データ取得
               - 進捗率・ステータス取得
```

## 5. 実装推奨事項

### 5.1 ドメイン層の拡張

#### EvmMetricsの拡張
```typescript
export class EvmMetrics {
  public readonly pv: number;
  public readonly ev: number;
  public readonly ac: number;
  public readonly bac: number; // 追加
  public readonly date: Date;
  public readonly calculationMode: 'hours' | 'cost'; // 追加
  public readonly progressMethod: ProgressMeasurementMethod; // 追加

  // EAC, ETC, VACの計算にBACが必要
  get estimateAtCompletion(): number {
    if (this.cpi === 0) return 0;
    return this.bac / this.cpi;
  }

  get estimateToComplete(): number {
    return this.estimateAtCompletion - this.ac;
  }

  get varianceAtCompletion(): number {
    return this.bac - this.estimateAtCompletion;
  }
}
```

#### TaskEvmDataの新規作成
```typescript
export class TaskEvmData {
  constructor(
    public readonly taskId: number,
    public readonly taskNo: string,
    public readonly taskName: string,
    public readonly plannedStartDate: Date,
    public readonly plannedEndDate: Date,
    public readonly actualStartDate: Date | null,
    public readonly actualEndDate: Date | null,
    public readonly plannedManHours: number,
    public readonly actualManHours: number,
    public readonly status: TaskStatus,
    public readonly progressRate: number,
    public readonly costPerHour: number = 5000,
    public readonly selfReportedProgress: number | null = null,
  ) {}

  // 進捗率測定方法に応じた進捗率取得
  getProgressRate(method: ProgressMeasurementMethod): number {
    switch (method) {
      case 'ZERO_HUNDRED':
        return this.status === 'COMPLETED' ? 100 : 0;
      case 'FIFTY_FIFTY':
        if (this.status === 'COMPLETED') return 100;
        if (this.status === 'IN_PROGRESS') return 50;
        return 0;
      case 'SELF_REPORTED':
        return this.selfReportedProgress ?? this.progressRate;
    }
  }

  // 計算モードと進捗率測定方法に応じた出来高取得
  getEarnedValue(
    calculationMode: 'hours' | 'cost',
    progressMethod: ProgressMeasurementMethod
  ): number {
    const rate = this.getProgressRate(progressMethod);
    const baseValue = calculationMode === 'cost'
      ? this.plannedManHours * this.costPerHour
      : this.plannedManHours;
    return baseValue * (rate / 100);
  }
}
```

### 5.2 リポジトリ層の実装

#### WbsEvmRepository（新規）
```typescript
@injectable()
export class WbsEvmRepository implements IWbsEvmRepository {
  constructor(
    @inject(TYPES.IWbsQueryRepository)
    private wbsQueryRepository: IWbsQueryRepository
  ) {}

  async getWbsEvmData(wbsId: number): Promise<WbsEvmData> {
    // WbsQueryRepositoryを活用してタスクデータを取得
    const tasks = await this.wbsQueryRepository.getWbsTasks(wbsId);

    // TaskEvmDataに変換
    const taskEvmData = tasks.map(task => new TaskEvmData(
      Number(task.id),
      task.name,
      // ... その他のフィールドマッピング
      task.progressRate ?? 0,
      // TODO: 担当者のcostPerHourを取得
    ));

    return {
      wbsId,
      tasks: taskEvmData,
      buffers: await this.getBuffers(wbsId),
    };
  }

  async getActualCostByDate(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    calculationMode: 'hours' | 'cost'
  ): Promise<Map<string, number>> {
    const workRecords = await prisma.workRecord.findMany({
      where: {
        task: { wbsId },
        date: { gte: startDate, lte: endDate },
      },
      include: {
        task: {
          include: { assignee: true },
        },
      },
    });

    const costMap = new Map<string, number>();
    workRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const cost = calculationMode === 'cost'
        ? Number(record.hours_worked) * (record.task.assignee?.costPerHour || 5000)
        : Number(record.hours_worked);

      costMap.set(dateKey, (costMap.get(dateKey) || 0) + cost);
    });

    return costMap;
  }
}
```

### 5.3 サービス層の実装

#### EvmService
```typescript
@injectable()
export class EvmService {
  constructor(
    @inject(TYPES.IWbsEvmRepository)
    private wbsEvmRepository: IWbsEvmRepository
  ) {}

  async calculateCurrentEvmMetrics(
    wbsId: number,
    evaluationDate: Date = new Date(),
    calculationMode: 'hours' | 'cost' = 'hours',
    progressMethod: ProgressMeasurementMethod = 'SELF_REPORTED'
  ): Promise<EvmMetrics> {
    const wbsData = await this.wbsEvmRepository.getWbsEvmData(wbsId);

    // PV計算
    const pv = wbsData.tasks.reduce((sum, task) =>
      sum + task.getPlannedValueAtDate(evaluationDate, calculationMode), 0
    );

    // EV計算
    const ev = wbsData.tasks.reduce((sum, task) =>
      sum + task.getEarnedValue(calculationMode, progressMethod), 0
    );

    // AC計算
    const actualCostMap = await this.wbsEvmRepository.getActualCostByDate(
      wbsId,
      wbsData.tasks[0]?.plannedStartDate || new Date(),
      evaluationDate,
      calculationMode
    );
    const ac = Array.from(actualCostMap.values()).reduce((sum, cost) => sum + cost, 0);

    // BAC計算
    const bac = calculationMode === 'cost'
      ? wbsData.tasks.reduce((sum, task) =>
          sum + task.plannedManHours * task.costPerHour, 0) +
        wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0)
      : wbsData.tasks.reduce((sum, task) => sum + task.plannedManHours, 0) +
        wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0);

    return new EvmMetrics({
      pv,
      ev,
      ac,
      bac,
      date: evaluationDate,
      calculationMode,
      progressMethod,
    });
  }
}
```

## 6. データベーススキーマとの整合性

### 6.1 既に実装済みのフィールド

✅ `wbs_task.progress_rate` (Decimal, 0-100の実数値)
✅ `wbs_assignee.cost_per_hour` (Float, デフォルト5000円/時間)

### 6.2 Prisma Enumとの整合性

Prismaスキーマで以下のEnumが既に定義されています：

```prisma
enum ProgressMeasurementMethod {
  ZERO_HUNDRED   // 0/100法
  FIFTY_FIFTY    // 50/50法
  SELF_REPORTED  // 自己申告進捗率
}

enum ForecastCalculationMethod {
  CONSERVATIVE      // 保守的
  REALISTIC         // 現実的
  OPTIMISTIC        // 楽観的
  PLANNED_OR_ACTUAL // 予定/実績優先
}
```

**注意**: 設計ドキュメントでは進捗率測定方法を文字列（'0-100', '50-50', 'self-reported'）としていますが、
Prisma Enumに合わせて`ProgressMeasurementMethod`型を使用すべきです。

## 7. 更新が必要な設計ドキュメント箇所

### 7.1 evm-basic-design.md

1. **進捗率測定方法のEnum名の統一**
   - `'0-100'` → `ZERO_HUNDRED`
   - `'50-50'` → `FIFTY_FIFTY`
   - `'self-reported'` → `SELF_REPORTED`

2. **第2フェーズのデータベース設計**
   - `wbs_task.progress_rate`は既に実装済みと明記（完了）
   - `wbs_assignee.cost_per_hour`も既に実装済みと明記（完了）

### 7.2 evm-detailed-design.md

1. **EvmMetricsエンティティの拡張**
   - `bac`, `calculationMode`, `progressMethod`フィールドの追加

2. **リポジトリ設計の見直し**
   - WbsEvmRepository（新規）とWbsQueryRepository（既存活用）の関係を明記
   - 既存EvmRepositoryは外部システム連携用として維持

3. **Enum名の統一**
   - TypeScript型定義をPrisma Enumに合わせる

## 8. 実装スケジュール（修正版）

### 第1フェーズ：基本EVM実装（7日間）

**Day 1: ドメイン層の拡張**
- [ ] EvmMetricsの拡張（bac, calculationMode, progressMethod追加）
- [ ] TaskEvmDataエンティティの作成
- [ ] ProgressMeasurementMethodのEnum定義統一

**Day 2-3: リポジトリ層の実装**
- [ ] IWbsEvmRepositoryインターフェースの定義
- [ ] WbsEvmRepositoryの実装（WbsQueryRepository活用）
- [ ] バッファ情報取得メソッドの実装

**Day 4-5: サービス層の実装**
- [ ] EvmServiceの実装
  - calculateCurrentEvmMetrics
  - getEvmTimeSeries（推測ベース）
  - getTaskEvmDetails
- [ ] 進捗率測定方法のロジック実装

**Day 6: Server Actions実装**
- [ ] evm-actions.tsの作成
  - getCurrentEvmMetrics
  - getEvmTimeSeries
  - getTaskEvmDetails

**Day 7: テスト実装**
- [ ] EvmMetricsのユニットテスト
- [ ] TaskEvmDataのユニットテスト
- [ ] EvmServiceのユニットテスト
- [ ] WbsEvmRepositoryの統合テスト

### 第2フェーズ：履歴機能追加（5日間）

**Day 8: データベース設計**
- [ ] EvmSnapshotエンティティの作成
- [ ] Prismaスキーマの更新（evm_snapshots, task_status_changes）
- [ ] マイグレーション実行

**Day 9-10: 履歴サービス実装**
- [ ] IEvmHistoryRepositoryインターフェース定義
- [ ] EvmHistoryRepositoryの実装
- [ ] EvmHistoryServiceの実装

**Day 11: 自動スナップショット実装**
- [ ] 自動スナップショットAPI（/api/evm/snapshots）
- [ ] Cron設定（日次実行）

**Day 12: テスト・調整**
- [ ] 履歴機能のテスト
- [ ] パフォーマンステスト

## 9. まとめ

### 9.1 主要な結論

1. **新規EvmRepositoryは必要**
   - 既存EvmRepositoryとは責務が異なる
   - データソースが異なる（外部MySQL vs 本プロジェクトPostgreSQL）

2. **WbsQueryRepositoryは積極的に活用すべき**
   - データ取得ロジックの重複を避ける
   - 保守性の向上

3. **設計ドキュメントの更新が必要**
   - Enum名の統一（Prismaスキーマに合わせる）
   - 既存実装との整合性を反映

4. **段階的な実装が可能**
   - 第1フェーズで基本機能を実装
   - 既存機能を壊さずに新機能を追加可能
