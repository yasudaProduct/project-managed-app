"use client";

import { useRef, useState, useTransition } from "react";
import { parse } from "csv-parse/sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Upload, FileDown } from "lucide-react";
import { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";
import {
  importQualityFindingsCsv,
  importQualitySizeMetricsCsv,
  exportQualityFindingsTsv,
  exportQualitySizeMetricsTsv,
  exportQualitySummaryTsv,
} from "@/app/wbs/[id]/actions/quality-actions";
import { toast } from "@/hooks/use-toast";

type SizeUnitOption = QualitySizeUnit | "MAN_HOUR";

interface Props {
  wbsId: number;
  sizeUnit: SizeUnitOption;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

export function QualityImportExport({ wbsId, sizeUnit }: Props) {
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isWorking, startTransition] = useTransition();
  const findingInputRef = useRef<HTMLInputElement>(null);
  const sizeInputRef = useRef<HTMLInputElement>(null);

  const handleFindingFile = async (file: File) => {
    startTransition(async () => {
      try {
        const text = await readFileAsText(file);
        const rows = parse(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        const result = await importQualityFindingsCsv(wbsId, rows, importMode);
        if (result.errors.length > 0) {
          toast({
            title: `指摘インポート: ${result.created}件登録、${result.errors.length}件エラー`,
            description: result.errors
              .slice(0, 5)
              .map((e) => `行${e.line}: ${e.message}`)
              .join("\n"),
            variant: "destructive",
          });
        } else {
          toast({
            title: "指摘をインポートしました",
            description: `${result.created}件を登録しました`,
          });
        }
      } catch (err) {
        toast({
          title: "インポート失敗",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
    });
  };

  const handleSizeFile = async (file: File) => {
    startTransition(async () => {
      try {
        const text = await readFileAsText(file);
        const rows = parse(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        const result = await importQualitySizeMetricsCsv(wbsId, rows, importMode);
        if (result.errors.length > 0) {
          toast({
            title: `規模インポート: ${result.created}件登録、${result.errors.length}件エラー`,
            description: result.errors
              .slice(0, 5)
              .map((e) => `行${e.line}: ${e.message}`)
              .join("\n"),
            variant: "destructive",
          });
        } else {
          toast({
            title: "規模をインポートしました",
            description: `${result.created}件を登録しました`,
          });
        }
      } catch (err) {
        toast({
          title: "インポート失敗",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
    });
  };

  const handleExport = async (kind: "findings" | "size" | "summary") => {
    startTransition(async () => {
      try {
        let tsv: string;
        let filename: string;
        if (kind === "findings") {
          tsv = await exportQualityFindingsTsv(wbsId);
          filename = `quality-findings-wbs${wbsId}.tsv`;
        } else if (kind === "size") {
          tsv = await exportQualitySizeMetricsTsv(wbsId);
          filename = `quality-size-wbs${wbsId}.tsv`;
        } else {
          tsv = await exportQualitySummaryTsv(wbsId, sizeUnit);
          filename = `quality-summary-wbs${wbsId}.tsv`;
        }
        downloadText(filename, tsv);
      } catch (err) {
        toast({
          title: "エクスポート失敗",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileDown className="h-4 w-4" />
          CSVインポート / TSVエクスポート
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">インポートモード</span>
            <Select value={importMode} onValueChange={(v) => setImportMode(v as "merge" | "replace")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">追加 (merge)</SelectItem>
                <SelectItem value="replace">置換 (replace)</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => findingInputRef.current?.click()}
            disabled={isWorking}
          >
            <Upload className="h-4 w-4 mr-2" />
            指摘CSV取込
          </Button>

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => sizeInputRef.current?.click()}
            disabled={isWorking}
          >
            <Upload className="h-4 w-4 mr-2" />
            規模CSV取込
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isWorking}>
                <Download className="h-4 w-4 mr-2" />
                TSV出力
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("summary")}>
                サマリ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("findings")}>
                指摘一覧
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("size")}>
                規模一覧
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-xs text-gray-500">
          <p>指摘CSV列: <code>taskNo, severity, category, description, foundAt</code></p>
          <p>規模CSV列: <code>taskNo, unit, value, measuredAt, note</code></p>
          <p>severity: MAJOR/MINOR/INFO、unit: PAGE/LINES_OF_CODE/TEST_CASE</p>
        </div>
      </CardContent>
    </Card>
  );
}
