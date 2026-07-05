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
            <DropdownMenuItem onClick={() => createWbsJob("replace")}>
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
    </>
  );
}
