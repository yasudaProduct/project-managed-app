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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatDateyyyymmdd, getTaskStatusName } from "@/lib/utils";

export interface TaskTableViewPageProps {
  wbsTasks: WbsTask[];
}

export type TaskTableViewProp = {
  id: string;
  name: string;
  kijunStart?: string;
  kijunEnd?: string;
  kijunKosu?: number;
  yoteiStart?: string;
  yoteiEnd?: string;
  yoteiKosu?: number;
  jissekiStart?: string;
  jissekiEnd?: string;
  jissekiKosu?: number;
  status: TaskStatus;
  assigneeId: string;
  assignee: string;
  phaseId: number;
  phase: string;
};

export const columns: ColumnDef<TaskTableViewProp>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <div className="capitalize">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "name",
    header: "タスク名",
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "kijunStart",
    header: "基準開始日",
    cell: ({ row }) => (
      <div className="capitalize">
        {formatDateyyyymmdd(row.getValue("kijunStart"))}
      </div>
    ),
  },
  {
    accessorKey: "kijunEnd",
    header: "基準終了日",
    cell: ({ row }) => (
      <div className="capitalize">
        {formatDateyyyymmdd(row.getValue("kijunEnd"))}
      </div>
    ),
  },
  {
    accessorKey: "kijunKosu",
    header: "基準工数",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("kijunKosu")}</div>
    ),
  },
  {
    accessorKey: "yoteiStart",
    header: "予定開始日",
    cell: ({ row }) => (
      <div className="capitalize">
        {formatDateyyyymmdd(row.getValue("yoteiStart"))}
      </div>
    ),
  },
  {
    accessorKey: "yoteiEnd",
    header: "予定終了日",
    cell: ({ row }) => (
      <div className="capitalize">
        {formatDateyyyymmdd(row.getValue("yoteiEnd"))}
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
        {formatDateyyyymmdd(row.getValue("jissekiStart"))}
      </div>
    ),
  },
  {
    accessorKey: "jissekiEnd",
    header: "実績終了日",
    cell: ({ row }) => (
      <div className="capitalize">
        {formatDateyyyymmdd(row.getValue("jissekiEnd"))}
      </div>
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
  //   {
  //     accessorKey: "amount",
  //     header: () => <div className="text-right">Amount</div>,
  //     cell: ({ row }) => {
  //       const amount = parseFloat(row.getValue("amount"));

  //       // Format the amount as a dollar amount
  //       const formatted = new Intl.NumberFormat("en-US", {
  //         style: "currency",
  //         currency: "USD",
  //       }).format(amount);

  //       return <div className="text-right font-medium">{formatted}</div>;
  //     },
  //   },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const task = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuItem>👷コピー</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                console.log(task);
              }}
            >
              <Pencil />
              編集
            </DropdownMenuItem>
            <DropdownMenuItem>👷詳細</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function TaskTableViewPage({
  wbsTasks,
}: TaskTableViewPageProps): React.ReactNode {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data:
      wbsTasks.length > 0
        ? wbsTasks.map((wbsTask) => ({
            id: wbsTask.id,
            name: wbsTask.name,
            kijunStart: wbsTask.kijunStart?.toISOString(),
            kijunEnd: wbsTask.kijunEnd?.toISOString(),
            kijunKosu: wbsTask.kijunKosu,
            yoteiStart: wbsTask.yoteiStart?.toISOString(),
            yoteiEnd: wbsTask.yoteiEnd?.toISOString(),
            yoteiKosu: wbsTask.yoteiKosu,
            jissekiStart: wbsTask.jissekiStart?.toISOString(),
            jissekiEnd: wbsTask.jissekiEnd?.toISOString(),
            jissekiKosu: wbsTask.jissekiKosu,
            status: wbsTask.status,
            assigneeId: wbsTask.assigneeId ?? "",
            assignee: wbsTask.assignee?.displayName ?? "",
            phaseId: wbsTask.phaseId ?? 0,
            phase: wbsTask.phase?.name ?? "",
          }))
        : [],
    columns,
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

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        {/* <Input
          placeholder="Filter emails..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        /> */}
        <DropdownMenu>
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
                // <Collapsible key={row.id}>
                //   <CollapsibleTrigger>
                //     <TableRow
                //       key={row.id}
                //       data-state={row.getIsSelected() && "selected"}
                //     >
                //       {row.getVisibleCells().map((cell) => (
                //         <TableCell key={cell.id}>
                //           {flexRender(
                //             cell.column.columnDef.cell,
                //             cell.getContext()
                //           )}
                //         </TableCell>
                //       ))}
                //     </TableRow>
                //   </CollapsibleTrigger>
                //   <CollapsibleContent>
                //     <div className="flex flex-col gap-2">
                //       <p>Hello</p>
                //     </div>
                //   </CollapsibleContent>
                // </Collapsible>
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
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
