"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhaseForm } from "../../phase/phase.form";
import { toast } from "@/hooks/use-toast";
import { deleteWbsPhase } from "../actions/wbs-phase-actions";

export type WbsPhase = {
  id: number;
  name: string;
  code: string;
  seq: number;
  wbsId: number;
  link?: string;
};

export const columns: ColumnDef<WbsPhase>[] = [
  {
    accessorKey: "name",
    header: "名前",
  },
  {
    accessorKey: "code",
    header: "コード",
  },
  {
    accessorKey: "seq",
    header: "順番",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const wbsPhase = row.original;

      const handleDelete = async (id: number) => {
        const result = await deleteWbsPhase(id);
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
        <>
          <Dialog modal={true}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">メニューを開く</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DialogTrigger asChild>
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4" />
                    編集
                  </DropdownMenuItem>
                </DialogTrigger>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(wbsPhase.id)}
                >
                  <Trash className="h-4 w-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>編集</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                <PhaseForm phase={wbsPhase} wbsId={wbsPhase.wbsId} />
              </DialogDescription>
            </DialogContent>
          </Dialog>
        </>
      );
    },
  },
];
