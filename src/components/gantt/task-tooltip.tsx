import { memo } from "react";
import type { Task, TaskBarVariant } from "./gantt";
import { getTaskStatusName } from "@/utils/utils";
import { formatYmd, formatHours } from "./utils/taskFormat";

interface TaskTooltipProps {
  task: Task;
  /** カーソルのビューポート座標（clientX/clientY） */
  x: number;
  y: number;
  /** ホバー対象のバー種別（予定/実績/見通し）。既定は予定 */
  variant?: TaskBarVariant;
}

const PERIOD_LABEL: Record<TaskBarVariant, string> = {
  planned: "予定",
  actual: "実績",
  forecast: "見通し",
};

/**
 * タスクバーのホバー時に、重要な情報だけに絞って表示するツールチップ。
 * カーソル位置に `position: fixed` で追従表示する（クリックは透過）。
 * バー種別（予定/実績/見通し）に応じて、期間・工数はそれぞれの値を表示する。
 */
export const TaskTooltip = memo(function TaskTooltip({
  task,
  x,
  y,
  variant = "planned",
}: TaskTooltipProps) {
  const rows: { label: string; value: string }[] = [];

  if (!task.isMilestone) {
    rows.push({ label: "担当者", value: task.assignee || "未割当" });
    rows.push({
      label: "ステータス",
      value: getTaskStatusName(task.status ?? "NOT_STARTED"),
    });
  }

  const periodStart =
    variant === "actual"
      ? task.actualStartDate
      : variant === "forecast"
        ? task.forecastStartDate
        : task.startDate;
  const periodEnd =
    (variant === "actual"
      ? task.actualEndDate
      : variant === "forecast"
        ? task.forecastEndDate
        : task.endDate) ?? periodStart;

  rows.push({
    label: PERIOD_LABEL[variant],
    value:
      periodStart == null
        ? "—"
        : task.isMilestone
          ? formatYmd(periodStart)
          : `${formatYmd(periodStart)} 〜 ${formatYmd(periodEnd)}`,
  });
  if (!task.isMilestone) {
    const hours =
      variant === "actual"
        ? task.actualDuration
        : variant === "forecast"
          ? task.forecastDuration
          : task.duration;
    rows.push({ label: "工数", value: formatHours(hours) ?? "—" });
    rows.push({ label: "進捗", value: `${task.progress}%` });
  }

  return (
    <div
      data-testid="gantt-task-tooltip"
      className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left: x + 14, top: y + 14 }}
    >
      <div className="mb-1 font-semibold">
        {task.taskNo ? `${task.taskNo} ` : ""}
        {task.name}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
});
