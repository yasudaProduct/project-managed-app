export interface Task {
  id: string;
  name: string; // タスク名
  startDate: Date; // 開始日
  endDate: Date; // 終了日
  duration: number; // 期間
  color: string; // 色
  isMilestone: boolean; // マイルストーンかどうか
  progress: number; // 進捗
  predecessors: Dependency[]; // 先行タスク
  level: number; // レベル
  isManuallyScheduled: boolean; // 手動でスケジュールされたかどうか
  category?: string; // カテゴリ
  isOnCriticalPath?: boolean; // クリティカルパス上かどうか
  description?: string; // 説明
  resources?: string[]; // リソース
  assignee?: string; // 担当者
  status?: TaskStatus; // ステータス
  // --- DB永続化用メタ情報（UI表示には使わない） ---
  dbId?: number; // DB上の数値ID（タスク or マイルストーン）
  assigneeId?: number; // 担当者の数値ID
  assigneeSeq?: number; // 担当者の並び順（wbs_assignee.seq）
  phaseId?: number; // フェーズの数値ID
  taskNo?: string; // タスクNo（"P-0001"形式）
}

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export type GroupBy = 'none' | 'phase' | 'assignee' | 'status';

// グループ内のタスクの並び順
export type TaskSortBy = 'taskNo' | 'startDate' | 'assignee' | 'status';

export interface GanttPhase {
  id: string;
  name: string;
  color: string;
  startDate?: Date;
  endDate?: Date;
}

export interface Dependency {
  taskId: string;
  type: DependencyType;
  lag: number;
  dbId?: number; // DB上の依存関係ID（削除時に使用）
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type TimelineScale = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface GanttStyle {
  theme: 'modern' | 'classic';
  showGrid: boolean;
  showProgress: boolean;
  showDependencies: boolean;
  showCriticalPath: boolean;
  showWeekends: boolean;
  showTodayLine: boolean;
  taskHeight: number;
  rowSpacing: number;
  labelPosition: 'inside' | 'outside';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    milestone: string;
    criticalPath: string;
    weekend: string;
    today: string;
  };
}

export interface ProjectData {
  tasks: Task[];
  categories: GanttPhase[];
  style: GanttStyle;
  scale: TimelineScale;
  metadata: {
    name: string;
    description: string;
    created: string;
    modified: string;
  };
}