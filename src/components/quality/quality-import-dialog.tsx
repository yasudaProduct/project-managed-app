"use client";

import { useRef, useState, useTransition } from "react";
import { parse } from "csv-parse/sync";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";
import {
  importQualityFindingsCsv,
  importQualitySizeMetricsCsv,
  importQualityTestProgressCsv,
  importQualityTargetAttributesCsv,
} from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";

interface Props {
  wbsId: number;
  onImported?: () => void;
}

type ImportType = "findings" | "size" | "testProgress" | "attributes";

const importTypeOptions: { value: ImportType; label: string }[] = [
  { value: "findings", label: "指摘/バグ" },
  { value: "size", label: "規模" },
  { value: "testProgress", label: "テスト進捗" },
  { value: "attributes", label: "評価対象属性" },
];

const TEMPLATES: Record<ImportType, string> = {
  findings: "taskNo,source,category,injectionPhase,phenomenonType,causeType,description,foundAt\nT-001,REVIEW,ロジック,基本設計,アベンド,単純ミス,条件分岐の誤り,2026-04-01",
  size: "taskNo,unit,value,measuredAt,note\nT-001,LOC,5000,2026-04-01,初回計測",
  testProgress: "taskNo,date,plannedTotal,executedTotal,passedTotal,failedTotal,blockedTotal\nT-001,2026-04-01,100,50,45,5,0",
  attributes: "taskNo,subsystem,featureGroup\nT-001,ユーザー管理,認証",
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function decodeCsv(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("shift_jis").decode(buf);
  }
}

export function QualityImportDialog({ wbsId, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<ImportType>("findings");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    startTransition(async () => {
      try {
        const text = await decodeCsv(file);
        const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });

        let result;
        switch (importType) {
          case "findings":
            result = await importQualityFindingsCsv(wbsId, rows, mode);
            break;
          case "size":
            result = await importQualitySizeMetricsCsv(wbsId, rows, mode);
            break;
          case "testProgress":
            result = await importQualityTestProgressCsv(wbsId, rows);
            break;
          case "attributes":
            result = await importQualityTargetAttributesCsv(wbsId, rows);
            break;
        }

        if (result.errors.length > 0) {
          toast({
            title: `${result.created}件取込（${result.errors.length}件エラー）`,
            description: result.errors.slice(0, 3).map((e) => `行${e.line}: ${e.message}`).join("\n"),
            variant: "destructive",
          });
        } else {
          toast({ title: `${result.created}件取り込みました` });
        }
        onImported?.();
        setOpen(false);
      } catch (err) {
        toast({
          title: "インポートエラー",
          description: err instanceof Error ? err.message : "CSVの読み込みに失敗しました",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1" />
          CSVインポート
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>CSVインポート</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">データ種別</label>
            <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {importTypeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(importType === "findings" || importType === "size") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">取込モード</label>
              <Select value={mode} onValueChange={(v) => setMode(v as "merge" | "replace")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">追加（merge）</SelectItem>
                  <SelectItem value="replace">置換（replace）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">CSVファイル</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="block w-full text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
              disabled={isPending}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => downloadText(`template_${importType}.csv`, TEMPLATES[importType])}
          >
            <Download className="h-3 w-3 mr-1" />
            テンプレートCSVをダウンロード
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
