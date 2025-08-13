"use client";

import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { parse } from "csv-parse/sync";
import { useState, useRef } from "react";
import { importScheduleTsv } from "../action";
import { Upload } from "lucide-react";

export default function ScheduleImportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsLoading(true);
    const fileName = file.name.toLowerCase();

    // ArrayBufferとして読み込む
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        
        // SJISからUTF-8に変換
        let text: string;
        try {
          // まずSJISとしてデコードを試みる
          const decoder = new TextDecoder("shift_jis");
          text = decoder.decode(buffer);
        } catch (e) {
          // SJISのデコードに失敗した場合はUTF-8として試みる
          const decoder = new TextDecoder("utf-8");
          text = decoder.decode(buffer);
        }

        // ファイル形式の判定
        if (!fileName.endsWith(".txt") || !text.includes("\t")) {
          toast({
            title: "スケジュールのインポートに失敗しました",
            description: "ファイルの形式が正しくありません",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
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
    reader.readAsArrayBuffer(file); // バイナリとして読み込む
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFile(files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // .txtファイルのみ受け付ける
    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".txt")) {
      toast({
        title: "ファイル形式エラー",
        description: ".txt形式のファイルを選択してください",
        variant: "destructive",
      });
      return;
    }

    processFile(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">スケジュールインポート</h1>

      <div className="space-y-6">
        {/* ドラッグ&ドロップエリア */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <Input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={isLoading}
            accept=".txt"
            className="hidden"
          />

          <div className="flex flex-col items-center space-y-4">
            <Upload
              className={`w-12 h-12 ${
                isDragging ? "text-blue-500" : "text-gray-400"
              }`}
            />

            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragging
                  ? "ファイルをドロップしてください"
                  : "ファイルをドラッグ&ドロップ"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                または
                <span className="text-blue-600 hover:text-blue-700">
                  クリックして選択
                </span>
              </p>
            </div>

            <div className="text-xs text-gray-500">
              対応形式: .txt (TSV形式)
            </div>
          </div>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
              <div className="text-blue-600 font-medium">インポート中...</div>
            </div>
          )}
        </div>

        {/* ファイル形式の説明 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">
            ファイル形式について
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>TSV形式（タブ区切り）の.txtファイルをインポートできます。</p>
            <p>必要な列:</p>
          </div>
        </div>
      </div>
    </div>
  );
}
