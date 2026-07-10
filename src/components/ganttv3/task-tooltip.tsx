import { memo } from "react";
import type { Task } from "./gantt";
import { getTaskStatusName } from "@/utils/utils";
import { formatYmd } from "./utils/taskFormat";

interface TaskTooltipProps {
  task: Task;
  /** カーソルのビューポート座標（clientX/clientY） */
  x: number;
  y: number;
}

/**
 * タスクバーのホバー時に、重要な情報だけに絞って表示するツールチップ。
 * カーソル位置に `position: fixed` で追従表示する（クリックは透過）。
 */
export const TaskTooltip = memo(function TaskTooltip({
  task,
  x,
  y,
}: TaskTooltipProps) {
  const rows: { label: string; value: string }[] = [];

  if (!task.isMilestone) {
    rows.push({ label: "担当者", value: task.assignee || "未割当" });
    rows.push({
      label: "ステータス",
      value: getTaskStatusName(task.status ?? "NOT_STARTED"),
    });
  }
  rows.push({
    label: "予定",
    value: task.isMilestone
      ? formatYmd(task.startDate)
      : `${formatYmd(task.startDate)} 〜 ${formatYmd(task.endDate)}`,
  });
  if (!task.isMilestone) {
    rows.push({ label: "工数", value: `${task.duration}h` });
    rows.push({ label: "進捗", value: `${task.progress}%` });
  }

  return (
    <div
      data-testid="ganttv3-task-tooltip"
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
