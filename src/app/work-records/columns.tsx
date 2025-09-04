"use client";

import type { ColumnDef } from "@tanstack/react-table";

export type WorkRecord = {
  id: number;
  userId: string;
  userName: string;
  taskNo: string | undefined;
  taskName: string | undefined;
  date: string;
  hours_worked: number;
};

export const columns: ColumnDef<WorkRecord & { link?: string }>[] = [
  {
    accessorKey: "userId",
    header: "ユーザーID",
  },
  {
    accessorKey: "userName",
    header: "ユーザー名",
  },
  {
    accessorKey: "taskNo",
    header: "タスクNo",
  },
  {
    accessorKey: "taskName",
    header: "タスク名",
  },
  {
    accessorKey: "date",
    header: "日付",
  },
  {
    accessorKey: "hours_worked",
    header: "工数",
    cell: ({ row }) => {
      const hours = row.getValue("hours_worked");
      if (typeof hours === "number") return hours.toFixed(2);
      return "0.00";
    },
  },
];
