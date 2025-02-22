"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { deleteWbsAssignee } from "../wbs-assignee-actions";

export type WbsAssignee = {
  id: number;
  assignee: {
    id: string;
    name: string;
  };
  wbsId: number;
};

export const columns: ColumnDef<WbsAssignee>[] = [
  {
    accessorKey: "assignee.name",
    header: "担当者",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const wbsPhase = row.original;

      const handleDelete = async (id: number) => {
        const result = await deleteWbsAssignee(id);
        try {
          if (result.success) {
            toast({ title: "削除しました。" });
          } else {
            toast({
              title: "エラーが発生しました。",
              description: result.error,
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "エラーが発生しました。",
            description:
              error instanceof Error ? error.message : "不明なエラー",
            variant: "destructive",
          });
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">メニューを開く</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(wbsPhase.id)}
            >
              <Trash className="h-4 w-4" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
