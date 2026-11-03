"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parse } from "csv-parse/sync";
import { toast } from "@/hooks/use-toast";
import type { scheduleTsvData } from "@/types/csv";
import { importScheduleTsv } from "../../actions";
import { FileDropZone } from "./file-drop-zone";
import { readFileAsText } from "./read-file-as-text";

const IMPORT_FAILED_TITLE = "スケジュールのインポートに失敗しました";

/**
 * 従来形式（userSchedule.txt / タブ区切り）のスケジュール取込
 * @description 全ユーザーのスケジュールを、ファイルの内容で置き換える。
 */
export function TsvImportForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const importFile = async (file: File) => {
    setIsLoading(true);
    try {
      const text = await readFileAsText(file);
      if (!text.includes("\t")) {
        toast({ title: IMPORT_FAILED_TITLE, description: "ファイルの形式が正しくありません", variant: "destructive" });
        return;
      }

      const tsvData: scheduleTsvData[] = parse(text, {
        columns: true,
        skip_empty_lines: true,
        delimiter: "\t",
        quote: '"',
        escape: '"',
        relax_column_count: true,
      });
      const result = await importScheduleTsv(tsvData);

      if (result.success) {
        toast({ title: "スケジュールのインポートに成功しました", description: "スケジュールをインポートしました" });
        router.push("/schedule");
      } else {
        toast({ title: IMPORT_FAILED_TITLE, description: result.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({ title: IMPORT_FAILED_TITLE, description: "ファイルを読み込めませんでした", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <FileDropZone
        accept=".txt"
        inputLabel="スケジュールTSVファイル"
        formatDescription="対応形式: .txt（TSV形式）"
        isLoading={isLoading}
        onFileSelect={importFile}
      />

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">ファイル形式について</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>TSV形式（タブ区切り）の.txtファイルをインポートできます。</p>
          <p>必要な列: 個人ｺｰﾄﾞ、年月日（YYYY/MM/DD HH:mm:ss）、開始時間、終了時間、ﾀｲﾄﾙ、場所、内容</p>
          <p className="font-medium text-gray-700">
            ※ 全ユーザーの既存スケジュールがファイルの内容で置き換わります（Outlook から取り込んだ予定も削除されます）。
          </p>
        </div>
      </div>
    </div>
  );
}
