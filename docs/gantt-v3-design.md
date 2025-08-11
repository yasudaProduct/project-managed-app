# ガントチャートV3 設計仕様書

## 概要

本ドキュメントは、ガントチャートV3の詳細設計仕様を定義します。既存のGanttV2の優れた機能を継承しつつ、タスク依存関係管理、クリティカルパス分析、自動スケジューリング機能を追加した次世代ガントチャートの設計です。

## アーキテクチャ設計

### 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
├─────────────────────────────────────────────────────────────┤
│ GanttV3 Components                                          │
│ ├── GanttV3.tsx (Main Container)                           │
│ ├── GanttChart.tsx (Chart Display)                         │
│ ├── GanttDependency.tsx (Dependency Arrows)                │
│ ├── GanttCriticalPath.tsx (Critical Path Highlight)        │
│ └── GanttResourceView.tsx (Resource Management)            │
├─────────────────────────────────────────────────────────────┤
│                     Application Layer                       │
├─────────────────────────────────────────────────────────────┤
│ Custom Hooks & Services                                     │
│ ├── useGanttData.ts (Data Management)                      │
│ ├── useCriticalPath.ts (CPM Calculations)                  │
│ ├── useDependencyManager.ts (Dependency Logic)             │
│ └── useResourceManager.ts (Resource Logic)                 │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                           │
├─────────────────────────────────────────────────────────────┤
│ Enhanced Domain Models                                      │
│ ├── Task (Extended with Dependencies)                      │
│ ├── TaskDependency (New)                                   │
│ ├── CriticalPath (New)                                     │
│ └── ResourceAllocation (Enhanced)                          │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
├─────────────────────────────────────────────────────────────┤
│ Database & External APIs                                    │
│ ├── TaskDependency Repository                              │
│ ├── CPM Calculation Service                                │
│ └── Resource Management Repository                          │
└─────────────────────────────────────────────────────────────┘
```

### コンポーネント階層設計

```
GanttV3/
├── index.ts                        # エクスポート定義
├── GanttV3.tsx                     # メインコンテナ
├── components/
│   ├── layout/
│   │   ├── GanttHeader.tsx         # ヘッダー（プロジェクト名、フィルター）
│   │   ├── GanttToolbar.tsx        # ツールバー（表示設定、アクション）
│   │   └── GanttStatusBar.tsx      # ステータスバー（統計情報）
│   ├── timeline/
│   │   ├── GanttTimeline.tsx       # タイムライン表示
│   │   └── GanttTimeScale.tsx      # 時間軸スケール
│   ├── tasks/
│   │   ├── GanttTaskList.tsx       # 左側のタスクリスト
│   │   ├── GanttChart.tsx          # メインチャート表示
│   │   ├── GanttTaskBar.tsx        # 個別タスクバー
│   │   └── GanttTaskRow.tsx        # タスク行表示
│   ├── dependencies/
│   │   ├── GanttDependency.tsx     # 依存関係矢印
│   │   ├── GanttDependencyCreator.tsx  # 依存関係作成UI
│   │   └── GanttDependencyDialog.tsx   # 依存関係編集ダイアログ
│   ├── analysis/
│   │   ├── GanttCriticalPath.tsx   # クリティカルパス表示
│   │   └── GanttFloatTime.tsx      # フロート時間表示
│   └── resources/
│       ├── GanttResourceView.tsx   # リソース表示
│       ├── GanttResourceBar.tsx    # リソース負荷バー
│       └── GanttResourceConflict.tsx # 競合警告表示
├── hooks/
│   ├── useGanttData.ts             # データ管理フック
│   ├── useGanttInteraction.ts      # インタラクション管理
│   ├── useCriticalPath.ts          # クリティカルパス計算
│   ├── useDependencyManager.ts     # 依存関係管理
│   ├── useResourceManager.ts       # リソース管理
│   └── useAutoScheduler.ts         # 自動スケジューリング
├── utils/
│   ├── calculations/
│   │   ├── ganttCalculations.ts    # 基本計算ユーティリティ
│   │   ├── criticalPathAlgorithm.ts # CPM計算アルゴリズム
│   │   └── scheduleOptimizer.ts    # スケジュール最適化
│   ├── validation/
│   │   ├── dependencyValidation.ts # 依存関係検証
│   │   └── resourceValidation.ts   # リソース制約検証
│   └── rendering/
│       ├── svgUtils.ts             # SVG描画ユーティリティ
│       └── layoutCalculations.ts   # レイアウト計算
└── types/
    ├── gantt.ts                    # ガントチャート型定義
    ├── dependencies.ts             # 依存関係型定義
    └── resources.ts                # リソース型定義
```

## データモデル設計

### 拡張データモデル

#### TaskDependency（新規）
```typescript
interface TaskDependency {
  id: number;
  predecessorId: number;
  successorId: number;
  type: DependencyType;
  lagDays: number;
  createdAt: Date;
  updatedAt: Date;
  
  // リレーション
  predecessor: EnhancedTask;
  successor: EnhancedTask;
}

enum DependencyType {
  FINISH_TO_START = 'FS',   // 完了-開始（最も一般的）
  START_TO_START = 'SS',    // 開始-開始
  FINISH_TO_FINISH = 'FF',  // 完了-完了
  START_TO_FINISH = 'SF'    // 開始-完了（稀）
}
```

#### EnhancedTask（拡張）
```typescript
interface EnhancedTask extends Task {
  // 依存関係
  dependencies: TaskDependency[];
  predecessors: number[];
  successors: number[];
  
  // CPM計算結果
  isCritical: boolean;
  totalFloat: number;       // 全フロート（遅延可能日数）
  freeFloat: number;        // 自由フロート
  
  // スケジュール計算結果
  earlyStart: Date;         // 最早開始日
  earlyFinish: Date;        // 最早完了日
  lateStart: Date;          // 最遅開始日
  lateFinish: Date;         // 最遅完了日
  
  // リソース情報
  resourceAllocations: ResourceAllocation[];
  estimatedHours: number;
  actualHours: number;
}
```

#### CriticalPath（新規）
```typescript
interface CriticalPath {
  id: string;
  taskIds: number[];
  totalDuration: number;
  startDate: Date;
  endDate: Date;
  calculatedAt: Date;
  
  // パス分析結果
  bufferTime: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  bottleneckTasks: number[];
}
```

#### ResourceAllocation（拡張）
```typescript
interface ResourceAllocation {
  id: number;
  taskId: number;
  assigneeId: number;
  allocatedHours: number;
  startDate: Date;
  endDate: Date;
  
  // 競合情報
  hasConflict: boolean;
  conflictDetails?: ResourceConflict[];
  
  // 利用率
  utilizationRate: number;
  availableHours: number;
}

interface ResourceConflict {
  conflictType: 'OVERALLOCATION' | 'UNAVAILABLE';
  conflictingTaskId: number;
  conflictPeriod: {
    start: Date;
    end: Date;
  };
  severity: 'WARNING' | 'ERROR';
}
```

## UI/UX設計

### レイアウト設計

#### メインレイアウト
```
┌─────────────────────────────────────────────────────────────┐
│ Header: [Project Name] [View Mode] [Filters] [Actions]     │ 60px
├─────────────────────────────────────────────────────────────┤
│ Toolbar: [Zoom] [Group] [Display Options] [Quick Actions] │ 48px
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┬───────────────────────────────────────────┐ │
│ │ Task List   │ Gantt Chart Area                        │ │
│ │ (Resizable) │ ┌─────────────────────────────────────┐   │ │ Flexible
│ │             │ │ Timeline Header                     │   │ │ Height
│ │ ├─ Phase1   │ ├─────────────────────────────────────┤   │ │
│ │   ├─Task1   │ │ Task Bars + Dependencies           │   │ │
│ │   └─Task2   │ │ + Critical Path Overlay            │   │ │
│ │ └─ Phase2   │ │ + Resource View (Optional)         │   │ │
│ │             │ └─────────────────────────────────────┘   │ │
│ └─────────────┴───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Status Bar: [Stats] [Critical Path Info] [Conflicts]      │ 32px
└─────────────────────────────────────────────────────────────┘
```

### 視覚デザイン

#### タスクバーのデザイン
```typescript
interface TaskBarStyle {
  // 基本スタイル
  height: number;           // 24px
  borderRadius: number;     // 4px
  border: string;          // 1px solid
  
  // 期間タイプ別スタイル
  kijun: {                 // 基準期間
    backgroundColor: '#E5E7EB';
    borderColor: '#9CA3AF';
    opacity: 0.7;
  };
  yotei: {                 // 予定期間
    backgroundColor: '#3B82F6';
    borderColor: '#1D4ED8';
    opacity: 1.0;
  };
  jisseki: {               // 実績期間
    backgroundColor: '#10B981';
    borderColor: '#059669';
    opacity: 1.0;
  };
  
  // ステータス別オーバーレイ
  critical: {              // クリティカルタスク
    borderColor: '#EF4444';
    borderWidth: 2;
    boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)';
  };
  delayed: {               // 遅延タスク
    backgroundColor: '#FEF3C7';
    borderColor: '#F59E0B';
  };
  completed: {             // 完了タスク
    backgroundColor: '#D1FAE5';
    borderColor: '#10B981';
  };
}
```

#### 依存関係矢印のデザイン
```typescript
interface DependencyArrowStyle {
  // 基本スタイル
  strokeWidth: number;      // 2px
  strokeColor: string;      // '#6B7280'
  fill: string;            // 'none'
  
  // 依存関係タイプ別スタイル
  FS: {                    // 完了-開始
    strokeDasharray: 'none';
    markerEnd: 'url(#arrow-solid)';
  };
  SS: {                    // 開始-開始
    strokeDasharray: '5,3';
    markerEnd: 'url(#arrow-dashed)';
  };
  FF: {                    // 完了-完了
    strokeDasharray: '10,2';
    markerEnd: 'url(#arrow-dotted)';
  };
  SF: {                    // 開始-完了
    strokeDasharray: '15,5,5,5';
    markerEnd: 'url(#arrow-complex)';
  };
  
  // 状態別スタイル
  critical: {              // クリティカルパス上
    strokeColor: '#EF4444';
    strokeWidth: 3;
    opacity: 1.0;
  };
  normal: {                // 通常
    strokeColor: '#6B7280';
    strokeWidth: 2;
    opacity: 0.8;
  };
  hover: {                 // ホバー時
    strokeColor: '#3B82F6';
    strokeWidth: 3;
    opacity: 1.0;
  };
}
```

#### クリティカルパスのハイライト
```typescript
interface CriticalPathStyle {
  // タスクハイライト
  taskOverlay: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)';
    border: '2px solid #EF4444';
    borderRadius: '4px';
    animation: 'pulse 2s infinite';
  };
  
  // パス全体のハイライト
  pathOverlay: {
    stroke: '#EF4444';
    strokeWidth: 4;
    strokeOpacity: 0.8;
    fill: 'none';
    filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.4))';
  };
  
  // フロート時間表示
  floatDisplay: {
    fontSize: '12px';
    fontWeight: 'bold';
    color: '#EF4444';
    backgroundColor: 'rgba(239, 68, 68, 0.1)';
    padding: '2px 6px';
    borderRadius: '3px';
  };
}
```

## インタラクション設計

### ドラッグ&ドロップ操作

#### タスク移動
```typescript
interface TaskMoveInteraction {
  // 基本移動
  dragTask: {
    cursor: 'move';
    feedback: 'ghost';           // 半透明のゴーストイメージ
    constraintCheck: 'realtime'; // リアルタイム制約チェック
    snapToGrid: true;            // グリッドスナップ
  };
  
  // 期間調整
  resizeTask: {
    handles: ['left', 'right'];  // 左右のハンドル
    cursor: 'col-resize';
    minDuration: 1;              // 最小期間1日
    maxDuration: null;           // 最大期間制限なし
  };
  
  // 制約違反時
  constraintViolation: {
    feedback: 'error';           // エラーフィードバック
    cursor: 'not-allowed';
    showTooltip: true;           // 違反理由をツールチップ表示
    revertOnRelease: true;       // ドロップ時に元の位置に戻す
  };
}
```

#### 依存関係作成
```typescript
interface DependencyCreationInteraction {
  // 依存関係作成開始
  startCreation: {
    trigger: 'drag-from-task-end';   // タスク端からのドラッグ
    visual: 'rubber-band-line';      // ゴムバンド線
    cursor: 'crosshair';
  };
  
  // ターゲット選択
  targetSelection: {
    validTargets: 'highlight';       // 有効なターゲットをハイライト
    invalidTargets: 'disable';       // 無効なターゲットを無効化表示
    hoverFeedback: true;             // ホバー時のフィードバック
  };
  
  // 作成完了
  completion: {
    showDialog: true;                // 依存関係タイプ選択ダイアログ
    defaultType: 'FS';               // デフォルトタイプ
    autoSchedule: true;              // 自動スケジューリング実行
  };
}
```

### キーボードショートカット

```typescript
interface KeyboardShortcuts {
  // ナビゲーション
  'Arrow Keys': 'タスク間移動';
  'Ctrl + A': '全タスク選択';
  'Ctrl + Click': '複数選択';
  
  // 編集操作
  'Delete': '選択した依存関係を削除';
  'Enter': '選択したタスクを編集';
  'Esc': '現在の操作をキャンセル';
  
  // 表示制御
  'Ctrl + +': 'ズームイン';
  'Ctrl + -': 'ズームアウト';
  'Ctrl + 0': 'ズームリセット';
  'F': 'フィットビュー';
  
  // 機能切替
  'C': 'クリティカルパス表示切替';
  'R': 'リソース表示切替';
  'D': '依存関係表示切替';
}
```

## 状態管理設計

### グローバル状態
```typescript
interface GanttGlobalState {
  // データ状態
  data: {
    wbs: WbsInfo | null;
    tasks: EnhancedTask[];
    dependencies: TaskDependency[];
    milestones: Milestone[];
    assignees: WbsAssignee[];
  };
  
  // 計算結果
  computed: {
    criticalPath: CriticalPath | null;
    taskSchedules: Map<number, TaskSchedule>;
    resourceUtilization: Map<number, ResourceUtilization>;
    conflicts: ResourceConflict[];
  };
  
  // UI状態
  ui: {
    viewMode: 'day' | 'week' | 'month';
    timeRange: { start: Date; end: Date };
    zoomLevel: number;
    groupBy: 'phase' | 'assignee' | 'none';
    
    // 表示設定
    showDependencies: boolean;
    showCriticalPath: boolean;
    showResourceView: boolean;
    showFloatTimes: boolean;
    
    // フィルター
    filters: {
      phases: Set<number>;
      assignees: Set<number>;
      statuses: Set<TaskStatus>;
      showCompleted: boolean;
    };
    
    // レイアウト
    layout: {
      taskListWidth: number;
      timelineHeight: number;
      rowHeight: number;
      splitterPosition: number;
    };
  };
  
  // インタラクション状態
  interaction: {
    selectedTasks: Set<number>;
    selectedDependencies: Set<number>;
    dragState: DragState | null;
    editingItem: EditingItem | null;
    
    // 操作モード
    mode: 'view' | 'edit' | 'create_dependency';
    
    // 一時状態
    tempDependency: TempDependency | null;
    undoStack: UndoAction[];
    redoStack: UndoAction[];
  };
  
  // ローディング・エラー状態
  async: {
    loading: {
      tasks: boolean;
      dependencies: boolean;
      criticalPath: boolean;
      autoSchedule: boolean;
    };
    
    errors: {
      loadError: Error | null;
      saveError: Error | null;
      validationErrors: ValidationError[];
    };
  };
}
```

### アクション定義
```typescript
interface GanttActions {
  // データ操作
  data: {
    fetchWbsData: (wbsId: number) => Promise<void>;
    refreshData: () => Promise<void>;
    
    // タスク操作
    moveTask: (taskId: number, newStart: Date, newEnd: Date) => Promise<void>;
    updateTask: (taskId: number, updates: Partial<Task>) => Promise<void>;
    
    // 依存関係操作
    createDependency: (request: CreateDependencyRequest) => Promise<void>;
    updateDependency: (id: number, updates: Partial<TaskDependency>) => Promise<void>;
    deleteDependency: (id: number) => Promise<void>;
  };
  
  // 計算・分析
  analysis: {
    calculateCriticalPath: () => Promise<void>;
    autoSchedule: (options: AutoScheduleOptions) => Promise<void>;
    validateConstraints: () => ValidationResult[];
    optimizeResources: () => Promise<void>;
  };
  
  // UI制御
  ui: {
    setViewMode: (mode: ViewMode) => void;
    setZoomLevel: (level: number) => void;
    setTimeRange: (range: TimeRange) => void;
    toggleDisplay: (feature: DisplayFeature) => void;
    
    // フィルター
    updateFilters: (filters: Partial<FilterState>) => void;
    resetFilters: () => void;
    
    // レイアウト
    updateLayout: (layout: Partial<LayoutState>) => void;
    resetLayout: () => void;
  };
  
  // インタラクション
  interaction: {
    selectTasks: (taskIds: number[]) => void;
    clearSelection: () => void;
    
    // 編集モード
    startEditing: (item: EditableItem) => void;
    cancelEditing: () => void;
    saveEditing: () => Promise<void>;
    
    // 履歴操作
    undo: () => void;
    redo: () => void;
    clearHistory: () => void;
  };
}
```

## パフォーマンス設計

### レンダリング最適化

#### 仮想化スクロール
```typescript
interface VirtualizationConfig {
  // 基本設定
  itemHeight: number;          // 36px
  overscan: number;            // 5 (表示外の予備レンダリング行数)
  bufferSize: number;          // 100 (バッファサイズ)
  
  // 最適化設定
  lazy: boolean;               // true (遅延レンダリング)
  debounceMs: number;          // 16 (60FPS対応)
  throttleMs: number;          // 100 (スクロール時)
  
  // メモリ管理
  maxRenderItems: number;      // 200 (同時レンダリング最大数)
  recycleItems: boolean;       // true (アイテムリサイクル)
}
```

#### メモ化戦略
```typescript
interface MemoizationStrategy {
  // コンポーネントレベル
  TaskBar: 'React.memo + shallow comparison';
  DependencyArrow: 'React.memo + dependency change check';
  Timeline: 'useMemo for date calculations';
  
  // 計算レベル
  criticalPath: 'useMemo + dependency array';
  taskPositions: 'useMemo + time range dependency';
  resourceUtilization: 'useMemo + task assignments dependency';
  
  // データレベル
  tasksByPhase: 'createSelector (reselect)';
  visibleTasks: 'createSelector + filter memoization';
  dependencyMap: 'createSelector + normalized data';
}
```

### データ最適化

#### クエリ最適化
```typescript
interface QueryOptimization {
  // 初期ロード
  initialLoad: {
    strategy: 'parallel';
    queries: [
      'fetchTasks',
      'fetchDependencies', 
      'fetchAssignees',
      'fetchMilestones'
    ];
    caching: 'stale-while-revalidate';
    staleTime: 5 * 60 * 1000;  // 5分
  };
  
  // 更新処理
  updates: {
    strategy: 'optimistic';
    rollback: true;
    retryPolicy: {
      attempts: 3;
      backoff: 'exponential';
    };
  };
  
  // 依存関係計算
  criticalPathCalc: {
    strategy: 'worker-thread';  // Web Worker使用
    cache: true;
    invalidation: 'dependency-change';
  };
}
```

## セキュリティ設計

### 認証・認可
```typescript
interface SecurityModel {
  // アクセス制御
  permissions: {
    VIEW_GANTT: 'ガントチャート表示';
    EDIT_TASKS: 'タスク編集';
    MANAGE_DEPENDENCIES: '依存関係管理';
    AUTO_SCHEDULE: '自動スケジューリング実行';
    MANAGE_RESOURCES: 'リソース管理';
  };
  
  // データ保護
  dataProtection: {
    inputValidation: 'server-side + client-side';
    outputEncoding: 'HTML encoding for user input';
    sqlInjectionPrevention: 'Prisma ORM parameterized queries';
  };
  
  // 監査ログ
  auditLog: {
    trackActions: [
      'TASK_MOVE',
      'DEPENDENCY_CREATE',
      'DEPENDENCY_DELETE',
      'AUTO_SCHEDULE_EXECUTE'
    ];
    retention: '1 year';
    format: 'JSON structured logs';
  };
}
```

---

**文書作成日**: 2025-08-08  
**作成者**: Claude Code  
**文書バージョン**: 1.0  
**関連文書**: gantt-v3-requirements.md