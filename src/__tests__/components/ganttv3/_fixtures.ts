import type {
  Task,
  GanttPhase,
  GanttStyle,
  Dependency,
  DependencyType,
} from "@/components/ganttv3/gantt";

/** テスト用の Task を生成する（必要なフィールドだけ上書き） */
export function makeTask(p: Partial<Task> & { id: string }): Task {
  return {
    name: p.id,
    startDate: new Date("2024-01-01T00:00:00.000Z"),
    endDate: new Date("2024-01-03T00:00:00.000Z"),
    duration: 2,
    color: "#000000",
    isMilestone: false,
    progress: 0,
    predecessors: [],
    level: 0,
    isManuallyScheduled: false,
    ...p,
  };
}

/** テスト用の GanttPhase(=Category) を生成する */
export function makePhase(
  p: Partial<GanttPhase> & { id: string; name: string },
): GanttPhase {
  return { color: "#888888", ...p };
}

/** テスト用の Dependency を生成する */
export function makeDependency(
  taskId: string,
  p: Partial<Dependency> = {},
): Dependency {
  return { taskId, type: "FS" as DependencyType, lag: 0, ...p };
}

/** テスト用の GanttStyle を生成する */
export function makeStyle(overrides: Partial<GanttStyle> = {}): GanttStyle {
  return {
    theme: "modern",
    showGrid: true,
    showProgress: true,
    showActual: false,
    showDependencies: true,
    showCriticalPath: true,
    showWeekends: true,
    showTodayLine: true,
    taskHeight: 20,
    rowSpacing: 8,
    labelPosition: "outside",
    colors: {
      primary: "#3B82F6",
      secondary: "#93C5FD",
      accent: "#F59E0B",
      milestone: "#EF4444",
      criticalPath: "#DC2626",
      weekend: "#F3F4F6",
      today: "#10B981",
    },
    ...overrides,
  };
}
