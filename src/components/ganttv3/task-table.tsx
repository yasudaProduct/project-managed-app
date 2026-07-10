"use client";

import React from "react";
import { Task } from "./gantt";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Checkbox } from "../ui/checkbox";

/**
 * 列定義。ヘッダー名・幅・寄せ・セルに表示するデータの全てを
 * 呼び出し側（props）から渡す。TaskTable 自身は描画にのみ責務を持つ。
 */
export interface TaskTableColumn {
  /** 列の一意キー */
  key: string;
  /** ヘッダーに表示する内容 */
  header: React.ReactNode;
  /** 列幅（数値はpx、文字列はCSS値）。未指定は auto */
  width?: number | string;
  /** セル・ヘッダーの文字寄せ */
  align?: "left" | "center" | "right";
  /** ヘッダー・セルへ付与する追加クラス */
  className?: string;
  /**
   * このセル内でクリックを処理する（ボタン等を含む）場合に true。
   * true のとき行クリック（onRowActivate）へイベントが伝播しない。
   */
  interactive?: boolean;
  /** セルに表示する内容を組み立てる */
  renderCell: (task: Task) => React.ReactNode;
}

export interface TaskTableProps {
  /** 表示するタスク */
  tasks: Task[];
  /** 列定義（ヘッダー名・幅・表示データを全て外部から渡す） */
  columns: TaskTableColumn[];
  /** 行の高さ(px) */
  rowHeight?: number;
  /** ヘッダー行の高さ(px) */
  headerHeight?: number;
  /** 選択チェックボックス列を表示するか */
  selectable?: boolean;
  /** 選択中タスクID（制御コンポーネントとして親が保持） */
  selectedTaskIds?: Set<string>;
  /** 選択変更通知 */
  onSelectionChange?: (ids: Set<string>) => void;
  /** 行クリック時のアクション（編集モーダルを開くなど、外部から渡す） */
  onRowActivate?: (task: Task) => void;
  /** 行ごとの追加クラス（クリティカルパス強調など） */
  getRowClassName?: (task: Task) => string;
  /** テーブル上部に差し込むツールバー */
  toolbar?: React.ReactNode;
  /** タスクが空のときの表示 */
  emptyMessage?: React.ReactNode;
}

const widthToStyle = (width?: number | string): React.CSSProperties =>
  width === undefined
    ? {}
    : { width: typeof width === "number" ? `${width}px` : width };

const alignToClass = (align?: "left" | "center" | "right"): string =>
  align === "center"
    ? "text-center"
    : align === "right"
    ? "text-right"
    : "text-left";

export const TaskTable = ({
  tasks,
  columns,
  rowHeight = 44,
  headerHeight = 44,
  selectable = false,
  selectedTaskIds,
  onSelectionChange,
  onRowActivate,
  getRowClassName,
  toolbar,
  emptyMessage = "タスクがありません。",
}: TaskTableProps) => {
  const selected = selectedTaskIds ?? new Set<string>();
  const allSelected =
    tasks.length > 0 && tasks.every((t) => selected.has(t.id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(
      allSelected ? new Set() : new Set(tasks.map((t) => t.id))
    );
  };

  const toggleOne = (taskId: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    onSelectionChange(next);
  };

  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div className="w-full">
      {toolbar}
      <div className="overflow-auto max-h-[calc(100vh-200px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow style={{ height: headerHeight }}>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${alignToClass(col.align)} ${col.className ?? ""}`}
                  style={widthToStyle(col.width)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  style={{ height: rowHeight }}
                  data-state={selected.has(task.id) ? "selected" : undefined}
                  className={`${selected.has(task.id) ? "bg-muted/50" : ""} ${
                    onRowActivate ? "cursor-pointer" : ""
                  } ${getRowClassName?.(task) ?? ""}`}
                  onClick={
                    onRowActivate ? () => onRowActivate(task) : undefined
                  }
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(task.id)}
                        onCheckedChange={() => toggleOne(task.id)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`${alignToClass(col.align)} ${
                        col.className ?? ""
                      }`}
                      style={widthToStyle(col.width)}
                      onClick={
                        col.interactive
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
                      {col.renderCell(task)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
