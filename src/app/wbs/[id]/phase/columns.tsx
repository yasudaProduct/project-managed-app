"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil } from "lucide-react";
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

export type WbsPhase = {
  id: number;
  name: string;
  code: string;
  seq: number;
  wbsId: number;
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
