export interface Task {
  id: string;
  name: string; // タスク名
  startDate: Date; // 開始日（予定開始日）
  endDate: Date; // 終了日（予定終了日）
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
  // 工数・実績関連
  yoteiKosu?: number; // 予定工数
  jissekiKosu?: number; // 実績工数
  forecastKosu?: number; // 見通し工数
  jissekiStart?: Date; // 実績開始日
  jissekiEnd?: Date; // 実績終了日
  progressRate?: number; // 進捗率（0-100）
  // 永続化用
  isNew?: boolean; // 未保存の新規タスクかどうか
  phaseId?: number; // フェーズID（新規作成・保存用）
  assigneeId?: number; // 担当者ID（新規作成・保存用）
}

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export type GroupBy = 'none' | 'phase' | 'assignee' | 'status';

// チャートの色分けモード
// - phase: フェーズによる色分け
// - planActual: 予定・実績・見通しによる色分け
export type ColorMode = 'phase' | 'planActual';

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