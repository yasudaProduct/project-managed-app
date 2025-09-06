"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Wbs = {
  id: number;
  projectId: string;
  name: string;
};

export const columns: ColumnDef<Wbs & { link?: string }>[] = [
  {
    accessorKey: "name",
    header: "WBS名",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const wbs = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">メニューを開く</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* WRN: 遷移が上手くいかないためコメントアウト
            <Link href={`/projects/${wbs.projectId}/wbs/${wbs.id}/edit`}>
              <DropdownMenuItem>編集</DropdownMenuItem>
            </Link> 
            */}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
