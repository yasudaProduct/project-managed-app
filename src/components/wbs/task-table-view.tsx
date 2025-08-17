"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskStatus, WbsTask } from "@/types/wbs";
import { getTaskStatusName } from "@/lib/utils";
import { formatUTCDateForDisplaySlash } from "@/lib/date-display-utils";
import { TaskModal } from "./task-modal";

export interface TaskTableViewPageProps {
  wbsTasks: WbsTask[];
  wbsId: number;
  onEditTask?: (task: WbsTask) => void;
  onDeleteTask?: (task: WbsTask) => void;
  onCopyTask?: (task: WbsTask) => void;
  onViewTask?: (task: WbsTask) => void;
}

export type TaskTableViewProp = {
  id: string;
  name: string;
  yoteiStart?: Date;
  yoteiEnd?: Date;
  yoteiKosu?: number;
  jissekiStart?: Date;
  jissekiEnd?: Date;
  jissekiKosu?: number;
  status: TaskStatus;
  assigneeId: string;
  assignee: string;
  phaseId: number;
  phase: string;
};

export function TaskTableViewPage({
  wbsTasks,
  wbsId,
}: TaskTableViewPageProps): React.ReactNode {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [editingTask, setEditingTask] = React.useState<WbsTask | null>(null);
  const [isDropDownOpen, setIsDropDownOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<TaskTableViewProp>[]>(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              ID
              <ArrowUpDown />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("id")}</div>
        ),
      },
      {
        accessorKey: "name",
        header: "タスク名",
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("name")}</div>
        ),
      },
      {
        accessorKey: "assignee",
        header: "担当者",
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("assignee")}</div>
        ),
      },
      {
        accessorKey: "yoteiStart",
        header: "予定開始日",
        cell: ({ row }) => (
          <div className="capitalize">
            {formatUTCDateForDisplaySlash(row.getValue("yoteiStart"))}
          </div>
        ),
      },
      {
        accessorKey: "yoteiEnd",
        header: "予定終了日",
        cell: ({ row }) => (
          <div className="capitalize">
            {formatUTCDateForDisplaySlash(row.getValue("yoteiEnd"))}
          </div>
        ),
      },
      {
        accessorKey: "yoteiKosu",
        header: "予定工数",
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("yoteiKosu")}</div>
        ),
      },
      {
        accessorKey: "jissekiStart",
        header: "実績開始日",
        cell: ({ row }) => (
          <div className="capitalize">
            {formatUTCDateForDisplaySlash(row.getValue("jissekiStart"))}
          </div>
        ),
      },
      {
        accessorKey: "jissekiEnd",
        header: "実績終了日",
        cell: ({ row }) => (
          <div className="capitalize">
            {formatUTCDateForDisplaySlash(row.getValue("jissekiEnd"))}
          </div>
        ),
      },
      {
        accessorKey: "jissekiKosu",
        header: "実績工数",
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("jissekiKosu")}</div>
        ),
      },
      {
        accessorKey: "status",
        header: "状況",
        cell: ({ row }) => (
          <div className="capitalize">
            {getTaskStatusName(row.getValue("status"))}
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const task = row.original;
          const originalTask = wbsTasks.find(
            (t) => t.taskNo === task.id
          ) as WbsTask;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    onViewTask?.(originalTask);
                  }}
                >
                  <Eye />
                  詳細
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>操作</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    onEditTask?.(originalTask);
                  }}
                >
                  <Pencil />
                  編集
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onDeleteTask?.(originalTask);
                  }}
                >
                  <Trash />
                  削除
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    onCopyTask?.(originalTask);
                  }}
                >
                  <Copy />
                  コピー
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [wbsTasks]
  );

  const table = useReactTable({
    data:
      wbsTasks.length > 0
        ? wbsTasks.map((wbsTask) => ({
            id: wbsTask.taskNo ?? "",
            name: wbsTask.name,
            yoteiStart: wbsTask.yoteiStart,
            yoteiEnd: wbsTask.yoteiEnd,
            yoteiKosu: wbsTask.yoteiKosu,
            jissekiStart: wbsTask.jissekiStart,
            jissekiEnd: wbsTask.jissekiEnd,
            jissekiKosu: wbsTask.jissekiKosu,
            status: wbsTask.status,
            assigneeId: wbsTask.assigneeId ?? "",
            assignee: wbsTask.assignee?.displayName ?? "",
            phaseId: wbsTask.phaseId ?? 0,
            phase: wbsTask.phase?.name ?? "",
          }))
        : [],
    columns: columns as unknown as ColumnDef<unknown>[],
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const onEditTask = (task: WbsTask) => {
    // ドロップダウンメニューを閉じる
    setIsDropDownOpen(false);
    setTimeout(() => {
      setEditingTask(task);
    }, 200);
  };
  const onDeleteTask = (task: WbsTask) => {
    console.log(task);
  };
  const onCopyTask = (task: WbsTask) => {
    console.log(task);
  };
  const onViewTask = (task: WbsTask) => {
    console.log(task);
  };

  return (
    <>
      <div className="w-full">
        {/* カラム表示切り替え */}
        <div className="flex items-center py-4">
          <DropdownMenu open={isDropDownOpen} onOpenChange={setIsDropDownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* テーブル */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    データがありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* ページネーション */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
      <TaskModal
        wbsId={wbsId}
        task={editingTask || undefined}
        isOpen={editingTask !== null}
        onClose={() => {
          console.log("task-table-view:onClose");
          setEditingTask(null);
          setIsDropDownOpen(false);
        }}
      />
    </>
  );
}
