import { Task, GanttPhase } from "./gantt";

// 予定・実績・見通しの色分け用カラー
export const PLAN_COLOR = "#3B82F6"; // 予定（青）
export const ACTUAL_COLOR = "#10B981"; // 実績（緑）
export const FORECAST_COLOR = "#F59E0B"; // 見通し（オレンジ）

/**
 * フェーズ色分けモードでのタスクバー色を取得する。
 * タスクのフェーズ（カテゴリ）に対応する色を優先し、無ければタスク固有色を使う。
 */
export function getPhaseColor(task: Task, categories: GanttPhase[]): string {
  const category = categories.find((c) => c.name === task.category);
  return category?.color ?? task.color;
}

/**
 * 見通し（予測）の終了日を算出する。
 *
 * 予定期間を、見通し工数 / 予定工数 の比率でスケールして予測期間とする。
 * （実績があれば実績開始日を、無ければ予定開始日を起点にする）
 *
 * 完了済み・見通し工数や予定工数が無い場合は算出しない（null）。
 */
export function calcForecastEnd(task: Task): { start: Date; end: Date } | null {
  if (task.status === "COMPLETED") return null;
  if (!task.forecastKosu || task.forecastKosu <= 0) return null;
  if (!task.yoteiKosu || task.yoteiKosu <= 0) return null;

  const start = task.jissekiStart ?? task.startDate;
  const plannedDurationMs = task.endDate.getTime() - task.startDate.getTime();
  if (plannedDurationMs <= 0) return null;

  const ratio = task.forecastKosu / task.yoteiKosu;
  const forecastDurationMs = plannedDurationMs * ratio;
  const end = new Date(start.getTime() + forecastDurationMs);

  return { start, end };
}
