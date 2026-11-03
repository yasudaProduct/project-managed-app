"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { FileText, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/utils/utils";

type FileDropZoneProps = {
  /** 受け付ける拡張子（例: ".csv"） */
  accept: string;
  /** ファイル選択欄のアクセシブルな名前 */
  inputLabel: string;
  /** 対応形式の説明 */
  formatDescription: string;
  selectedFileName?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onFileSelect: (file: File) => void;
};

export function FileDropZone({
  accept,
  inputLabel,
  formatDescription,
  selectedFileName,
  disabled = false,
  isLoading = false,
  onFileSelect,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInactive = disabled || isLoading;

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(accept.toLowerCase())) {
      toast({
        title: "ファイル形式エラー",
        description: `${accept}形式のファイルを選択してください`,
        variant: "destructive",
      });
      return;
    }
    onFileSelect(file);
  };

  const openFilePicker = () => {
    if (isInactive) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isInactive) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isInactive) return;
    selectFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div
      role="button"
      tabIndex={isInactive ? -1 : 0}
      aria-disabled={isInactive}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ease-in-out",
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
        isInactive && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
    >
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        aria-label={inputLabel}
        disabled={isInactive}
        className="hidden"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          // 同じファイルを選び直しても onChange が発火するようにする
          event.target.value = "";
        }}
      />

      <div className="flex flex-col items-center space-y-4">
        <Upload className={cn("w-12 h-12", isDragging ? "text-blue-500" : "text-gray-400")} />
        <div>
          <p className="text-lg font-medium text-gray-700">
            {isDragging ? "ファイルをドロップしてください" : "ファイルをドラッグ&ドロップ"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            または<span className="text-blue-600 hover:text-blue-700">クリックして選択</span>
          </p>
        </div>
        {selectedFileName && (
          <p className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <FileText className="w-4 h-4" />
            <span>{selectedFileName}</span>
          </p>
        )}
        <div className="text-xs text-gray-500">{formatDescription}</div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="text-blue-600 font-medium">インポート中...</div>
        </div>
      )}
    </div>
  );
}
