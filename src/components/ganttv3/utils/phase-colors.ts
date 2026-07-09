import type { GanttColorMode, Task } from "../gantt";

/** 「予定/実績/見通し」色分けモードで使う固定パレット */
export const PLAN_ACTUAL_FORECAST_COLORS: Record<
  "planned" | "actual" | "forecast",
  string
> = {
  planned: "#3B82F6", // blue
  actual: "#10B981", // green
  forecast: "#F59E0B", // amber
};

/**
 * タスクバーの表示色を色分けモードに応じて解決する。
 * - phase: フェーズ色（task.color）をそのまま使う（マイルストーンも常にこちら）
 * - planActualForecast: 予定/実績/見通しの種別ごとに固定色を使う
 */
export function resolveBarColor(
  task: Pick<Task, "color" | "isMilestone">,
  colorMode: GanttColorMode,
  barType: "planned" | "actual" | "forecast" = "planned",
): string {
  if (task.isMilestone || colorMode === "phase") {
    return task.color;
  }
  return PLAN_ACTUAL_FORECAST_COLORS[barType];
}

/** フェーズ・グループに割り当てる色パレット */
export const PHASE_COLOR_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

/** インデックスに対応する色を循環で返す */
export function phaseColor(index: number): string {
  return PHASE_COLOR_PALETTE[index % PHASE_COLOR_PALETTE.length];
}
