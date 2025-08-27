export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  color: string;
  isMilestone: boolean;
  progress: number;
  predecessors: Dependency[];
  level: number;
  isManuallyScheduled: boolean;
  category?: string;
  isOnCriticalPath?: boolean;
  description?: string;
  resources?: string[];
}

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