# ガントチャートV3 Server Actions仕様書

## 概要

本ドキュメントは、ガントチャートV3で新たに追加されるServer Actionsの詳細仕様を定義します。Next.js 15の`use server`を活用し、依存関係管理、クリティカルパス計算、自動スケジューリング、リソース管理の機能を提供します。

## 基本情報

- **実装方式**: Next.js Server Actions (`use server`)
- **認証**: セッションベース認証 (既存のユーザー認証システムを利用)
- **データ形式**: TypeScript型安全なオブジェクト
- **文字エンコード**: UTF-8
- **タイムゾーン**: システム設定に従う（日本時間想定）

## Server Actions一覧

### 依存関係管理Actions

#### fetchTaskDependencies
タスクの依存関係一覧を取得

**ファイル**: `/src/app/actions/task-dependencies.ts`

```typescript
'use server'

export async function fetchTaskDependencies(wbsId: number) {
  // セッション認証チェック
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  // 権限チェック
  await checkPermission(session.user.id, wbsId, 'VIEW_GANTT');
  
  const dependencies = await container.get<TaskDependencyService>('TaskDependencyService')
    .findByWbsId(wbsId);
    
  return {
    success: true,
    data: dependencies
  };
}
```

**戻り値型**
```typescript
type FetchDependenciesResult = {
  success: boolean;
  data: Array<{
    id: number;
    predecessorId: number;
    successorId: number;
    type: DependencyType;
    lagDays: number;
    createdAt: Date;
    updatedAt: Date;
    predecessor: {
      id: number;
      name: string;
      phaseId: number;
      phaseName: string;
    };
    successor: {
      id: number;
      name: string;
      phaseId: number;
      phaseName: string;
    };
  }>;
  error?: string;
}
```

#### createTaskDependency
新しい依存関係を作成

```typescript
'use server'

interface CreateDependencyInput {
  wbsId: number;
  predecessorId: number;
  successorId: number;
  type: DependencyType;
  lagDays?: number;
}

export async function createTaskDependency(input: CreateDependencyInput) {
  // セッション認証チェック
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  // 権限チェック
  await checkPermission(session.user.id, input.wbsId, 'MANAGE_DEPENDENCIES');
  
  // 入力値検証
  const validationResult = validateCreateDependencyInput(input);
  if (!validationResult.isValid) {
    return {
      success: false,
      error: validationResult.errors.join(', ')
    };
  }
  
  try {
    const dependencyService = container.get<TaskDependencyService>('TaskDependencyService');
    const autoScheduler = container.get<AutoScheduler>('AutoScheduler');
    
    // 依存関係作成
    const dependency = await dependencyService.create(input);
    
    // 自動スケジューリング実行
    const schedulingResult = await autoScheduler.scheduleAffectedTasks(
      input.wbsId,
      dependency.successorId
    );
    
    return {
      success: true,
      data: {
        dependency,
        affectedTasks: schedulingResult.updatedTasks
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '依存関係の作成に失敗しました'
    };
  }
}
```

**戻り値型**
```typescript
type CreateDependencyResult = {
  success: boolean;
  data?: {
    dependency: {
      id: number;
      predecessorId: number;
      successorId: number;
      type: DependencyType;
      lagDays: number;
      createdAt: Date;
      updatedAt: Date;
    };
    affectedTasks?: Array<{
      id: number;
      newStartDate: Date;
      newEndDate: Date;
      changeReason: string;
    }>;
  };
  error?: string;
}
```

#### updateTaskDependency
既存の依存関係を更新

```typescript
'use server'

interface UpdateDependencyInput {
  wbsId: number;
  dependencyId: number;
  type?: DependencyType;
  lagDays?: number;
}

export async function updateTaskDependency(input: UpdateDependencyInput) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, input.wbsId, 'MANAGE_DEPENDENCIES');
  
  try {
    const dependencyService = container.get<TaskDependencyService>('TaskDependencyService');
    const dependency = await dependencyService.update(input.dependencyId, {
      type: input.type,
      lagDays: input.lagDays
    });
    
    // 影響するタスクの自動調整
    const autoScheduler = container.get<AutoScheduler>('AutoScheduler');
    const schedulingResult = await autoScheduler.scheduleAffectedTasks(
      input.wbsId,
      dependency.successorId
    );
    
    return {
      success: true,
      data: {
        dependency,
        affectedTasks: schedulingResult.updatedTasks
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '依存関係の更新に失敗しました'
    };
  }
}
```

#### deleteTaskDependency
依存関係を削除

```typescript
'use server'

export async function deleteTaskDependency(wbsId: number, dependencyId: number) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, wbsId, 'MANAGE_DEPENDENCIES');
  
  try {
    const dependencyService = container.get<TaskDependencyService>('TaskDependencyService');
    await dependencyService.delete(dependencyId);
    
    return {
      success: true,
      data: {
        deletedDependencyId: dependencyId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '依存関係の削除に失敗しました'
    };
  }
}
```

### クリティカルパス分析Actions

#### calculateCriticalPath
クリティカルパスを計算して返す

**ファイル**: `/src/app/actions/critical-path.ts`

```typescript
'use server'

interface CriticalPathOptions {
  wbsId: number;
  recalculate?: boolean;
}

export async function calculateCriticalPath(options: CriticalPathOptions) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, options.wbsId, 'VIEW_GANTT');
  
  try {
    const criticalPathService = container.get<CriticalPathService>('CriticalPathService');
    
    const result = await criticalPathService.calculatePath(
      options.wbsId,
      { forceRecalculate: options.recalculate }
    );
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'クリティカルパス計算に失敗しました'
    };
  }
}
```

**戻り値型**
```typescript
type CriticalPathResult = {
  success: boolean;
  data?: {
    criticalPath: {
      taskIds: number[];
      totalDuration: number;
      startDate: Date;
      endDate: Date;
      calculatedAt: Date;
    };
    taskSchedules: Array<{
      taskId: number;
      taskName: string;
      earlyStart: Date;
      earlyFinish: Date;
      lateStart: Date;
      lateFinish: Date;
      totalFloat: number;
      freeFloat: number;
      isCritical: boolean;
    }>;
    projectStats: {
      totalTasks: number;
      criticalTasks: number;
      bufferTime: number;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  };
  error?: string;
}
```

### 自動スケジューリングActions

#### executeAutoScheduling
依存関係に基づいて自動スケジューリングを実行

**ファイル**: `/src/app/actions/auto-scheduling.ts`

```typescript
'use server'

interface AutoSchedulingOptions {
  wbsId: number;
  preserveUserChanges?: boolean;
  baselineType?: 'KIJUN' | 'YOTEI';
  triggerTaskId?: number;
  newStartDate?: Date;
  newEndDate?: Date;
  checkResourceConstraints?: boolean;
  allowDateExtension?: boolean;
}

export async function executeAutoScheduling(options: AutoSchedulingOptions) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, options.wbsId, 'AUTO_SCHEDULE');
  
  const startTime = performance.now();
  
  try {
    const autoScheduler = container.get<AutoScheduler>('AutoScheduler');
    
    const result = await autoScheduler.scheduleProject({
      wbsId: options.wbsId,
      preserveUserChanges: options.preserveUserChanges ?? true,
      baselineType: options.baselineType ?? 'YOTEI',
      triggerTask: options.triggerTaskId ? {
        id: options.triggerTaskId,
        newStartDate: options.newStartDate,
        newEndDate: options.newEndDate
      } : undefined,
      constraints: {
        checkResources: options.checkResourceConstraints ?? false,
        allowDateExtension: options.allowDateExtension ?? true
      }
    });
    
    const processingTime = performance.now() - startTime;
    
    return {
      success: true,
      data: {
        ...result,
        processingTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '自動スケジューリングに失敗しました'
    };
  }
}
```

**戻り値型**
```typescript
type AutoSchedulingResult = {
  success: boolean;
  data?: {
    updatedTasks: Array<{
      id: number;
      name: string;
      originalStartDate: Date;
      originalEndDate: Date;
      newStartDate: Date;
      newEndDate: Date;
      changeReason: string;
      wasUserModified: boolean;
    }>;
    conflicts: Array<{
      taskId: number;
      taskName: string;
      conflictType: 'DEPENDENCY' | 'RESOURCE' | 'CALENDAR';
      description: string;
      severity: 'WARNING' | 'ERROR';
      suggestedResolution?: string;
    }>;
    projectImpact: {
      originalEndDate: Date;
      newEndDate: Date;
      delayDays: number;
      affectedMilestones: Array<{
        id: number;
        name: string;
        originalDate: Date;
        newDate: Date;
      }>;
    };
    processingTime: number;
  };
  error?: string;
}
```

#### validateScheduleConstraints
スケジュール制約の検証のみを実行（実際の更新は行わない）

```typescript
'use server'

interface ScheduleValidationInput {
  wbsId: number;
  tasks: Array<{
    id: number;
    startDate: Date;
    endDate: Date;
  }>;
  checkDependencies?: boolean;
  checkResources?: boolean;
}

export async function validateScheduleConstraints(input: ScheduleValidationInput) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, input.wbsId, 'VIEW_GANTT');
  
  try {
    const scheduleValidator = container.get<ScheduleValidator>('ScheduleValidator');
    
    const result = await scheduleValidator.validate({
      wbsId: input.wbsId,
      proposedTasks: input.tasks,
      checkDependencies: input.checkDependencies ?? true,
      checkResources: input.checkResources ?? true
    });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'スケジュール検証に失敗しました'
    };
  }
}
```

**戻り値型**
```typescript
type ScheduleValidationResult = {
  success: boolean;
  data?: {
    isValid: boolean;
    violations: Array<{
      taskId: number;
      violationType: 'DEPENDENCY' | 'RESOURCE' | 'CALENDAR';
      description: string;
      severity: 'WARNING' | 'ERROR';
    }>;
    suggestions: Array<{
      taskId: number;
      suggestedStartDate: Date;
      suggestedEndDate: Date;
      reason: string;
    }>;
  };
  error?: string;
}
```

### リソース管理Actions

#### fetchResourceUtilization
リソース（担当者）の利用状況を取得

**ファイル**: `/src/app/actions/resource-management.ts`

```typescript
'use server'

interface ResourceUtilizationOptions {
  wbsId: number;
  startDate?: Date;
  endDate?: Date;
  assigneeIds?: number[];
}

export async function fetchResourceUtilization(options: ResourceUtilizationOptions) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, options.wbsId, 'VIEW_GANTT');
  
  try {
    const resourceService = container.get<ResourceUtilizationService>('ResourceUtilizationService');
    
    const result = await resourceService.calculateUtilization({
      wbsId: options.wbsId,
      period: options.startDate && options.endDate ? {
        start: options.startDate,
        end: options.endDate
      } : undefined,
      assigneeIds: options.assigneeIds
    });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'リソース利用状況の取得に失敗しました'
    };
  }
}
```

#### fetchResourceConflicts
リソース競合の詳細情報を取得

```typescript
'use server'

export async function fetchResourceConflicts(wbsId: number) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, wbsId, 'VIEW_GANTT');
  
  try {
    const conflictDetector = container.get<ResourceConflictDetector>('ResourceConflictDetector');
    
    const result = await conflictDetector.detectConflicts(wbsId);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'リソース競合の取得に失敗しました'
    };
  }
}
```

#### executeResourceLeveling
リソースの負荷平準化を実行

```typescript
'use server'

interface ResourceLevelingOptions {
  wbsId: number;
  priorityTaskIds?: number[];
  allowDateExtension?: boolean;
  maxDelayDays?: number;
  levelingStrategy?: 'MINIMIZE_DELAY' | 'BALANCE_LOAD' | 'PRIORITIZE_CRITICAL';
}

export async function executeResourceLeveling(options: ResourceLevelingOptions) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, options.wbsId, 'MANAGE_RESOURCES');
  
  try {
    const resourceLeveler = container.get<ResourceLeveler>('ResourceLeveler');
    
    const result = await resourceLeveler.levelResources({
      wbsId: options.wbsId,
      priorityTasks: options.priorityTaskIds ?? [],
      allowDateExtension: options.allowDateExtension ?? true,
      maxDelayDays: options.maxDelayDays,
      strategy: options.levelingStrategy ?? 'MINIMIZE_DELAY'
    });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'リソース平準化の実行に失敗しました'
    };
  }
}
```

#### updateAssigneeCapacity
担当者の稼働可能時間を更新

```typescript
'use server'

interface CapacityUpdateInput {
  wbsId: number;
  assigneeId: number;
  capacities: Array<{
    date: Date;
    availableHours: number;
  }>;
}

export async function updateAssigneeCapacity(input: CapacityUpdateInput) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, input.wbsId, 'MANAGE_RESOURCES');
  
  try {
    const capacityService = container.get<AssigneeCapacityService>('AssigneeCapacityService');
    
    const result = await capacityService.updateCapacities(
      input.assigneeId,
      input.capacities
    );
    
    return {
      success: true,
      data: {
        updatedCapacities: result
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '稼働可能時間の更新に失敗しました'
    };
  }
}
```

**戻り値型**
```typescript
type ResourceUtilizationResult = {
  success: boolean;
  data?: {
    utilization: Array<{
      assigneeId: number;
      assigneeName: string;
      totalAllocatedHours: number;
      totalAvailableHours: number;
      utilizationRate: number;
      overallocation: Array<{
        date: Date;
        allocatedHours: number;
        availableHours: number;
        overallocationHours: number;
        conflictingTasks: Array<{
          taskId: number;
          taskName: string;
          allocatedHours: number;
        }>;
      }>;
    }>;
    periodSummary: {
      totalAssignees: number;
      overallocatedAssignees: number;
      averageUtilization: number;
      peakUtilizationDate: Date;
      peakUtilizationRate: number;
    };
  };
  error?: string;
}
```

### バッチ操作Actions

#### executeBulkUpdate
複数の依存関係・タスクを一括更新

**ファイル**: `/src/app/actions/bulk-operations.ts`

```typescript
'use server'

interface BulkOperationItem {
  type: 'CREATE_DEPENDENCY' | 'UPDATE_DEPENDENCY' | 'DELETE_DEPENDENCY' | 'UPDATE_TASK';
  data: any; // 操作タイプに応じたデータ
}

interface BulkUpdateOptions {
  wbsId: number;
  operations: BulkOperationItem[];
  autoSchedule?: boolean;
  validateOnly?: boolean;
}

export async function executeBulkUpdate(options: BulkUpdateOptions) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('認証が必要です');
  }
  
  await checkPermission(session.user.id, options.wbsId, 'MANAGE_DEPENDENCIES');
  
  try {
    const bulkOperator = container.get<BulkOperationService>('BulkOperationService');
    
    if (options.validateOnly) {
      const validationResult = await bulkOperator.validateOperations(
        options.wbsId,
        options.operations
      );
      
      return {
        success: true,
        data: {
          validationResult,
          isValid: validationResult.every(r => r.success)
        }
      };
    }
    
    const results = await bulkOperator.executeOperations({
      wbsId: options.wbsId,
      operations: options.operations,
      autoSchedule: options.autoSchedule ?? true
    });
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '一括更新の実行に失敗しました'
    };
  }
}
```

**戻り値型**
```typescript
type BulkUpdateResult = {
  success: boolean;
  data?: {
    results: Array<{
      operationIndex: number;
      success: boolean;
      data?: any;
      error?: string;
    }>;
    finalState: {
      updatedTasks: number[];
      updatedDependencies: number[];
      deletedDependencies: number[];
    };
    validationErrors?: Array<{
      operationIndex: number;
      errorType: string;
      message: string;
    }>;
  };
  error?: string;
}
```

## 共通仕様

### エラーハンドリング

#### 標準エラー戻り値形式
```typescript
// 成功時
{
  success: true,
  data: T // 実際のデータ
}

// エラー時
{
  success: false,
  error: string, // エラーメッセージ
  code?: string, // エラーコード（オプション）
  details?: any  // 詳細情報（開発用、オプション）
}
```

#### エラーの種類
- **認証エラー**: セッションが無効または期限切れ
- **権限エラー**: 必要な権限が不足
- **バリデーションエラー**: 入力値が不正
- **ビジネスロジックエラー**: 循環依存、制約違反等
- **システムエラー**: データベース接続失敗、計算タイムアウト等

### パフォーマンス目標

#### 処理時間目標
- **データ取得系**: 500ms以内（fetchTaskDependencies等）
- **クリティカルパス計算**: 2秒以内（1000タスク以下）
- **自動スケジューリング**: 5秒以内（1000タスク以下）
- **リソース平準化**: 10秒以内

#### 制約・制限
- **タイムアウト**: Server Actions実行時間30秒
- **データサイズ**: 入力オブジェクトサイズ1MB以内
- **同時実行**: ユーザーあたり同時実行5アクションまで

### キャッシュ戦略

#### Server Side Caching
Next.js 15のキャッシュ機能を活用

```typescript
import { unstable_cache } from 'next/cache';

// キャッシュ付きデータ取得の例
export const getCachedCriticalPath = unstable_cache(
  async (wbsId: number) => {
    // クリティカルパス計算ロジック
  },
  ['critical-path'], // キャッシュキー
  {
    revalidate: 300, // 5分間キャッシュ
    tags: [`wbs-${wbsId}`, 'critical-path']
  }
);

// キャッシュ無効化
import { revalidateTag } from 'next/cache';
await revalidateTag(`wbs-${wbsId}`);
```

## セキュリティ

### 認証・認可

#### Server Actions権限チェック
```typescript
// 権限レベル定義
enum Permission {
  VIEW_GANTT = 'view:gantt',
  EDIT_TASKS = 'edit:tasks',  
  MANAGE_DEPENDENCIES = 'manage:dependencies',
  AUTO_SCHEDULE = 'execute:auto_schedule',
  MANAGE_RESOURCES = 'manage:resources'
}

// 権限チェック関数
async function checkPermission(userId: number, wbsId: number, permission: Permission) {
  const userPermissions = await getUserPermissions(userId, wbsId);
  
  if (!userPermissions.includes(permission)) {
    throw new Error(`権限が不足しています: ${permission}`);
  }
}

// Server Actions別必要権限
const actionPermissions = {
  fetchTaskDependencies: [Permission.VIEW_GANTT],
  createTaskDependency: [Permission.MANAGE_DEPENDENCIES],
  updateTaskDependency: [Permission.MANAGE_DEPENDENCIES],
  deleteTaskDependency: [Permission.MANAGE_DEPENDENCIES],
  calculateCriticalPath: [Permission.VIEW_GANTT],
  executeAutoScheduling: [Permission.AUTO_SCHEDULE],
  fetchResourceUtilization: [Permission.VIEW_GANTT],
  executeResourceLeveling: [Permission.MANAGE_RESOURCES],
  executeBulkUpdate: [Permission.MANAGE_DEPENDENCIES]
};
```

### 入力値検証

#### TypeScript型ベース検証
```typescript
// Zodスキーマを使用した検証例
import { z } from 'zod';

const CreateDependencySchema = z.object({
  wbsId: z.number().positive(),
  predecessorId: z.number().positive(),
  successorId: z.number().positive(),
  type: z.enum(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH']),
  lagDays: z.number().int().min(-365).max(365).optional().default(0)
}).refine(data => data.predecessorId !== data.successorId, {
  message: "先行タスクと後続タスクは異なる必要があります"
});

// Server Action内での検証
function validateCreateDependencyInput(input: unknown) {
  try {
    return {
      isValid: true,
      data: CreateDependencySchema.parse(input),
      errors: []
    };
  } catch (error) {
    return {
      isValid: false,
      data: null,
      errors: error.errors.map(e => e.message)
    };
  }
}
```

### 監査ログ

#### Server Actions監査ログ
```typescript
// ログ出力ミドルウェア
async function auditLog(actionName: string, wbsId: number, userId: number, details: any) {
  await prisma.auditLog.create({
    data: {
      timestamp: new Date(),
      userId,
      action: actionName,
      wbsId,
      details: JSON.stringify(details),
      ipAddress: await getClientIP(),
      userAgent: headers().get('user-agent') || 'unknown'
    }
  });
}

// 監査対象Actions
const auditedActions = [
  'createTaskDependency',
  'updateTaskDependency',
  'deleteTaskDependency', 
  'executeAutoScheduling',
  'executeResourceLeveling',
  'executeBulkUpdate'
];
```

## クライアント側での使用

### React Componentsでの使用例
```typescript
// 依存関係作成のフック例
import { useTransition } from 'react';
import { createTaskDependency } from '@/app/actions/task-dependencies';

export function useCreateDependency() {
  const [isPending, startTransition] = useTransition();
  
  const createDependency = (input: CreateDependencyInput) => {
    startTransition(async () => {
      const result = await createTaskDependency(input);
      
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      
      // 成功処理
      toast.success('依存関係を作成しました');
      
      // 影響を受けたタスクがある場合の通知
      if (result.data.affectedTasks?.length > 0) {
        toast.info(`${result.data.affectedTasks.length}個のタスクが自動調整されました`);
      }
    });
  };
  
  return { createDependency, isPending };
}
```

### Server ComponentsでのServer Actions呼び出し
```typescript
// ページコンポーネント
export default async function GanttPage({ params }: { params: { wbsId: string } }) {
  const wbsId = parseInt(params.wbsId);
  
  // サーバーサイドでのデータ取得
  const dependenciesResult = await fetchTaskDependencies(wbsId);
  const criticalPathResult = await calculateCriticalPath({ wbsId });
  
  if (!dependenciesResult.success || !criticalPathResult.success) {
    return <ErrorDisplay message="データの取得に失敗しました" />;
  }
  
  return (
    <GanttV3
      wbsId={wbsId}
      dependencies={dependenciesResult.data}
      criticalPath={criticalPathResult.data}
    />
  );
}
```

## 開発・テスト支援

### TypeScript型定義ファイル
Server Actions用の型定義を提供

```typescript
// types/server-actions.ts
export interface ServerActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type CreateDependencyAction = (input: CreateDependencyInput) => Promise<ServerActionResult<CreateDependencyResult>>;
export type CalculateCriticalPathAction = (options: CriticalPathOptions) => Promise<ServerActionResult<CriticalPathResult>>;
// ... その他のAction型定義
```

### テスト用モック
```typescript
// __mocks__/server-actions.ts
export const mockCreateTaskDependency = jest.fn<Promise<ServerActionResult>, [CreateDependencyInput]>();
export const mockCalculateCriticalPath = jest.fn<Promise<ServerActionResult>, [CriticalPathOptions]>();

// テストファイルでの使用例
test('should create dependency successfully', async () => {
  mockCreateTaskDependency.mockResolvedValue({
    success: true,
    data: { dependency: mockDependency }
  });
  
  const result = await createTaskDependency(mockInput);
  expect(result.success).toBe(true);
});
```

## ファイル構成

### Server Actions配置
```
src/app/actions/
├── task-dependencies.ts     # 依存関係管理
├── critical-path.ts         # クリティカルパス分析
├── auto-scheduling.ts       # 自動スケジューリング
├── resource-management.ts   # リソース管理
├── bulk-operations.ts       # バッチ操作
└── shared/
    ├── auth.ts             # 認証・権限チェック
    ├── validation.ts       # 入力値検証
    └── audit.ts            # 監査ログ
```

### 型定義ファイル
```
src/types/
├── server-actions.ts       # Server Actions型定義
├── gantt.ts               # ガントチャート型定義
├── dependencies.ts        # 依存関係型定義
└── resources.ts           # リソース型定義
```

---

**文書作成日**: 2025-08-08  
**最終更新日**: 2025-08-08  
**作成者**: Claude Code  
**文書バージョン**: 2.0 (Server Actions対応版)  
**関連文書**: gantt-v3-requirements.md, gantt-v3-design.md, gantt-v3-implementation-plan.md