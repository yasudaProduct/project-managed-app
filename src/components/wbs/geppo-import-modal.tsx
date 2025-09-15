"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wbsName: string;
  onCreated?: (jobId: string) => void;
  onRefresh?: () => void;
};

export default function GeppoImportModal({
  open,
  onOpenChange,
  wbsName,
  onCreated,
  onRefresh,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [creating, setCreating] = useState(false);

  // 現在から過去12ヶ月分の選択肢を生成
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();

    // 「全期間」オプションを追加
    options.push({ value: "ALL", label: "全期間" });

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const value = `${year}-${month}`;
      const label = `${year}年${month}月`;
      options.push({ value, label });
    }

    return options;
  };

  const monthOptions = generateMonthOptions();

  const handleSubmit = async () => {
    setCreating(true);
    try {
      type ImportJobRequest = {
        type: "GEPPO";
        targetProjectIds: string[];
        targetMonth?: string;
        options: Record<string, unknown>;
      };

      const requestBody: ImportJobRequest = {
        type: "GEPPO",
        targetProjectIds: [wbsName],
        targetMonth: selectedMonth === "ALL" ? undefined : selectedMonth,
        options: {},
      };

      const res = await fetch(`/api/import-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (res.ok) {
        const data = await res.json();
        const monthDescription =
          selectedMonth === "ALL" ? "月報(全期間)" : `月報(${selectedMonth})`;
        toast({
          title: "ジョブ作成",
          description: `${monthDescription}のジョブを作成しました。`,
        });
        onCreated?.(data.id);
        onRefresh?.();
        onOpenChange(false);
        setSelectedMonth("ALL");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>月報インポート</DialogTitle>
          <DialogDescription>
            インポートする対象月を選択してください。全期間を選択することも可能です。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="対象月を選択" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? "作成中..." : "インポート"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
