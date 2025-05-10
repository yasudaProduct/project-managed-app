"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export type WorkRecord = {
  id: string;
  userId: string;
  userName: string;
  taskId: string;
  taskName: string;
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
    accessorKey: "taskId",
    header: "タスクID",
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
  },

  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">メニューを開く</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/users/${user.id}`}>
              <DropdownMenuItem>詳細</DropdownMenuItem>
            </Link>
            <Link href={`/users/${user.id}/edit`}>
              <DropdownMenuItem>編集</DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
