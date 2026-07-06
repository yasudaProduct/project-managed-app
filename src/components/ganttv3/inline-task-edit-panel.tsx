import type { Task } from "./gantt";
import { Button } from "../ui/button";
import { Link2, X } from "lucide-react";
import { toDateInputValue, fromDateInputValue } from "./utils/dateInput";

export type AssigneeOption = { id: number; name: string };

interface InlineTaskEditPanelProps {
  /** 編集対象タスク */
  task: Task;
  /** 担当者プルダウンの選択肢 */
  assignees: AssigneeOption[];
  /** フィールド変更（部分パッチ）の反映 */
  onChange: (patch: Partial<Task>) => void;
  /** 依存関係編集モーダルを開く（任意） */
  onEditDependencies?: (taskId: string) => void;
  /** パネルを閉じる */
  onClose: () => void;
}

/**
 * 編集モードで選択中タスクの予定日・工数・担当者をインライン編集するパネル。
 * GanttChart から分離した表示・入力専用コンポーネント（設計方針 原則4）。
 */
export const InlineTaskEditPanel = ({
  task,
  assignees,
  onChange,
  onEditDependencies,
  onClose,
}: InlineTaskEditPanelProps) => {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border bg-blue-50/40 px-4 py-2">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
          style={{ backgroundColor: task.color }}
        />
        {task.taskNo ? `${task.taskNo} ` : ""}
        {task.name}
      </div>

      <label className="flex flex-col text-[11px] text-muted-foreground">
        {task.isMilestone ? "予定日" : "予定開始日"}
        <input
          type="date"
          className="h-8 rounded border bg-background px-2 text-sm text-foreground"
          value={toDateInputValue(task.startDate)}
          onChange={(e) => {
            const d = fromDateInputValue(e.target.value);
            if (!d) return;
            if (task.isMilestone) {
              onChange({ startDate: d, endDate: d });
            } else {
              const end =
                d.getTime() > task.endDate.getTime() ? d : task.endDate;
              onChange({ startDate: d, endDate: end });
            }
          }}
        />
      </label>

      {!task.isMilestone && (
        <label className="flex flex-col text-[11px] text-muted-foreground">
          予定終了日
          <input
            type="date"
            className="h-8 rounded border bg-background px-2 text-sm text-foreground"
            value={toDateInputValue(task.endDate)}
            onChange={(e) => {
              const d = fromDateInputValue(e.target.value);
              if (!d) return;
              const start =
                d.getTime() < task.startDate.getTime() ? d : task.startDate;
              onChange({ startDate: start, endDate: d });
            }}
          />
        </label>
      )}

      {!task.isMilestone && (
        <label className="flex flex-col text-[11px] text-muted-foreground">
          予定工数(h)
          <input
            type="number"
            min={0}
            className="h-8 w-24 rounded border bg-background px-2 text-sm text-foreground"
            value={task.duration}
            onChange={(e) =>
              onChange({ duration: e.target.valueAsNumber || 0 })
            }
          />
        </label>
      )}

      {!task.isMilestone && (
        <label className="flex flex-col text-[11px] text-muted-foreground">
          進捗率(%)
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            className="h-8 w-20 rounded border bg-background px-2 text-sm text-foreground"
            value={task.progressRate ?? ""}
            onChange={(e) => {
              // 空欄は「未変更」扱い（undefined）。入力値は0-100へクランプする
              const v = e.target.valueAsNumber;
              onChange({
                progressRate: Number.isFinite(v)
                  ? Math.max(0, Math.min(100, v))
                  : undefined,
              });
            }}
          />
        </label>
      )}

      {!task.isMilestone && (
        <label className="flex flex-col text-[11px] text-muted-foreground">
          担当者
          <select
            className="h-8 w-36 rounded border bg-background px-2 text-sm text-foreground"
            value={task.assigneeId ?? ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : undefined;
              const name = assignees.find((a) => a.id === id)?.name;
              onChange({ assigneeId: id, assignee: name });
            }}
          >
            <option value="">未割当</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!task.isMilestone && onEditDependencies && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => onEditDependencies(task.id)}
        >
          <Link2 className="w-4 h-4" />
          依存関係
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-8 w-8 p-0"
        onClick={onClose}
        title="閉じる"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};
