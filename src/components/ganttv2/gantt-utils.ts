import { WbsTask, Milestone } from "@/types/wbs";
import { Project } from "@/types/project";
import { getTaskStatusName } from "@/lib/utils";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeAxisItem {
  date: Date;
  position: number;
  width: number;
}

export interface TaskWithPosition extends WbsTask {
  startPosition: number;
  width: number;
  groupId?: string;
}

export interface MilestoneWithPosition extends Milestone {
  position: number;
}

export interface Group {
  id: string;
  name: string;
  tasks: TaskWithPosition[];
  collapsed: boolean;
}

export type ViewMode = "day" | "week" | "month" | "quarter";
export type GroupBy = "none" | "phase" | "assignee" | "status";

export const VIEW_MODES = [
  { value: "day" as ViewMode, label: "日", days: 1 },
  { value: "week" as ViewMode, label: "週", days: 7 },
  { value: "month" as ViewMode, label: "月", days: 30 },
  { value: "quarter" as ViewMode, label: "四半期", days: 90 },
];

/**
 * プロジェクトの日付範囲を計算
 * プロジェクトの開始日と終了日をベースに、前後7日のバッファを追加
 */
export function calculateDateRange(project: Project): DateRange {
  const projectStart = new Date(project.startDate);
  const projectEnd = new Date(project.endDate);

  // プロジェクト期間を少し拡張してバッファを追加
  const start = new Date(projectStart);
  start.setDate(start.getDate() - 7);
  const end = new Date(projectEnd);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

/**
 * タスクをフィルタリング
 */
export function filterTasks(
  tasks: WbsTask[],
  statusFilter: string,
  assigneeFilter: string
): WbsTask[] {
  return tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (
      assigneeFilter !== "all" &&
      task.assignee?.displayName !== assigneeFilter
    )
      return false;
    return true;
  });
}

/**
 * 時間軸の生成とチャート幅の計算
 */
export function generateTimeAxis(
  dateRange: DateRange,
  viewMode: ViewMode
): { timeAxis: TimeAxisItem[]; chartWidth: number } {
  const currentMode = VIEW_MODES.find((mode) => mode.value === viewMode)!;

  // 日付範囲を正規化
  const normalizedRangeStart = new Date(dateRange.start);
  normalizedRangeStart.setHours(0, 0, 0, 0);

  const normalizedRangeEnd = new Date(dateRange.end);
  normalizedRangeEnd.setHours(0, 0, 0, 0);

  // 正規化された日付で総日数を計算
  const totalDays = Math.ceil(
    (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // 横スクロールを可能にするために、各日の最小幅を設定
  const minDayWidth =
    viewMode === "day" ? 60 : viewMode === "week" ? 80 : 120;
  const calculatedChartWidth = Math.max(
    1200,
    (totalDays * minDayWidth) / currentMode.days
  );

  const intervals = Math.ceil(totalDays / currentMode.days);
  const intervalWidth = calculatedChartWidth / intervals;

  const axis = Array.from({ length: intervals }, (_, i) => {
    const date = new Date(normalizedRangeStart);
    date.setDate(date.getDate() + i * currentMode.days);
    return {
      date,
      position: i * intervalWidth,
      width: intervalWidth,
    };
  });

  return { timeAxis: axis, chartWidth: calculatedChartWidth };
}

/**
 * タスクの位置を計算
 */
export function calculateTaskPositions(
  tasks: WbsTask[],
  dateRange: DateRange,
  chartWidth: number
): TaskWithPosition[] {
  // 時間軸と同じ正規化された日付範囲を使用
  const normalizedRangeStart = new Date(dateRange.start);
  normalizedRangeStart.setHours(0, 0, 0, 0);

  const normalizedRangeEnd = new Date(dateRange.end);
  normalizedRangeEnd.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil(
    (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return tasks.map((task) => {
    const taskStart = task.yoteiStart || normalizedRangeStart;
    const taskEnd = task.yoteiEnd || taskStart;

    // 日付を正規化（時刻部分を削除）
    const normalizedStart = new Date(taskStart);
    normalizedStart.setHours(0, 0, 0, 0);

    const normalizedEnd = new Date(taskEnd);
    normalizedEnd.setHours(0, 0, 0, 0);

    // より正確な日数計算（開始日からの経過日数）
    const startDays = Math.max(
      0,
      Math.round(
        (normalizedStart.getTime() - normalizedRangeStart.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    // 期間計算（終了日を含む期間として計算）
    const endDays = Math.max(
      0,
      Math.round(
        (normalizedEnd.getTime() - normalizedRangeStart.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const duration = Math.max(1, endDays - startDays + 2);

    // チャート幅に基づいてピクセル位置を計算
    const startPosition = (startDays / totalDays) * chartWidth;
    const width = (duration / totalDays) * chartWidth;

    return {
      ...task,
      startPosition,
      width,
    } as TaskWithPosition;
  });
}

/**
 * タスクをグループ化
 */
export function groupTasks(
  tasks: TaskWithPosition[],
  groupBy: GroupBy,
  collapsedGroups: Set<string>
): Group[] {
  if (groupBy === "none") {
    return [
      {
        id: "all",
        name: "すべてのタスク",
        tasks,
        collapsed: false,
      },
    ];
  }

  const groupMap = new Map<string, TaskWithPosition[]>();

  tasks.forEach((task) => {
    let groupKey: string;

    switch (groupBy) {
      case "phase":
        groupKey = task.phase?.id?.toString() || "unknown";
        break;
      case "assignee":
        groupKey = task.assignee?.id?.toString() || "unassigned";
        break;
      case "status":
        groupKey = task.status;
        break;
      default:
        groupKey = "all";
    }

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(task);
  });

  return Array.from(groupMap.entries()).map(([id, tasks]) => ({
    id,
    name: tasks[0]
      ? groupBy === "phase"
        ? tasks[0].phase?.name || "未分類"
        : groupBy === "assignee"
        ? tasks[0].assignee?.displayName || "未割り当て"
        : groupBy === "status"
        ? getTaskStatusName(tasks[0].status)
        : "すべてのタスク"
      : "未分類",
    tasks,
    collapsed: collapsedGroups.has(id),
  }));
}

/**
 * マイルストーンの位置を計算
 */
export function calculateMilestonePositions(
  milestones: Milestone[],
  dateRange: DateRange,
  chartWidth: number
): MilestoneWithPosition[] {
  // 時間軸と同じ正規化された日付範囲を使用
  const normalizedRangeStart = new Date(dateRange.start);
  normalizedRangeStart.setHours(0, 0, 0, 0);

  const normalizedRangeEnd = new Date(dateRange.end);
  normalizedRangeEnd.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil(
    (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return milestones.map((milestone) => {
    // 日付を正規化
    const normalizedMilestoneDate = new Date(milestone.date);
    normalizedMilestoneDate.setHours(0, 0, 0, 0);

    // タスクと同じ計算方法を使用
    const positionDays = Math.max(
      0,
      (normalizedMilestoneDate.getTime() - normalizedRangeStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // タスクと同じピクセル位置計算
    const position = (positionDays / totalDays) * chartWidth;

    return {
      ...milestone,
      position,
    };
  });
}