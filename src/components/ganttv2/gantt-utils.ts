import { WbsTask, Milestone } from "@/types/wbs";
import { Project } from "@/types/project";
import { getTaskStatusName } from "@/lib/utils";
import { utcToLocalDate } from "@/lib/date-display-utils";

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
 * プロジェクトの日付範囲を計算（UTCベース）
 * start:プロジェクトの開始日とタスクの最小開始日のうち小さい方
 * end:プロジェクトの終了日とタスクの最大終了日のうち大きい方
 * 期間を拡張してバッファを追加
 */
export function calculateDateRange(
  project: Project,
  periods?: {
    startDate: Date | undefined;
    endDate: Date | undefined;
  }[]
): DateRange {
  // UTCで受け取った日付をローカル日付として解釈
  const projectStart = utcToLocalDate(new Date(project.startDate))!;
  const projectEnd = utcToLocalDate(new Date(project.endDate))!;

  if (!projectStart || !projectEnd) {
    throw new Error("Invalid project date range");
  }

  // periods配列から最小のstartDateを取得
  const minTaskStart = periods && periods.length > 0 && periods.some((p) => p.startDate)
    ? new Date(
      Math.min(
        ...periods.map((p) => utcToLocalDate(p.startDate)?.getTime() ?? Infinity)
      )
    )
    : undefined;

  // periods配列から最大のendDateを取得
  const maxTaskEnd = periods && periods.length > 0 && periods.some((p) => p.endDate)
    ? new Date(
      Math.max(
        ...periods.map((p) => utcToLocalDate(p.endDate)?.getTime() ?? -Infinity)
      )
    )
    : undefined;

  // タスクの期間とプロジェクトの期間のうち早い方と遅い方を取得
  const start = new Date(Math.min(minTaskStart?.getTime() ?? projectStart.getTime(), projectStart.getTime()))!;
  const end = new Date(Math.max(maxTaskEnd?.getTime() ?? projectEnd.getTime(), projectEnd.getTime()))!;

  // プロジェクト期間を少し拡張してバッファを追加
  start.setDate(start.getDate() - 7);
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
 * 時間軸の生成とチャート幅の計算（UTCベース）
 */
export function generateTimeAxis(
  dateRange: DateRange,
  viewMode: ViewMode
): { timeAxis: TimeAxisItem[]; chartWidth: number } {
  const currentMode = VIEW_MODES.find((mode) => mode.value === viewMode)!;

  // 日付範囲を正規化（ローカル時刻で00:00:00）
  const normalizedRangeStart = new Date(dateRange.start);
  normalizedRangeStart.setHours(0, 0, 0, 0);

  const normalizedRangeEnd = new Date(dateRange.end);
  normalizedRangeEnd.setHours(0, 0, 0, 0);

  // 正規化された日付で総日数を計算
  const totalDays = Math.ceil(
    (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
    (1000 * 60 * 60 * 24)
  ) + 1;

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
  ) + 1;

  return tasks.map((task) => {
    // UTCで受け取った日付をローカル日付として解釈
    const taskStartLocal = task.yoteiStart ? utcToLocalDate(task.yoteiStart) : null;
    const taskEndLocal = task.yoteiEnd ? utcToLocalDate(task.yoteiEnd) : null;

    const taskStart = taskStartLocal || normalizedRangeStart;
    const taskEnd = taskEndLocal || taskStart;

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

    // タスクの期間を計算
    const duration = Math.max(1, endDays - startDays + 1);

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
  // タスクを開始日順でソート
  const sortTasksByStartDate = (taskList: TaskWithPosition[]) => {
    return [...taskList].sort((a, b) => {
      // 開始日がない場合は最後に配置
      const aStart = a.yoteiStart ? utcToLocalDate(a.yoteiStart) : null;
      const bStart = b.yoteiStart ? utcToLocalDate(b.yoteiStart) : null;
      
      if (!aStart && !bStart) return 0;
      if (!aStart) return 1;
      if (!bStart) return -1;
      
      return aStart.getTime() - bStart.getTime();
    });
  };

  if (groupBy === "none") {
    return [
      {
        id: "all",
        name: "すべてのタスク",
        tasks: sortTasksByStartDate(tasks),
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
    tasks: sortTasksByStartDate(tasks), // 各グループ内でタスクをソート
    collapsed: collapsedGroups.has(id),
  }));
}

/**
 * ローカル日付をYYYY/MM/DD形式の文字列に変換
 * タイムゾーンの影響を受けない日付文字列を生成
 */
export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
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
    // UTCで受け取った日付をローカル日付として解釈
    const milestoneLocal = utcToLocalDate(milestone.date);
    if (!milestoneLocal) return { ...milestone, position: 0 };

    // 日付を正規化
    const normalizedMilestoneDate = new Date(milestoneLocal);
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