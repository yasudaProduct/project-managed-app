import { useState, useRef } from "react";
import { Task } from "./gantt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Upload, FileText, Table, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

interface ImportModalProps {
  onImport: (tasks: Task[]) => void;
  onClose: () => void;
}

export const ImportModal = ({ onImport, onClose }: ImportModalProps) => {
  const [importType, setImportType] = useState<"csv" | "excel" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const tasks = parseFileContent(content, file.type);
        onImport(tasks);
      } catch (err) {
        setError(
          "ファイルの解析に失敗しました。形式を確認して再試行してください。"
        );
        console.error("Import error:", err);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parseFileContent = (content: string, fileType: string): Task[] => {
    const lines = content.trim().split("\n");
    const tasks: Task[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line
        .split(",")
        .map((col) => col.trim().replace(/"/g, ""));

      if (columns.length < 4) {
        throw new Error(`行 ${i + 1} の形式が無効です`);
      }

      const [
        name,
        startDateStr,
        endDateStr,
        progressStr,
        colorStr,
        isMilestoneStr,
      ] = columns;

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const progress = parseInt(progressStr) || 0;
      const color = colorStr || "#3B82F6";
      const isMilestone = isMilestoneStr?.toLowerCase() === "true";

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(`行 ${i + 1} の日付形式が無効です`);
      }

      tasks.push({
        id: Date.now().toString() + i,
        name,
        startDate,
        endDate,
        duration: Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ),
        progress,
        color,
        isMilestone,
        predecessors: [],
        level: 0,
        isManuallyScheduled: false,
        category: "General",
        description: "",
        resources: [],
      });
    }

    return tasks;
  };

  const downloadTemplate = () => {
    const csvContent = [
      "Task Name,Start Date,End Date,Progress,Color,Is Milestone",
      "Sample Task 1,2024-01-15,2024-01-25,50,#3B82F6,false",
      "Sample Task 2,2024-01-26,2024-02-15,75,#10B981,false",
      "Sample Milestone,2024-02-16,2024-02-16,100,#EF4444,true",
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.download = "ガントチャートテンプレート.csv";
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  const importOptions = [
    {
      type: "csv",
      title: "CSVファイル",
      description: "カンマ区切り値ファイル",
      icon: FileText,
      accept: ".csv,text/csv",
    },
    {
      type: "excel",
      title: "Excelファイル",
      description: "Microsoft Excelスプレッドシート（CSVとしてエクスポート）",
      icon: Table,
      accept: ".xlsx,.xls,.csv",
    },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>タスクインポート</DialogTitle>
          <DialogDescription>
            CSVまたはExcelファイルからタスクをインポートして、ガントチャートを素早く作成します。
            テンプレートをダウンロードして必要な形式を確認してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!importType ? (
            <>
              <div>
                <Label>インポート形式を選択</Label>
                <div className="grid gap-2 mt-2">
                  {importOptions.map((option) => (
                    <Card
                      key={option.type}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() =>
                        setImportType(option.type as "csv" | "excel")
                      }
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          <CardTitle className="text-sm">
                            {option.title}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                          {option.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSVテンプレートをダウンロード
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  サンプルCSVファイルをダウンロードして必要な形式を確認してください
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>{importType.toUpperCase()}ファイルをアップロード</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      importOptions.find((opt) => opt.type === importType)
                        ?.accept
                    }
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isProcessing ? "処理中..." : "ファイルを選択"}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">必要な列:</p>
                <ul className="space-y-1 text-xs">
                  <li>• タスク名</li>
                  <li>• 開始日 (YYYY-MM-DD)</li>
                  <li>• 終了日 (YYYY-MM-DD)</li>
                  <li>• 進捗 (0-100)</li>
                  <li>• 色 (16進コード、任意)</li>
                  <li>• マイルストーン (true/false、任意)</li>
                </ul>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            {importType && (
              <Button variant="outline" onClick={() => setImportType(null)}>
                戻る
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
