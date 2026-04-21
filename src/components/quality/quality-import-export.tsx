"use client";

import { useRef, useState, useTransition } from "react";
import { parse } from "csv-parse/sync";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Upload } from "lucide-react";
import {
  importQualityFindingsCsv,
  importQualitySizeMetricsCsv,
} from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";

interface Props {
  wbsId: number;
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const FINDING_CSV_HEADER = "taskNo,severity,category,description,foundAt";
const SIZE_CSV_HEADER = "taskNo,unit,value,measuredAt,note";

async function readFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return decoder.decode(buffer);
  } catch {
    const decoder = new TextDecoder("shift_jis");
    return decoder.decode(buffer);
  }
}

export function QualityImportExport({ wbsId }: Props) {
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isWorking, startTransition] = useTransition();
  const findingInputRef = useRef<HTMLInputElement>(null);
  const sizeInputRef = useRef<HTMLInputElement>(null);

  const handleFindingFile = async (file: File) => {
    startTransition(async () => {
      try {
        const text = await readFileAsText(file);
        const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
        const result = await importQualityFindingsCsv(wbsId, rows, importMode);
        if (result.errors.length > 0) {
          toast({
            title: `指摘インポート: ${result.created}件登録、${result.errors.length}件エラー`,
            description: result.errors.slice(0, 5).map((e) => `行${e.line}: ${e.message}`).join("\n"),
            variant: "destructive",
          });
        } else {
          toast({ title: "指摘をインポートしました", description: `${result.created}件を登録しました` });
        }
      } catch (err) {
        toast({ title: "インポート失敗", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
      }
    });
  };

  const handleSizeFile = async (file: File) => {
    startTransition(async () => {
      try {
        const text = await readFileAsText(file);
        const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
        const result = await importQualitySizeMetricsCsv(wbsId, rows, importMode);
        if (result.errors.length > 0) {
          toast({
            title: `規模インポート: ${result.created}件登録、${result.errors.length}件エラー`,
            description: result.errors.slice(0, 5).map((e) => `行${e.line}: ${e.message}`).join("\n"),
            variant: "destructive",
          });
        } else {
          toast({ title: "規模をインポートしました", description: `${result.created}件を登録しました` });
        }
      } catch (err) {
        toast({ title: "インポート失敗", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
      }
    });
  };

  return (
    <>
      <input
        ref={findingInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFindingFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={sizeInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSizeFile(file);
          e.target.value = "";
        }}
      />

      <Select value={importMode} onValueChange={(v) => setImportMode(v as "merge" | "replace")}>
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="merge">追加</SelectItem>
          <SelectItem value="replace">置換</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={() => findingInputRef.current?.click()} disabled={isWorking}>
        <Upload className="h-3.5 w-3.5 mr-1" />
        指摘CSV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => downloadText("quality-findings-template.csv", FINDING_CSV_HEADER + "\n", "text/csv")}
        disabled={isWorking}
      >
        <Download className="h-3.5 w-3.5 mr-1" />
        指摘テンプレート
      </Button>

      <Button variant="outline" size="sm" onClick={() => sizeInputRef.current?.click()} disabled={isWorking}>
        <Upload className="h-3.5 w-3.5 mr-1" />
        規模CSV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => downloadText("quality-size-template.csv", SIZE_CSV_HEADER + "\n", "text/csv")}
        disabled={isWorking}
      >
        <Download className="h-3.5 w-3.5 mr-1" />
        規模テンプレート
      </Button>
    </>
  );
}
