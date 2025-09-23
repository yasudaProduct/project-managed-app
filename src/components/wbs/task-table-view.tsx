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
  getGroupedRowModel,
  getExpandedRowModel,
  type GroupingState,
  type PaginationState,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { formatDate } from "@/lib/date-util";
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
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10000,
  });
  const handleGroupBy = React.useCallback(
    (key: "none" | "phase" | "assignee" | "status") => {
      if (key === "none") {
        if (grouping.length > 0) setGrouping([]);
        return;
      }
      if (grouping[0] !== key) setGrouping([key]);
    },
    [grouping]
  );

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
        accessorKey: "phase",
        header: "工程",
        enableGrouping: true,
        cell: (ctx) => {
          const { row, getValue } = ctx;
          const isGroupRow = row.getCanExpand?.() ?? false;
          const isGroupedColumn = grouping[0] === "phase";
          if (isGroupRow && isGroupedColumn) {
            return (
              <Button
                variant="ghost"
                className="p-0"
                onClick={ctx.row.getToggleExpandedHandler()}
              >
                {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />} {""}
                {getValue<string>() || "未設定"}（{row.subRows.length}）
              </Button>
            );
          }
          if (isGroupRow) {
            return <span>-</span>;
          }
          return <div className="capitalize">{getValue<string>()}</div>;
        },
      },
      {
        accessorKey: "assignee",
        header: "担当者",
        enableGrouping: true,
        cell: (ctx) => {
          const { row, getValue } = ctx;
          const isGroupRow = row.getCanExpand?.() ?? false;
          const isGroupedColumn = grouping[0] === "assignee";
          if (isGroupRow && isGroupedColumn) {
            return (
              <Button
                variant="ghost"
                className="p-0"
                onClick={ctx.row.getToggleExpandedHandler()}
              >
                {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />} {""}
                {getValue<string>() || "未設定"}（{row.subRows.length}）
              </Button>
            );
          }
          if (isGroupRow) {
            return <span>-</span>;
          }
          return <div className="capitalize">{getValue<string>()}</div>;
        },
      },
      {
        accessorKey: "yoteiStart",
        header: "予定開始日",
        cell: ({ row }) => (
          <div className="capitalize">
            {formatDate(row.getValue("yoteiStart"), "YYYY/MM/DD")}
          </div>
        ),
        aggregatedCell: ({ row }) => {
          const leafRows = row.getLeafRows();
          if (!leafRows.length) return <span>-</span>;
          const starts = leafRows
            .map((r) => (r.original as TaskTableViewProp).yoteiStart)
            .filter(Boolean) as Date[];
          const ends = leafRows
            .map((r) => (r.original as TaskTableViewProp).yoteiEnd)
            .filter(Boolean) as Date[];
          if (starts.length === 0 && ends.length === 0) return <span>-</span>;
          const minStart = starts.length
            ? new Date(Math.min(...starts.map((d) => d.getTime())))
            : undefined;
          const maxEnd = ends.length
            ? new Date(Math.max(...ends.map((d) => d.getTime())))
            : undefined;
          const left = minStart ? formatDate(minStart, "YYYY/MM/DD") : "-";
          const right = maxEnd ? formatDate(maxEnd, "YYYY/MM/DD") : "-";
          return (
            <div className="font-medium">
              {left} - {right}
            </div>
          );
        },
      },
      {
        accessorKey: "yoteiEnd",
        header: "予定終了日",
        cell: ({ row }) => (
          <div className="capitalize">
            {formatDate(row.getValue("yoteiEnd"), "YYYY/MM/DD")}
          </div>
        ),
        aggregatedCell: () => <span />,
      },
      {
        accessorKey: "yoteiKosu",
        header: "予定工数",
        aggregationFn: "sum",
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("yoteiKosu")}</div>
        ),
        aggregatedCell: ({ getValue }) => (
          <div className="font-medium">{getValue<number>()}</div>
        ),
      },
      {
        accessorKey: "jissekiStart",
        header: "実績開始日",
        cell: ({ row }) => (
          <div className="capitalize">
            {formatDate(row.getValue("jissekiStart"), "YYYY/MM/DD")}
          </div>
        ),
        aggregatedCell: ({ row }) => {
          const leafRows = row.getLeafRows();
          if (!leafRows.length) return <span>-</span>;
          const starts = leafRows
            .map((r) => (r.original as TaskTableViewProp).jissekiStart)
            .filter(Boolean) as Date[];
          const ends = leafRows
            .map((r) => (r.original as TaskTableViewProp).jissekiEnd)
            .filter(Boolean) as Date[];
          if (starts.length === 0 && ends.length === 0) return <span>-</span>;
          const minStart = starts.length
            ? new Date(Math.min(...starts.map((d) => d.getTime())))
            : undefined;
          const maxEnd = ends.length
            ? new Date(Math.max(...ends.map((d) => d.getTime())))
            : undefined;
          const left = minStart ? formatDate(minStart, "YYYY/MM/DD") : "-";
          const right = maxEnd ? formatDate(maxEnd, "YYYY/MM/DD") : "-";
          return (
            <div className="font-medium">
              {left} - {right}
            </div>
          );
        },
      },
      {
        accessorKey: "jissekiEnd",
        header: "実績終了日",
        cell: ({ row }) => (
          <div className="capitalize">
            {formatDate(row.getValue("jissekiEnd"), "YYYY/MM/DD")}
          </div>
        ),
        aggregatedCell: () => <span />,
      },
      {
        accessorKey: "jissekiKosu",
        header: "実績工数",
        aggregationFn: "sum",
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("jissekiKosu")}</div>
        ),
        aggregatedCell: ({ getValue }) => (
          <div className="font-medium">{getValue<number>()}</div>
        ),
      },
      {
        accessorKey: "status",
        header: "状況",
        enableGrouping: true,
        cell: (ctx) => {
          const { row, getValue } = ctx;
          const isGroupRow = row.getCanExpand?.() ?? false;
          const isGroupedColumn = grouping[0] === "status";
          if (isGroupRow && isGroupedColumn) {
            const value = getValue<TaskStatus>();
            return (
              <Button
                variant="ghost"
                className="p-0"
                onClick={ctx.row.getToggleExpandedHandler()}
              >
                {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />} {""}
                {getTaskStatusName(value)}（{row.subRows.length}）
              </Button>
            );
          }
          if (isGroupRow) {
            return <span>-</span>;
          }
          return (
            <div className="capitalize">
              {getTaskStatusName(row.getValue("status"))}
            </div>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: (ctx) => {
          const isAggregated = ctx.cell.getIsAggregated?.() ?? false;
          const isPlaceholder = ctx.cell.getIsPlaceholder?.() ?? false;
          if (ctx.row.getCanExpand?.() || isAggregated || isPlaceholder) {
            return null;
          }
          const { row } = ctx;
          const task = row.original as TaskTableViewProp;
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
    [grouping, wbsTasks]
  );

  const tableData = React.useMemo<TaskTableViewProp[]>(
    () =>
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
            assigneeId: String(wbsTask.assigneeId ?? ""),
            assignee: wbsTask.assignee?.displayName ?? "未設定",
            phaseId: wbsTask.phaseId ?? 0,
            phase: wbsTask.phase?.name ?? "未設定",
          }))
        : [],
    [wbsTasks]
  );

  const table = useReactTable({
    data: tableData,
    columns: columns as unknown as ColumnDef<unknown>[],
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
      pagination,
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-2">
                Group By <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={grouping[0] ?? "none"}
                onValueChange={(val) =>
                  handleGroupBy(val as "none" | "phase" | "assignee" | "status")
                }
              >
                <DropdownMenuRadioItem value="none">なし</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="phase">
                  工程
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="assignee">
                  担当者
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="status">
                  ステータス
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
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
              {(table.getRowModel().rows ?? []).length ? (
                (() => {
                  const rows = table.getRowModel().rows;
                  return rows.map((row) => (
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
                  ));
                })()
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
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm text-muted-foreground">表示件数</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
