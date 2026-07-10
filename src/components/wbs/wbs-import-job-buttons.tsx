"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import GeppoImportModal from "./geppo-import-modal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { WbsSyncMode } from "@/applications/wbs-sync/wbs-sync-mode";
import { createImportJob } from "@/app/import-jobs/actions";

type Props = {
  wbsId: number;
  wbsName: string;
  onCreated?: (jobId: string) => void;
  onRefresh?: () => void;
};

export default function WbsImportJobButtons({
  wbsId,
  wbsName,
  onCreated,
  onRefresh,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [geppoModalOpen, setGeppoModalOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);

  const createWbsJob = async (syncMode: WbsSyncMode = "diff") => {
    setCreating(true);
    try {
      const result = await createImportJob({
        type: "WBS",
        wbsId,
        options: { syncMode },
      });
      if (result.success) {
        toast({
          title: "ジョブ作成",
          description: `WBS(${wbsId})のジョブを作成しました（${syncMode === "replace" ? "洗い替え" : "差分"}）。`,
        });
        onCreated?.(result.data.id);
        onRefresh?.();
      } else {
        toast({
          title: "エラー",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleGeppoClick = () => {
    setGeppoModalOpen(true);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGeppoClick}
          disabled={creating}
        >
          <RefreshCcw className="h-4 w-4" /> 月報
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={creating}>
              <RefreshCcw className="h-4 w-4" /> WBS
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => createWbsJob("diff")}>
              WBS同期（差分）
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReplaceConfirmOpen(true)}>
              WBS同期（洗い替え）
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCcw className="h-4 w-4" /> 更新
          </Button>
        )}
      </div>
      <GeppoImportModal
        open={geppoModalOpen}
        onOpenChange={setGeppoModalOpen}
        wbsName={wbsName}
        onCreated={onCreated}
        onRefresh={onRefresh}
      />
      {/* 洗い替え同期の実行前確認（EVM履歴・実績紐付けへの影響が大きいため） */}
      <AlertDialog
        open={replaceConfirmOpen}
        onOpenChange={setReplaceConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              WBS同期（洗い替え）を実行しますか？
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  洗い替え同期は全タスクを削除して再作成します。以下の影響があります。
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    EVMの進捗スナップショット履歴がすべて削除され、
                    過去日のEVM時系列が再現できなくなります
                  </li>
                  <li>
                    作業実績のタスク紐付けが解除されます
                    （実績自体は残り、EVMのACにはWBS紐付けで計上されます）
                  </li>
                  <li>タスクIDが変わるため、タスクへの参照が無効になります</li>
                </ul>
                <p>
                  通常の同期には「WBS同期（差分）」の使用を推奨します。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creating}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setReplaceConfirmOpen(false);
                createWbsJob("replace");
              }}
              disabled={creating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {creating ? "実行中..." : "洗い替えを実行"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
