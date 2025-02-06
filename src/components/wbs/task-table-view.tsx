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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { TaskModal } from "./task-modal";

const data: TaskTableViewPageProp[] = [
  {
    id: "m5gr84i9",
    taskName: "taskName",
    kijunStart: "2025-01-01",
    kijunEnd: "2025-01-01",
    kijunKosu: 1,
    yoteiStart: "2025-01-01",
    yoteiEnd: "2025-01-01",
    yoteiKosu: 1,
    jissekiStart: "2025-01-01",
    jissekiEnd: "2025-01-01",
    jissekiKosu: 1,
    status: "IN_PROGRESS",
  },
  {
    id: "3u1reuv4",
    taskName: "taskName",
    kijunStart: "2025-01-01",
    kijunEnd: "2025-01-01",
    kijunKosu: 1,
    yoteiStart: "2025-01-01",
    yoteiEnd: "2025-01-01",
    yoteiKosu: 1,
    jissekiStart: "2025-01-01",
    jissekiEnd: "2025-01-01",
    jissekiKosu: 1,
    status: "IN_PROGRESS",
  },
  {
    id: "derv1ws0",
    taskName: "taskName",
    kijunStart: "2025-01-01",
    kijunEnd: "2025-01-01",
    kijunKosu: 1,
    yoteiStart: "2025-01-01",
    yoteiEnd: "2025-01-01",
    yoteiKosu: 1,
    jissekiStart: "2025-01-01",
    jissekiEnd: "2025-01-01",
    jissekiKosu: 1,
    status: "IN_PROGRESS",
  },
  {
    id: "5kma53ae",
    taskName: "taskName",
    kijunStart: "2025-01-01",
    kijunEnd: "2025-01-01",
    kijunKosu: 1,
    yoteiStart: "2025-01-01",
    yoteiEnd: "2025-01-01",
    yoteiKosu: 1,
    jissekiStart: "2025-01-01",
    jissekiEnd: "2025-01-01",
    jissekiKosu: 1,
    status: "IN_PROGRESS",
  },
  {
    id: "bhqecj4p",
    taskName: "taskName",
    kijunStart: "2025-01-01",
    kijunEnd: "2025-01-01",
    kijunKosu: 1,
    yoteiStart: "2025-01-01",
    yoteiEnd: "2025-01-01",
    yoteiKosu: 1,
    jissekiStart: "2025-01-01",
    jissekiEnd: "2025-01-01",
    jissekiKosu: 1,
    status: "IN_PROGRESS",
  },
];

export type TaskTableViewPageProp = {
  id: string;
  taskName: string;
  kijunStart?: string;
  kijunEnd?: string;
  kijunKosu?: number;
  yoteiStart?: string;
  yoteiEnd?: string;
  yoteiKosu?: number;
  jissekiStart?: string;
  jissekiEnd?: string;
  jissekiKosu?: number;
  //   status: "pending" | "processing" | "success" | "failed";
  status: TaskStatus;
};

export const columns: ColumnDef<TaskTableViewPageProp>[] = [
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
    accessorKey: "taskName",
    header: "タスク名",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("taskName")}</div>
    ),
  },
  {
    accessorKey: "kijunStart",
    header: "基準開始日",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("kijunStart")}</div>
    ),
  },
  {
    accessorKey: "kijunEnd",
    header: "基準終了日",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("kijunEnd")}</div>
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
      <div className="capitalize">{row.getValue("yoteiStart")}</div>
    ),
  },
  {
    accessorKey: "yoteiEnd",
    header: "予定終了日",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("yoteiEnd")}</div>
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
      <div className="capitalize">{row.getValue("jissekiStart")}</div>
    ),
  },
  {
    accessorKey: "jissekiEnd",
    header: "実績終了日",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("jissekiEnd")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("status")}</div>
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
      const payment = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment.id)}
            >
              Copy payment ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View payment details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function TaskTableViewPage() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
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
                  No results.
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
