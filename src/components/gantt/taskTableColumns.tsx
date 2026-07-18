import type { Task } from "./gantt";
import type { TaskTableColumn } from "./task-table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Copy,
  Flag,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/utils/date-util";
import { getTaskStatusName } from "@/utils/utils";
import { HoursUnit, formatHoursWithUnit } from "@/utils/hours-converter";

export type CreateTaskColumnsParams = {
  /** 先行タスク名の引き当て用（O(1) ルックアップ） */
  taskById: ReadonlyMap<string, Task>;
  /** 工数の表示単位 */
  kosuUnit: HoursUnit;
  onEditTask: (taskId: string) => void;
  onEditDependencies: (taskId: string) => void;
  onDuplicate: (taskIds: string[]) => void;
  onDelete: (taskIds: string[]) => void;
};

/**
 * テーブルビューの列定義を生成するファクトリ。
 * 表示・操作の組み立てをコンポーネントから分離し、依存名の引き当ては Map で O(1)。
 */
export function createTaskColumns({
  taskById,
  kosuUnit,
  onEditTask,
  onEditDependencies,
  onDuplicate,
  onDelete,
}: CreateTaskColumnsParams): TaskTableColumn[] {
  return [
    {
      key: "name",
      header: "タスク名",
      width: 260,
      renderCell: (task) => (
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: `${task.level * 16}px` }}
        >
          {task.isMilestone && (
            <Flag className="w-3 h-3 shrink-0 text-muted-foreground" />
          )}
          <span className="font-medium truncate">{task.name}</span>
        </div>
      ),
    },
    {
      key: "assignee",
      header: "担当者",
      width: 120,
      renderCell: (task) => (
        <span className="text-sm">{task.assignee ?? "-"}</span>
      ),
    },
    {
      key: "phase",
      header: "フェーズ",
      width: 130,
      renderCell: (task) => (
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: task.color }}
          />
          <span className="text-sm truncate">{task.category ?? "-"}</span>
        </div>
      ),
    },
    {
      key: "startDate",
      header: "開始日",
      width: 110,
      renderCell: (task) => (
        <span className="text-sm">
          {formatDate(task.startDate, "YYYY/MM/DD")}
        </span>
      ),
    },
    {
      key: "endDate",
      header: "終了日",
      width: 110,
      renderCell: (task) =>
        task.isMilestone ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <span className="text-sm">
            {formatDate(task.endDate, "YYYY/MM/DD")}
          </span>
        ),
    },
    {
      key: "kosu",
      header: "工数",
      width: 90,
      align: "right",
      renderCell: (task) =>
        task.isMilestone ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <span className="text-sm">
            {formatHoursWithUnit(task.duration, kosuUnit)}
          </span>
        ),
    },
    {
      key: "progress",
      header: "進捗",
      width: 70,
      align: "right",
      renderCell: (task) => <span className="text-sm">{task.progress}%</span>,
    },
    {
      key: "status",
      header: "ステータス",
      width: 110,
      renderCell: (task) =>
        task.isMilestone ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <Badge variant="outline">
            {getTaskStatusName(task.status ?? "NOT_STARTED")}
          </Badge>
        ),
    },
    {
      key: "dependencies",
      header: "依存関係",
      width: 220,
      interactive: true,
      renderCell: (task) => (
        <div className="flex items-center gap-1 flex-wrap">
          {task.predecessors.length === 0 ? (
            <span className="text-xs text-muted-foreground">なし</span>
          ) : (
            task.predecessors.map((dep, i) => {
              const pred = taskById.get(dep.taskId);
              return (
                <Badge key={i} variant="secondary" className="text-xs">
                  {pred?.name ?? "不明"} ({dep.type}
                  {dep.lag !== 0 ? `${dep.lag > 0 ? "+" : ""}${dep.lag}d` : ""}
                  )
                </Badge>
              );
            })
          )}
          {!task.isMilestone && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => onEditDependencies(task.id)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "操作",
      width: 70,
      align: "center",
      interactive: true,
      renderCell: (task) => (
        <div className="flex items-center justify-center">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">メニューを開く</span>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!task.isMilestone && (
                <DropdownMenuItem onClick={() => onEditTask(task.id)}>
                  <Pencil className="w-4 h-4" />
                  編集
                </DropdownMenuItem>
              )}
              {!task.isMilestone && (
                <DropdownMenuItem onClick={() => onEditDependencies(task.id)}>
                  <Link2 className="w-4 h-4" />
                  依存関係を編集
                </DropdownMenuItem>
              )}
              {!task.isMilestone && (
                <DropdownMenuItem onClick={() => onDuplicate([task.id])}>
                  <Copy className="w-4 h-4" />
                  複製
                </DropdownMenuItem>
              )}
              {!task.isMilestone && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete([task.id])}
              >
                <Trash2 className="w-4 h-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}
