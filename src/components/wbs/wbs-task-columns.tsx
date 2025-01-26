"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { WbsTask } from "@/types/wbs";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export const columns: ColumnDef<WbsTask>[] = [
  {
    accessorKey: "name",
    header: "タスク名",
  },
  {
    accessorKey: "assignee.name",
    header: "担当者",
  },
  {
    accessorKey: "status",
    header: "ステータス",
  },
  {
    accessorKey: "yoteiStartDate",
    header: "予定開始日",
    cell: ({ row }) => row.getValue("yoteiStartDate"),
  },
  {
    accessorKey: "yoteiEndDate",
    header: "予定終了日",
    cell: ({ row }) => row.getValue("yoteiEndDate"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const task = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">メニューを開く</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>アクション</DropdownMenuLabel>
            <DropdownMenuItem>
              <Link href={`/wbs/${task.wbsId}/task/${task.id}/edit`}>編集</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
