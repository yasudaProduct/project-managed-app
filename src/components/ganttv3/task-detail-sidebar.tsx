import { memo, type ReactNode } from "react";
import type { Task } from "./gantt";
import { getTaskStatusName } from "@/utils/utils";
import { formatYmd } from "./utils/taskFormat";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface TaskDetailSidebarProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const isEmpty =
    value === null || value === undefined || value === "";
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-border/60 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{isEmpty ? "—" : value}</dd>
    </div>
  );
}

/**
 * タスクバーのクリックで開く、右サイドバーのタスク詳細表示（読み取り専用）。
 * タスクの全情報（予定/実績/見通し・担当/ステータス・進捗・依存など）を一覧する。
 */
export const TaskDetailSidebar = memo(function TaskDetailSidebar({
  task,
  open,
  onOpenChange,
}: TaskDetailSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[380px] overflow-y-auto sm:max-w-md"
        data-testid="ganttv3-task-detail"
      >
        {task && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: task.color }}
                />
                <span className="min-w-0 break-words">{task.name}</span>
              </SheetTitle>
              <SheetDescription>
                {task.taskNo ? task.taskNo : "タスク詳細"}
                {task.isMilestone ? "（マイルストーン）" : ""}
              </SheetDescription>
            </SheetHeader>

            <dl className="mt-4">
              <DetailRow label="タスクNo" value={task.taskNo} />
              <DetailRow label="フェーズ" value={task.category} />
              {!task.isMilestone && (
                <DetailRow label="担当者" value={task.assignee || "未割当"} />
              )}
              {!task.isMilestone && (
                <DetailRow
                  label="ステータス"
                  value={getTaskStatusName(task.status ?? "NOT_STARTED")}
                />
              )}
              {!task.isMilestone && (
                <DetailRow
                  label="進捗率"
                  value={`${task.progressRate ?? task.progress}%`}
                />
              )}
              <DetailRow label="予定開始" value={formatYmd(task.startDate)} />
              {!task.isMilestone && (
                <DetailRow label="予定終了" value={formatYmd(task.endDate)} />
              )}
              {!task.isMilestone && (
                <DetailRow label="予定工数" value={`${task.duration}h`} />
              )}
              {task.actualStartDate && (
                <DetailRow
                  label="実績開始"
                  value={formatYmd(task.actualStartDate)}
                />
              )}
              {task.actualEndDate && (
                <DetailRow
                  label="実績終了"
                  value={formatYmd(task.actualEndDate)}
                />
              )}
              {task.forecastStartDate && (
                <DetailRow
                  label="見通し開始"
                  value={formatYmd(task.forecastStartDate)}
                />
              )}
              {task.forecastEndDate && (
                <DetailRow
                  label="見通し終了"
                  value={formatYmd(task.forecastEndDate)}
                />
              )}
              {task.isOnCriticalPath && (
                <DetailRow label="クリティカルパス" value="対象" />
              )}
              {task.predecessors.length > 0 && (
                <DetailRow
                  label="先行タスク"
                  value={`${task.predecessors.length}件`}
                />
              )}
              {task.description && (
                <DetailRow label="説明" value={task.description} />
              )}
            </dl>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
});
