"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

  const createWbsJob = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/import-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WBS",
          wbsId,
          options: {},
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "ジョブ作成",
          description: `WBS(${wbsId})のジョブを作成しました。`,
        });
        onCreated?.(data.id);
        onRefresh?.();
      } else {
        toast({
          title: "エラー",
          description: await res.text(),
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const createGeppoJob = async () => {
    const month = window.prompt("対象月を入力してください (YYYY-MM)");
    if (!month) return;
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast({
        title: "入力エラー",
        description: "YYYY-MM 形式で入力してください。",
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/import-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GEPPO",
          targetMonth: month,
          targetProjectIds: [wbsName],
          options: {},
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "ジョブ作成",
          description: `月報(${month})のジョブを作成しました。`,
        });
        onCreated?.(data.id);
        onRefresh?.();
      } else {
        toast({
          title: "エラー",
          description: await res.text(),
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={createGeppoJob}
        disabled={creating}
      >
        <RefreshCcw className="h-4 w-4" /> 月報
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={createWbsJob}
        disabled={creating}
      >
        <RefreshCcw className="h-4 w-4" /> WBS
      </Button>
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCcw className="h-4 w-4" /> 更新
        </Button>
      )}
    </div>
  );
}
