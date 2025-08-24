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

export type Project = {
  id: string;
  name: string;
  description: string | undefined;
  startDate: string;
  endDate: string;
  status: string;
};

export const columns: ColumnDef<Project & { link?: string }>[] = [
  {
    accessorKey: "name",
    header: "名前",
  },
  {
    accessorKey: "description",
    header: "説明",
  },
  {
    accessorKey: "startDate",
    header: "開始日",
  },
  {
    accessorKey: "endDate",
    header: "終了予定日",
  },
  {
    accessorKey: "status",
    header: "ステータス",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const project = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">メニューを開く</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/projects/${project.id}`}>
              <DropdownMenuItem>詳細</DropdownMenuItem>
            </Link>
            {/* WRN: 遷移が上手くいかないためコメントアウト */}
            {/* <Link href={`/projects/${project.id}/edit`}>
              <DropdownMenuItem>編集</DropdownMenuItem>
            </Link> */}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
