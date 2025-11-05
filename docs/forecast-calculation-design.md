# 見通し工数算出機能 基本設計書

## 1. 概要

### 1.1 目的
プロジェクト管理アプリケーションにおいて、タスクの現在の進捗状況を基に将来の工数を予測する「見通し工数算出機能」を実装する。これにより、プロジェクトマネージャーがより正確なスケジュール管理と工数管理を行えるようにする。

### 1.2 スコープ
- タスクレベルでの見通し工数算出
- 月別配分での見通し工数算出
- 複数の算出方式の提供（UI上での選択）
- UI表示での見通し工数の可視化
- Server Actionsを使用したサーバーサイド処理

### 1.3 用語定義
- **見通し工数**: 現時点での最終的な工数予測値
- **ETC (Estimate to Complete)**: 残作業完了までの見積工数
- **SPI (Schedule Performance Index)**: スケジュール効率指標
- **進捗率**: タスクの完了度合い（0-100%）、wbs_taskテーブルで管理

### 1.4 データ保持方針
- **再計算可能なデータは保持しない**: 見通し工数は都度計算で算出
- **設定データは一時的**: ユーザーセッション内での表示制御のみ
- **進捗率はインポート機能拡張**: 既存のMySQL→PostgreSQLインポート機能を拡張してPROGRESS_RATEも取り込み
- **PostgreSQLで進捗率管理**: wbs_taskテーブルにprogress_rateカラムを追加して管理
- **タスク完了優先**: ステータスがCOMPLETEDの場合は進捗率100%として扱う
- **履歴データのみ保持**: 監査・分析目的での進捗履歴は既存テーブルで管理

## 2. 機能要件

### 2.1 見通し算出方式

#### 2.1.1 基本算出ロジック
タスクの状態に応じて以下のロジックで算出する：

| タスク状態 | 算出方法 | 説明 |
|-----------|----------|------|
| COMPLETED | 実績工数 | WorkRecordから集計した確定値 |
| IN_PROGRESS | 実績 + ETC | 実績工数と残作業見積もりの合計 |
| NOT_STARTED | 予定工数 | TaskKosuから取得した当初予定 |
| ON_HOLD | 予定工数 | 保留中は予定工数を維持 |

#### 2.1.2 進行中タスクの詳細算出
進行中タスクについては以下の3つの方式を提供（UI上で選択可能）：

1. **保守的方式**: 最も大きい値を採用（リスク重視）
2. **現実的方式**: 進捗率とパフォーマンス指標を考慮（推奨）
3. **楽観的方式**: 予定工数ベース（理想的シナリオ）

### 2.2 月別配分での見通し算出

#### 2.2.1 時間軸による分類
- **過去月**: WorkRecordから集計した実績工数を使用
- **現在月**: 実績 + 月内残り予測
- **未来月**: タスク見通しから配分比率で算出

#### 2.2.2 現在月の算出ロジック
月の経過率を考慮した段階的な見通し算出を行う。

## 3. データモデル設計

### 3.1 現在の運用フローとシステム構成

#### 3.1.1 現在の運用フロー
```
1. Excel WBS → 進捗率入力
2. 別システム → MySQL wbsテーブルに日次保存（PROGRESS_RATEカラム）
3. 当システム → 既存インポート機能でMySQL→PostgreSQLマッピング（手動実行）
```

#### 3.1.2 PostgreSQL wbs_taskテーブル拡張
```sql
-- progress_rateカラムを追加
ALTER TABLE wbs_task
ADD COLUMN progress_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00;

-- 進捗率は0-100の範囲で管理
ALTER TABLE wbs_task
ADD CONSTRAINT chk_progress_rate
CHECK (progress_rate >= 0 AND progress_rate <= 100);

-- インデックス追加（集計クエリ最適化）
CREATE INDEX idx_wbs_task_progress_status ON wbs_task(status, progress_rate);
```

#### 3.1.3 Prismaスキーマ更新
```prisma
// prisma/schema.prisma
model WbsTask {
  id               Int              @id @default(autoincrement())
  taskNo           String
  wbsId            Int
  phaseId          Int?
  name             String
  assigneeId       Int?
  status           TaskStatus       @default(NOT_STARTED)
  progressRate     Decimal          @default(0.00) @db.Decimal(5,2) // 新規追加
  wbs              Wbs              @relation(fields: [wbsId], references: [id])
  phase            WbsPhase?        @relation(fields: [phaseId], references: [id])
  assignee         WbsAssignee?     @relation("TaskAssignee", fields: [assigneeId], references: [id])
  statusLogs       TaskStatusLog[]  @relation("TaskStatusLogs")
  periods          TaskPeriod[]     @relation("TaskPeriod")
  createdAt        DateTime         @default(now()) @db.Timestamptz
  updatedAt        DateTime         @updatedAt @db.Timestamptz
  workRecords      WorkRecord[]
  predecessors     TaskDependency[] @relation("PredecessorTask")
  successors       TaskDependency[] @relation("SuccessorTask")

  @@unique(fields: [taskNo,wbsId])
  @@index([status, progressRate], name: "idx_wbs_task_progress_status")
  @@map("wbs_task")
}
```

#### 3.1.4 進捗率取得ロジック
```typescript
// 進捗率取得時のロジック（PostgreSQLから）
function getEffectiveProgressRate(status: TaskStatus, progressRate: number): number {
  // タスクが完了している場合は100%を返す（優先ルール）
  if (status === TaskStatus.COMPLETED) {
    return 100;
  }

  // その他の場合はPostgreSQLのprogress_rateをそのまま使用
  return progressRate;
}
```

### 3.2 既存インポート機能の拡張

#### 3.2.1 現在のインポート機能の状況
- **実装済み**: MySQL wbsテーブル → PostgreSQL wbs_taskテーブルのマッピング
- **未実装**: PROGRESS_RATEの取り込み
- **実行方法**: 手動実行

#### 3.2.2 拡張すべき箇所
```typescript
// 既存のインポート機能を拡張してPROGRESS_RATEも取り込む
interface ImportTaskData {
  // 既存フィールド
  taskId: string;
  taskName: string;
  status: string;
  assigneeId: string | null;
  phaseId: string | null;

  // 新規追加
  progressRate: number;  // MySQLのPROGRESS_RATEを追加
}

// インポート処理での進捗率の取り扱い
async function importTasksWithProgress(projectId: string, wbsId: number): Promise<void> {
  // 1. MySQLから進捗率を含むタスクデータを取得
  const mysqlTasks = await getMysqlTasksWithProgress(projectId, wbsId);

  // 2. PostgreSQLに反映（progress_rateカラムに保存）
  for (const mysqlTask of mysqlTasks) {
    await prisma.wbsTask.upsert({
      where: {
        taskNo_wbsId: {
          taskNo: mysqlTask.taskId,
          wbsId: wbsId
        }
      },
      update: {
        name: mysqlTask.taskName,
        status: mapStatusFromMySQL(mysqlTask.status),
        progressRate: mysqlTask.progressRate,  // 進捗率を更新
        assigneeId: await mapAssigneeId(mysqlTask.assigneeId, wbsId),
        phaseId: await mapPhaseId(mysqlTask.phaseId, wbsId),
        updatedAt: new Date()
      },
      create: {
        taskNo: mysqlTask.taskId,
        wbsId: wbsId,
        name: mysqlTask.taskName,
        status: mapStatusFromMySQL(mysqlTask.status),
        progressRate: mysqlTask.progressRate,  // 進捗率を新規作成時にも設定
        assigneeId: await mapAssigneeId(mysqlTask.assigneeId, wbsId),
        phaseId: await mapPhaseId(mysqlTask.phaseId, wbsId)
      }
    });
  }
}
```

#### 3.2.3 PostgreSQLからの進捗率取得
```sql
-- PostgreSQLからタスク基本情報（progress_rate含む）を取得
SELECT
  id,
  taskNo,
  name,
  status,
  assigneeId,
  phaseId,
  progress_rate  -- 新規追加されたカラム
FROM wbs_task
WHERE wbsId = ?
```

#### 3.2.2 工数データ
```sql
-- TaskKosuから予定・基準工数を取得
SELECT
  tk.periodId,
  tk.kosu,
  tk.type,
  tp.type as periodType,
  tp.startDate,
  tp.endDate
FROM task_kosu tk
JOIN task_period tp ON tk.periodId = tp.id
WHERE tk.wbsId = ?
```

#### 3.2.3 実績工数データ
```sql
-- WorkRecordから実績工数を取得
SELECT
  taskId,
  date,
  hours_worked
FROM work_records
WHERE taskId IN (SELECT id FROM wbs_task WHERE wbsId = ?)
```

### 3.3 データ型定義の拡張

#### 3.3.1 既存型の拡張
```typescript
// src/applications/wbs/query/wbs-summary-result.ts

export interface MonthlyAssigneeData {
  assignee: string;
  month: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
  baselineHours: number;    // TaskPeriod(KIJUN) + TaskKosuから算出
  forecastHours: number;    // 算出される見通し工数
  taskDetails?: TaskAllocationDetail[];
}

export interface ForecastCalculationContext {
  currentDate: Date;
  method: 'conservative' | 'realistic' | 'optimistic';
}

// タスクデータ（progress_rate含む）
export interface TaskForecastData {
  id: number;
  taskNo: string;
  name: string;
  status: TaskStatus;
  progressRate: number;     // wbs_task.progress_rateから直接取得
  assigneeId: number | null;
  plannedHours: number;
  actualHours: number;
  baselineHours: number;
}
```

## 4. システム設計

### 4.1 アーキテクチャ概要

```
├── UI Layer
│   ├── MonthlyAssigneeSummary (表示切り替え機能追加)
│   ├── MonthlyPhaseSummary (表示切り替え機能追加)
│   └── ForecastMethodSelector (新規)
├── Application Layer
│   ├── ForecastCalculationService (新規)
│   └── WbsSummaryQueryService (拡張)
├── Domain Layer
│   ├── ForecastCalculator (新規)
│   ├── TaskProgressEvaluator (新規)
│   └── MonthlyAllocationCalculator (拡張)
└── Infrastructure Layer
    ├── TaskRepository (既存)
    ├── WorkRecordRepository (既存)
    └── ProgressHistoryRepository (既存)
```

### 4.2 主要クラス設計

#### 4.2.1 ForecastCalculator
```typescript
// src/domains/forecast/forecast-calculator.ts
export class ForecastCalculator {
  static calculateTaskForecast(
    task: TaskData,
    progressRate: number,
    actualHours: number,
    plannedHours: number,
    method: ForecastMethod
  ): number

  static calculateMonthlyForecast(
    taskForecast: number,
    monthAllocation: MonthlyAllocation,
    month: string,
    currentDate: Date
  ): number

  private static calculateConservativeForecast(...): number
  private static calculateRealisticForecast(...): number
  private static calculateOptimisticForecast(...): number
}
```

#### 4.2.2 ForecastCalculationService
```typescript
// src/applications/forecast/forecast-calculation-service.ts
export class ForecastCalculationService {
  async calculateMonthlyAssigneeForecast(
    projectId: string,
    wbsId: number,
    context: ForecastCalculationContext
  ): Promise<MonthlyAssigneeForecastResult>

  async calculateMonthlyPhaseForecast(
    projectId: string,
    wbsId: number,
    context: ForecastCalculationContext
  ): Promise<MonthlyPhaseForecastResult>

  private async gatherTaskData(wbsId: number): Promise<TaskForecastData[]>
  private async gatherProgressData(wbsId: number): Promise<Map<number, number>>
  private async gatherWorkRecordData(wbsId: number): Promise<Map<number, number>>
}
```

### 4.3 算出ロジックの詳細

#### 4.3.1 進行中タスクの見通し算出
```typescript
// 現実的方式（推奨）
function calculateRealisticForecast(
  actualHours: number,
  plannedHours: number,
  progressRate: number
): number {
  if (progressRate >= 100) {
    return actualHours;
  }

  if (progressRate <= 0) {
    return plannedHours;
  }

  // EAC (Estimate at Completion) = AC + ETC
  // ETC = (BAC - EV) / CPI
  // ここでは簡略化してSPIベースで算出
  const earnedValue = plannedHours * (progressRate / 100);
  const spi = earnedValue > 0 ? actualHours / earnedValue : 1;

  const remainingWork = plannedHours * (1 - progressRate / 100);
  const forecastRemaining = remainingWork * Math.max(spi, 0.5); // 最低でも50%効率

  return actualHours + forecastRemaining;
}

// 保守的方式
function calculateConservativeForecast(
  actualHours: number,
  plannedHours: number,
  progressRate: number
): number {
  const realistic = calculateRealisticForecast(actualHours, plannedHours, progressRate);
  const worstCase = actualHours + (plannedHours * 1.5); // 150%の安全係数

  return Math.max(realistic, worstCase);
}

// 楽観的方式
function calculateOptimisticForecast(
  actualHours: number,
  plannedHours: number,
  progressRate: number
): number {
  if (progressRate >= 100) {
    return actualHours;
  }

  // 予定工数を基準とし、現在の効率が良ければそれを反映
  if (progressRate > 0) {
    const efficiency = (plannedHours * progressRate / 100) / actualHours;
    if (efficiency > 1) {
      return plannedHours / efficiency;
    }
  }

  return plannedHours;
}
```

#### 4.3.2 月別配分の算出
```typescript
function calculateMonthlyForecast(
  taskForecast: number,
  originalMonthlyAllocation: number,
  originalTaskTotal: number,
  month: string,
  currentDate: Date,
  actualHoursInMonth: number
): number {
  const monthDate = new Date(month + '-01');
  const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  // 過去月：実績値
  if (monthDate < currentMonth) {
    return actualHoursInMonth;
  }

  // 現在月：実績 + 残り見通し
  if (monthDate.getTime() === currentMonth.getTime()) {
    const monthProgress = calculateMonthProgress(currentDate);
    const expectedMonthlyForecast = taskForecast * (originalMonthlyAllocation / originalTaskTotal);
    const remainingInMonth = expectedMonthlyForecast * (1 - monthProgress);

    return actualHoursInMonth + remainingInMonth;
  }

  // 未来月：タスク見通しから比例配分
  const allocationRatio = originalMonthlyAllocation / originalTaskTotal;
  return taskForecast * allocationRatio;
}
```

## 5. Server Actions設計

### 5.1 Server Actions構成

#### 5.1.1 見通し算出関連
```typescript
// src/app/(protected)/wbs/[id]/actions.ts

// WBS集計データ取得（見通し含む）
export async function getWbsSummaryWithForecast(
  projectId: string,
  wbsId: number,
  context: ForecastCalculationContext
): Promise<WbsSummaryWithForecastResult> {
  'use server';

  try {
    // 認証確認
    const session = await getServerSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // 見通し算出サービス実行（PostgreSQLのprogress_rateを使用）
    const forecastService = container.get<ForecastCalculationService>(
      TYPES.ForecastCalculationService
    );

    const result = await forecastService.calculateWbsSummaryWithForecast(
      projectId,
      wbsId,
      context
    );

    return {
      success: true,
      data: result,
      calculatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to calculate forecast:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

#### 5.1.2 既存インポート機能拡張
```typescript
// 既存のインポート機能を拡張してPROGRESS_RATEも取り込む
export async function runImportWithProgress(
  projectId: string,
  wbsId: number
): Promise<ActionResult<ImportResult>> {
  'use server';

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // 既存のインポートサービスを拡張
    const importService = container.get<ImportService>(TYPES.ImportService);

    // MySQL → PostgreSQL インポート（進捗率含む）
    const result = await importService.importTasksWithProgress(
      projectId,
      wbsId,
      session.user.id
    );

    // キャッシュ無効化
    revalidateTag(`wbs-summary-${wbsId}`);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Failed to import tasks with progress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import tasks'
    };
  }
}

// インポートサービスの拡張実装
export class ImportService {
  async importTasksWithProgress(
    projectId: string,
    wbsId: number,
    userId: string
  ): Promise<ImportResult> {
    // 1. MySQLから進捗率を含むタスクデータを取得
    const mysqlTasks = await this.getMysqlTasksWithProgress(projectId, wbsId);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 2. PostgreSQLに反映（progress_rateカラムに保存）
    for (const mysqlTask of mysqlTasks) {
      try {
        await prisma.wbsTask.upsert({
          where: {
            taskNo_wbsId: {
              taskNo: mysqlTask.taskId,
              wbsId: wbsId
            }
          },
          update: {
            name: mysqlTask.taskName,
            status: this.mapStatusFromMySQL(mysqlTask.status),
            progressRate: mysqlTask.progressRate,  // 進捗率を更新
            assigneeId: await this.mapAssigneeId(mysqlTask.assigneeId, wbsId),
            phaseId: await this.mapPhaseId(mysqlTask.phaseId, wbsId),
            updatedAt: new Date()
          },
          create: {
            taskNo: mysqlTask.taskId,
            wbsId: wbsId,
            name: mysqlTask.taskName,
            status: this.mapStatusFromMySQL(mysqlTask.status),
            progressRate: mysqlTask.progressRate,  // 進捗率を新規作成時にも設定
            assigneeId: await this.mapAssigneeId(mysqlTask.assigneeId, wbsId),
            phaseId: await this.mapPhaseId(mysqlTask.phaseId, wbsId)
          }
        });

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Task ${mysqlTask.taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 3. インポート履歴記録
    await this.recordImportHistory(projectId, wbsId, userId, {
      totalRecords: mysqlTasks.length,
      successCount,
      errorCount,
      errors
    });

    return {
      totalRecords: mysqlTasks.length,
      successCount,
      errorCount,
      errors
    };
  }

  private async getMysqlTasksWithProgress(
    projectId: string,
    wbsId: number
  ): Promise<ImportTaskData[]> {
    // MySQLから進捗率を含むデータを取得
    const mysqlConnection = getMysqlConnection();

    const query = `
      SELECT
        TASK_ID as taskId,
        TASK_NAME as taskName,
        STATUS as status,
        PROGRESS_RATE as progressRate,  -- 進捗率も取得
        ASSIGNEE_ID as assigneeId,
        PHASE_ID as phaseId
      FROM wbs
      WHERE PROJECT_ID = ? AND WBS_ID = ?
    `;

    return await mysqlConnection.execute(query, [projectId, wbsId]);
  }
}
```

#### 5.1.3 型定義
```typescript
// src/app/(protected)/wbs/[id]/types.ts

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WbsSummaryWithForecastResult {
  // 既存フィールド
  phaseSummaries: PhaseSummary[];
  assigneeSummaries: AssigneeSummary[];
  monthlyAssigneeSummary: MonthlyAssigneeSummary;

  // 見通し関連フィールド
  forecastContext: {
    calculatedAt: string;
    method: ForecastMethod;
    taskCount: number;
    averageConfidence: number;
  };
}

export type ForecastMethod = 'conservative' | 'realistic' | 'optimistic';

// インポート機能拡張用の型定義
export interface ImportTaskData {
  taskId: string;
  taskName: string;
  status: string;
  progressRate: number;  // 進捗率を追加
  assigneeId: string | null;
  phaseId: string | null;
}

export interface ImportResult {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

// PostgreSQLのタスク進捗データ
export interface TaskProgressData {
  taskId: number;
  taskNo: string;
  name: string;
  status: TaskStatus;
  progressRate: number;     // PostgreSQLのprogress_rateから取得
  effectiveProgressRate: number; // 完了ステータス考慮後の有効進捗率
  assigneeId: number | null;
}
```

## 6. UI/UX設計

### 6.1 表示制御機能

#### 6.1.1 月別集計表での表示切り替え
- ✅ 既実装：差分列の表示/非表示切り替え
- ✅ 既実装：基準列の表示/非表示切り替え（データはダミー）
- ✅ 既実装：見通し列の表示/非表示切り替え（データはダミー）

#### 6.1.2 見通し算出方式選択
```tsx
// src/components/wbs/forecast-method-selector.tsx
'use client';

import { useState, useTransition } from 'react';
import { getWbsSummaryWithForecast } from '@/app/(protected)/wbs/[id]/actions';

export function ForecastMethodSelector({
  projectId,
  wbsId,
  onMethodChange
}: {
  projectId: string;
  wbsId: number;
  onMethodChange: (method: ForecastMethod) => void;
}) {
  const [method, setMethod] = useState<ForecastMethod>('realistic');
  const [isPending, startTransition] = useTransition();

  const handleMethodChange = (newMethod: ForecastMethod) => {
    setMethod(newMethod);

    startTransition(async () => {
      const context = {
        currentDate: new Date(),
        method: newMethod
      };

      const result = await getWbsSummaryWithForecast(projectId, wbsId, context);

      if (result.success) {
        onMethodChange(newMethod);
      }
    });
  };

  return (
    <Select
      value={method}
      onValueChange={handleMethodChange}
      disabled={isPending}
    >
      <SelectItem value="realistic">現実的（推奨）</SelectItem>
      <SelectItem value="conservative">保守的（リスク重視）</SelectItem>
      <SelectItem value="optimistic">楽観的（理想的）</SelectItem>
    </Select>
  );
}
```

#### 6.1.3 既存インポート機能の拡張
```tsx
// src/components/wbs/import-with-progress.tsx
'use client';

import { useState, useTransition } from 'react';
import { runImportWithProgress } from '@/app/(protected)/wbs/[id]/actions';

export function ImportWithProgressComponent({
  projectId,
  wbsId,
  onImportComplete
}: {
  projectId: string;
  wbsId: number;
  onImportComplete: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleImport = () => {
    startTransition(async () => {
      const result = await runImportWithProgress(projectId, wbsId);

      if (result.success) {
        setImportResult(result.data!);
        onImportComplete();
      } else {
        // エラーハンドリング
        console.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleImport}
          disabled={isPending}
        >
          {isPending ? 'インポート中...' : 'MySQLから進捗率込みでインポート'}
        </Button>
        <span className="text-sm text-gray-600">
          MySQL wbsテーブルからPROGRESS_RATEを含むデータを取り込みます
        </span>
      </div>

      {importResult && (
        <Alert>
          <AlertDescription>
            インポート完了: {importResult.successCount}件成功, {importResult.errorCount}件エラー
            {importResult.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">エラー詳細</summary>
                <ul className="mt-1 text-sm">
                  {importResult.errors.map((error, index) => (
                    <li key={index} className="text-red-600">
                      {error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">インポート機能について</h4>
        <ul className="text-xs space-y-1 text-gray-700">
          <li>• 既存のインポート機能を拡張してPROGRESS_RATEも取り込みます</li>
          <li>• MySQLのwbsテーブルからPostgreSQLのwbs_taskテーブルに進捗率を反映</li>
          <li>• 完了ステータスのタスクは進捗率100%として扱われます</li>
          <li>• インポート後、見通し工数の算出が可能になります</li>
        </ul>
      </div>
    </div>
  );
}
```

#### 6.1.3 信頼度表示
```tsx
// 信頼度による色分け
<TableCell className={cn(
  "text-right text-sm",
  confidence >= 80 ? "text-green-600" :
  confidence >= 50 ? "text-yellow-600" : "text-red-600"
)}>
  {formatNumber(forecastHours)}
  <Badge variant="outline" className="ml-1">
    {confidence}%
  </Badge>
</TableCell>
```

### 6.2 ユーザーフィードバック

#### 6.2.1 算出中の表示
```tsx
<div className="space-y-2">
  <Progress value={calculationProgress} />
  <p className="text-sm text-gray-600">
    見通し工数を算出中... ({completedTasks}/{totalTasks})
  </p>
</div>
```

#### 6.2.2 算出結果の要約
```tsx
<Alert>
  <AlertDescription>
    見通し工数算出完了（{forecastMethod}方式）
    <br />
    対象タスク: {totalTasks}件、平均信頼度: {averageConfidence}%
  </AlertDescription>
</Alert>
```

## 7. 実装計画

### 7.1 フェーズ1: データモデル・既存機能拡張 (3週間)
1. **Week 1**: データベース拡張・インポート機能拡張
   - PostgreSQL wbs_taskテーブルにprogress_rateカラム追加
   - 既存インポート機能でPROGRESS_RATE取り込み拡張
   - 進捗率取得ロジック実装（完了ステータス優先）
   - ForecastCalculatorドメインロジック実装
   - 基本算出ロジック（3方式）
   - 単体テスト作成

2. **Week 2**: ForecastCalculationService・Server Actions実装
   - PostgreSQLからの進捗率取得処理
   - 集計処理
   - Server Actions実装（見通し算出・インポート拡張）
   - 統合テスト作成

3. **Week 3**: UI実装・統合
   - 拡張インポート機能UI
   - 見通し算出方式選択UI
   - フロントエンドでの表示切り替え機能実装

### 7.2 フェーズ2: 最適化・運用準備 (2週間)
1. **Week 4**: パフォーマンス最適化
   - SQLクエリ最適化
   - Server Actionsでのキャッシュ機能追加
   - 負荷テスト

2. **Week 5**: 品質向上・ドキュメント
   - E2Eテスト作成
   - ユーザーガイド作成
   - 運用監視設定

### 7.3 技術的考慮事項

#### 7.3.1 パフォーマンス対策
- **データ取得の最適化**: 必要な期間のデータのみ取得
- **Server Actionsでのキャッシュ**: Next.jsのrevalidateTagを活用
- **並列処理**: Server Actions内での並列データ取得
- **プログレッシブロード**: 大量データでのチャンク処理

#### 7.3.2 データ整合性
- **トランザクション管理**: 関連データの一貫性保証
- **バリデーション**: 不正な進捗率・工数データの検出
- **エラーハンドリング**: Server Actions内での適切なエラーレスポンス

## 8. 品質保証

### 8.1 テスト戦略

#### 8.1.1 単体テスト
```typescript
// src/__tests__/domains/forecast/forecast-calculator.test.ts
describe('ForecastCalculator', () => {
  describe('calculateTaskForecast', () => {
    test('完了タスクは実績工数を返す', () => {
      const result = ForecastCalculator.calculateTaskForecast(
        mockCompletedTask,
        100, // progressRate
        50,  // actualHours
        40,  // plannedHours
        'realistic'
      );
      expect(result).toBe(50);
    });

    test('進行中タスクは方式により異なる値を返す', () => {
      const conservativeResult = ForecastCalculator.calculateTaskForecast(
        mockInProgressTask, 50, 30, 40, 'conservative'
      );
      const realisticResult = ForecastCalculator.calculateTaskForecast(
        mockInProgressTask, 50, 30, 40, 'realistic'
      );
      const optimisticResult = ForecastCalculator.calculateTaskForecast(
        mockInProgressTask, 50, 30, 40, 'optimistic'
      );

      expect(conservativeResult).toBeGreaterThan(realisticResult);
      expect(realisticResult).toBeGreaterThanOrEqual(optimisticResult);
    });
  });
});
```

#### 8.1.2 Server Actions統合テスト
```typescript
// src/__tests__/app/wbs/actions.test.ts
describe('WBS Server Actions', () => {
  test('見通し算出Server Action', async () => {
    const context = {
      currentDate: new Date(),
      method: 'realistic' as const
    };

    const result = await getWbsSummaryWithForecast(
      projectId,
      wbsId,
      context
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.forecastContext.method).toBe('realistic');
  });

  test('Excelインポート機能のServer Action', async () => {
    // テスト用Excelファイルを作成
    const testFile = createTestExcelFile([
      { taskId: 'TASK-001', progressRate: 75 },
      { taskId: 'TASK-002', progressRate: 50 }
    ]);

    const result = await importProgressFromExcel(projectId, wbsId, testFile);

    expect(result.success).toBe(true);
    expect(result.data?.successCount).toBe(2);
    expect(result.data?.errorCount).toBe(0);
  });

  test('進捗率統合取得のテスト（完了ステータス優先）', async () => {
    // PostgreSQLでタスクをCOMPLETEDに設定
    await prisma.wbsTask.update({
      where: { id: taskId },
      data: { status: 'COMPLETED' }
    });

    // MySQLで進捗率を50%に設定（意図的に100%未満）
    await updateMysqlProgress(projectId, wbsId, 'TASK-001', 50);

    // 統合データ取得
    const progressData = await getTaskProgressData(projectId, wbsId);
    const targetTask = progressData.find(t => t.taskNo === 'TASK-001');

    // 完了ステータスが優先されて100%になることを確認
    expect(targetTask?.rawProgressRate).toBe(50);
    expect(targetTask?.effectiveProgressRate).toBe(100);
  });
});
```

#### 8.1.3 E2Eテスト
```typescript
// src/__tests__/e2e/forecast-display.spec.ts
test('見通し工数の表示切り替えとServer Actions連携', async ({ page }) => {
  await page.goto(`/wbs/${wbsId}`);

  // 設定ボタンクリック
  await page.click('[data-testid="forecast-settings"]');

  // 見通し表示を有効化
  await page.check('#show-forecast');

  // 見通し列が表示されることを確認
  await expect(page.locator('[data-testid="forecast-column"]')).toBeVisible();

  // 算出方式を変更（Server Actionが実行される）
  await page.selectOption('[data-testid="forecast-method"]', 'conservative');

  // ローディング状態の確認
  await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

  // 値が更新されることを確認（Server Actionの結果）
  await expect(page.locator('[data-testid="forecast-value"]')).not.toHaveText('0');
});

test('Excelインポート機能のE2Eテスト', async ({ page }) => {
  await page.goto(`/wbs/${wbsId}`);

  // インポートボタンをクリック
  await page.click('[data-testid="import-progress-button"]');

  // テスト用Excelファイルをアップロード
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-files/progress-data.xlsx');

  // インポート処理の開始を確認
  await expect(page.locator('text=インポート中...')).toBeVisible();

  // インポート完了メッセージを確認
  await expect(page.locator('text=インポート完了')).toBeVisible({ timeout: 10000 });

  // 進捗率が更新されていることを確認
  await expect(page.locator('[data-testid="task-progress-001"]')).toHaveText('75%');
  await expect(page.locator('[data-testid="task-progress-002"]')).toHaveText('50%');
});

test('完了ステータス優先の表示確認', async ({ page }) => {
  // タスクを完了状態に設定
  await setTaskStatus('TASK-001', 'COMPLETED');
  // MySQLで進捗率を意図的に50%に設定
  await setMysqlProgress('TASK-001', 50);

  await page.goto(`/wbs/${wbsId}`);

  // 完了タスクの進捗率が100%と表示されることを確認
  await expect(page.locator('[data-testid="task-progress-001"]')).toHaveText('100%');

  // 見通し算出でも100%が使用されることを確認
  await page.check('#show-forecast');
  await expect(page.locator('[data-testid="forecast-task-001"]')).toContainText('100%');
});
```

### 8.2 品質指標
- **算出精度**: 過去データでの検証（±10%以内の精度目標）
- **パフォーマンス**: 1000タスクで5秒以内の算出
- **可用性**: 算出失敗時の代替値表示
- **ユーザビリティ**: UI操作の直感性確認

## 9. 運用・監視

### 9.1 ログ出力
```typescript
// 算出処理のログ
logger.info('Forecast calculation started', {
  wbsId,
  method,
  taskCount,
  userId
});

logger.info('Forecast calculation completed', {
  wbsId,
  method,
  duration: endTime - startTime,
  averageConfidence
});

// エラーログ
logger.error('Forecast calculation failed', {
  wbsId,
  error: error.message,
  taskId: failedTaskId
});
```

### 9.2 メトリクス監視
- 算出処理の実行時間
- 算出精度の追跡
- エラー発生率
- ユーザーの使用頻度

### 9.3 アラート設定
- 算出処理の異常な遅延
- 大幅な精度低下
- 連続する算出失敗

この設計により、既存のデータ構造を最大限活用しながら、正確で実用的な見通し工数算出機能を提供できます。