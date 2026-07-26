import type { TaskStatus } from '@/types/wbs';

export interface Task {
  id: string;
  name: string; // タスク名
  startDate: Date; // 開始日（予定）
  endDate: Date; // 終了日（予定）
  duration: number; // 予定工数(時間)。暦日数ではない（実日程は startDate/endDate）
  actualStartDate?: Date; // 実績開始日
  actualEndDate?: Date; // 実績終了日（未完了で実績開始のみの場合は本日が入る）
  actualDuration?: number; // 実績工数（時間）
  forecastStartDate?: Date; // 見通し開始日（実績開始日と同じ。実績なし・完了タスクは未設定）
  forecastEndDate?: Date; // 見通し終了日（残見通し工数を基準稼働時間で消化し終える営業日）
  forecastDuration?: number; // 見通し工数（時間）
  color: string; // 色
  isMilestone: boolean; // マイルストーンかどうか
  progress: number; // 進捗（進捗測定方式で算出した実効値。表示用）
  progressRate?: number; // 自己申告進捗率（0-100の生値。編集・保存用）
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

export type { TaskStatus };

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

/** タスクバーの色分け方式（フェーズ別 or 予定/実績/見通し別） */
export type GanttColorMode = 'phase' | 'planActualForecast';

/** タスクバーの種別（予定/実績/見通し）。ホバー時のツールチップ表示切替に使う */
export type TaskBarVariant = 'planned' | 'actual' | 'forecast';

export interface GanttStyle {
  theme: 'modern' | 'classic';
  showGrid: boolean;
  showProgress: boolean;
  showActual: boolean; // 実績バー（予定の下段）の表示
  showForecast: boolean; // 見通しバー（実績の下段）の表示
  colorMode: GanttColorMode; // タスクバーの色分け方式
  showDependencies: boolean;
  showCriticalPath: boolean;
  showWeekends: boolean;
  showTodayLine: boolean;
  showProgressLine: boolean; // イナズマ線（進捗線）の表示
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
    progressLine: string; // イナズマ線の色
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