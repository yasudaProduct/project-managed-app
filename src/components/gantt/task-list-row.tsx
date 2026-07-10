import { memo } from "react";
import type { Task } from "./gantt";
import { getTaskStatusName } from "@/utils/utils";
import { statusColor, formatMonthDay } from "./utils/taskFormat";

interface TaskListRowProps {
  task: Task;
  top: number;
  height: number;
  /** 先頭ドットの表示色（色分けモードに応じて呼び出し側で解決した値）。未指定なら task.color を使う */
  barColor?: string;
}

/**
 * 左タスクリストの1タスク行（表示専用）。
 * dragPreview 等の頻繁に変わる state に依存しないため memo 化し、
 * ドラッグ/スクロール中の不要な再レンダーを抑制する（設計方針 原則4/6）。
 */
export const TaskListRow = memo(function TaskListRow({
  task,
  top,
  height,
  barColor,
}: TaskListRowProps) {
  return (
    <div
      className="px-4 py-0 border-b border-border hover:bg-muted/30 transition-colors absolute w-full flex items-center"
      style={{
        top,
        height,
        paddingLeft: `${16 + task.level * 16}px`,
        lineHeight: `${height}px`,
      }}
    >
      <div className="flex items-center gap-2 w-full h-full">
        {task.level > 0 && (
          <div className="w-3 h-3 border-l border-b border-muted-foreground/30 flex-shrink-0" />
        )}
        <div
          className="w-2 h-2 flex-shrink-0"
          style={{ backgroundColor: barColor ?? task.color }}
        />
        <div className="w-16 flex-shrink-0 text-xs text-muted-foreground truncate">
          {task.taskNo ?? ""}
        </div>
        <div className="flex-1 min-w-0 font-medium truncate text-xs leading-tight">
          {task.name}
        </div>
        <div className="w-20 flex-shrink-0 text-xs text-muted-foreground truncate">
          {task.isMilestone ? "" : task.assignee ?? ""}
        </div>
        <div className="w-16 flex-shrink-0 text-xs truncate">
          {task.isMilestone ? (
            ""
          ) : (
            <span
              className="inline-flex items-center gap-1"
              title={getTaskStatusName(task.status ?? "NOT_STARTED")}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: statusColor(task.status ?? "NOT_STARTED"),
                }}
              />
              <span className="truncate text-muted-foreground">
                {getTaskStatusName(task.status ?? "NOT_STARTED")}
              </span>
            </span>
          )}
        </div>
        <div className="w-12 flex-shrink-0 text-xs text-muted-foreground text-right tabular-nums">
          {formatMonthDay(task.startDate)}
        </div>
        <div className="w-12 flex-shrink-0 text-xs text-muted-foreground text-right tabular-nums">
          {task.isMilestone ? "" : formatMonthDay(task.endDate)}
        </div>
        <div className="w-12 flex-shrink-0 text-xs text-muted-foreground text-right tabular-nums">
          {task.isMilestone ? "M" : `${task.duration}h`}
        </div>
      </div>
    </div>
  );
});
