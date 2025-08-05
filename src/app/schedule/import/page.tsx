"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { parse } from "csv-parse/sync";
import { useState } from "react";
import { importScheduleTsv } from "../action";

export default function ScheduleImportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    const file = files[0];
    const fileName = file.name.toLowerCase();

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;

        // ファイル形式の判定
        if (!fileName.endsWith(".txt") || !text.includes("\t")) {
          toast({
            title: "スケジュールのインポートに失敗しました",
            description: "ファイルの形式が正しくありません",
            variant: "destructive",
          });
        }

        // TSV形式として処理
        const tsvData = parse(text, {
          columns: true,
          skip_empty_lines: true,
          delimiter: "\t", // タブ区切り
          quote: '"',
          escape: '"',
          relax_column_count: true, // 列数の不整合を許可
        });
        const result = await importScheduleTsv(tsvData);

        if (result.success) {
          toast({
            title: "スケジュールのインポートに成功しました",
            description: "スケジュールをインポートしました",
          });
          router.push("/schedule");
        } else {
          toast({
            title: "スケジュールのインポートに失敗しました",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Import error:", error);
        toast({
          title: "スケジュールのインポートに失敗しました",
          description: error as string,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file, "UTF-8"); // 日本語対応のためUTF-8指定
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">スケジュールインポート</h1>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>ファイルを選択</Label>
          <Input
            type="file"
            onChange={handleFileChange}
            disabled={isLoading}
            accept=".txt"
          />
          {isLoading && <div className="text-blue-600">インポート中...</div>}
        </div>
      </div>
    </div>
  );
}
