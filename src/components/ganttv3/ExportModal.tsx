import { useState } from "react";
import { Task } from "./gantt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Download,
  FileImage,
  FileText,
  File,
  Copy,
  Monitor,
  AlertCircle,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";

interface ExportModalProps {
  ganttRef: React.RefObject<HTMLDivElement>;
  tasks: Task[];
  onClose: () => void;
}

export const ExportModal = ({ ganttRef, tasks, onClose }: ExportModalProps) => {
  const [format, setFormat] = useState<"png" | "svg" | "pdf">("png");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "4:3" | "custom">(
    "16:9"
  );
  const [quality, setQuality] = useState(100);
  const [includeGrid, setIncludeGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [clipboardError, setClipboardError] = useState(false);

  const handleExport = async () => {
    if (!ganttRef.current) return;

    setIsExporting(true);
    setExportSuccess(false);

    try {
      switch (format) {
        case "png":
          await exportToPNG();
          break;
        case "svg":
          await exportToSVG();
          break;
        case "pdf":
          await exportToPDF();
          break;
      }
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!ganttRef.current) return;

    try {
      // Create a canvas with PowerPoint-optimized dimensions
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // PowerPoint slide dimensions (16:9 at 1920x1080)
      canvas.width =
        aspectRatio === "16:9" ? 1920 : aspectRatio === "4:3" ? 1440 : 1600;
      canvas.height =
        aspectRatio === "16:9" ? 1080 : aspectRatio === "4:3" ? 1080 : 900;

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add title
      ctx.fillStyle = "#333";
      ctx.font = "bold 48px Arial";
      ctx.fillText("プロジェクトタイムライン", 80, 100);

      // Add date
      ctx.font = "24px Arial";
      ctx.fillStyle = "#666";
      ctx.fillText(`生成日: ${new Date().toLocaleDateString()}`, 80, 140);

      // Draw tasks
      tasks.forEach((task, index) => {
        const y = 200 + index * 80;
        const barWidth = 600;
        const barHeight = 50;

        // Task bar background
        ctx.fillStyle = `${task.color}30`;
        ctx.fillRect(80, y, barWidth, barHeight);

        // Task bar progress
        ctx.fillStyle = task.color;
        ctx.fillRect(80, y, barWidth * (task.progress / 100), barHeight);

        // Task outline
        ctx.strokeStyle = task.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(80, y, barWidth, barHeight);

        // Task name
        ctx.fillStyle = "#333";
        ctx.font = "bold 24px Arial";
        ctx.fillText(task.name, 720, y + 20);

        // Dates
        ctx.font = "18px Arial";
        ctx.fillStyle = "#666";
        ctx.fillText(
          `${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}`,
          720,
          y + 45
        );

        // Progress
        if (!task.isMilestone) {
          ctx.fillStyle = "#999";
          ctx.font = "16px Arial";
          ctx.fillText(`${task.progress}%`, 720, y + 65);
        }
      });

      // Try clipboard API first, fallback to download
      try {
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
            },
            "image/png",
            quality / 100
          );
        });

        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setExportSuccess(true);
          setClipboardError(false);
          setTimeout(() => setExportSuccess(false), 3000);
        } else {
          throw new Error("Clipboard API not available");
        }
      } catch (clipboardErr) {
        console.warn(
          "Clipboard failed, falling back to download:",
          clipboardErr
        );
        setClipboardError(true);

        // Fallback: download the image
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.download = `ガントチャートPowerPoint-${
                new Date().toISOString().split("T")[0]
              }.png`;
              link.href = url;
              link.click();
              URL.revokeObjectURL(url);

              setExportSuccess(true);
              setTimeout(() => {
                setExportSuccess(false);
                setClipboardError(false);
              }, 5000);
            }
          },
          "image/png",
          quality / 100
        );
      }
    } catch (error) {
      console.error("Copy failed:", error);
      setClipboardError(true);
    }
  };

  const exportToPNG = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx || !ganttRef.current) return;

    // Set dimensions based on aspect ratio
    const width =
      aspectRatio === "16:9" ? 1920 : aspectRatio === "4:3" ? 1440 : 1600;
    const height =
      aspectRatio === "16:9" ? 1080 : aspectRatio === "4:3" ? 1080 : 900;

    canvas.width = width;
    canvas.height = height;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add title
    ctx.fillStyle = "#333";
    ctx.font = "bold 48px Arial";
    ctx.fillText("プロジェクトタイムライン", 80, 100);

    // Add date
    ctx.font = "24px Arial";
    ctx.fillStyle = "#666";
    ctx.fillText(`生成日: ${new Date().toLocaleDateString()}`, 80, 140);

    // Draw tasks
    tasks.forEach((task, index) => {
      const y = 200 + index * 80;
      const barWidth = 600;
      const barHeight = 50;

      // Task bar background
      ctx.fillStyle = `${task.color}30`;
      ctx.fillRect(80, y, barWidth, barHeight);

      // Task bar progress
      ctx.fillStyle = task.color;
      ctx.fillRect(80, y, barWidth * (task.progress / 100), barHeight);

      // Task outline
      ctx.strokeStyle = task.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(80, y, barWidth, barHeight);

      // Task name
      ctx.fillStyle = "#333";
      ctx.font = "bold 24px Arial";
      ctx.fillText(task.name, 720, y + 20);

      // Dates
      ctx.font = "18px Arial";
      ctx.fillStyle = "#666";
      ctx.fillText(
        `${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}`,
        720,
        y + 45
      );

      // Progress or milestone indicator
      if (task.isMilestone) {
        ctx.fillStyle = task.color;
        ctx.font = "16px Arial";
        ctx.fillText("🔶 マイルストーン", 720, y + 65);
      } else {
        ctx.fillStyle = "#999";
        ctx.font = "16px Arial";
        ctx.fillText(`${task.progress}%`, 720, y + 65);
      }
    });

    const link = document.createElement("a");
    link.download = `ガントチャート-${
      new Date().toISOString().split("T")[0]
    }.png`;
    link.href = canvas.toDataURL("image/png", quality / 100);
    link.click();
  };

  const exportToSVG = async () => {
    const width =
      aspectRatio === "16:9" ? 1920 : aspectRatio === "4:3" ? 1440 : 1600;
    const height =
      aspectRatio === "16:9" ? 1080 : aspectRatio === "4:3" ? 1080 : 900;

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text x="80" y="100" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#333">
          プロジェクトタイムライン
        </text>
        <text x="80" y="140" font-family="Arial, sans-serif" font-size="24" fill="#666">
          生成日: ${new Date().toLocaleDateString()}
        </text>
        ${tasks
          .map((task, index) => {
            const y = 200 + index * 80;
            const barWidth = 600;
            const barHeight = 50;
            return `
            <g>
              <rect x="80" y="${y}" width="${barWidth}" height="${barHeight}" 
                    fill="${task.color}30" stroke="${
              task.color
            }" stroke-width="3"/>
              <rect x="80" y="${y}" width="${
              barWidth * (task.progress / 100)
            }" height="${barHeight}" 
                    fill="${task.color}"/>
              <text x="720" y="${
                y + 25
              }" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333">
                ${task.name}
              </text>
              <text x="720" y="${
                y + 50
              }" font-family="Arial, sans-serif" font-size="18" fill="#666">
                ${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}
              </text>
              <text x="720" y="${
                y + 70
              }" font-family="Arial, sans-serif" font-size="16" fill="#999">
                ${task.isMilestone ? "🔶 マイルストーン" : `${task.progress}%`}
              </text>
            </g>
          `;
          })
          .join("")}
      </svg>
    `;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.download = `ガントチャート-${
      new Date().toISOString().split("T")[0]
    }.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    const pdfContent = `PowerPointガントチャートエクスポート
生成日: ${new Date().toLocaleDateString()}

プロジェクトタイムライン概要:
${tasks
  .map(
    (task) => `
• ${task.name}
  期間: ${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}
  進捗: ${task.progress}%
  タイプ: ${task.isMilestone ? "マイルストーン" : "タスク"}
  色: ${task.color}
`
  )
  .join("")}

PowerPointでの使用方法:
1. 最良の結果のためにダウンロードされたPNG画像を使用してください
2. 画像をPowerPointスライドに挿入してください
3. スライドレイアウトに合わせてサイズを調整してください（16:9推奨）
4. 必要に応じてプレゼンテーションテーマを適用してください
5. 必要に応じて追加のテキストや注釈を追加してください
    `;

    const blob = new Blob([pdfContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.download = `ガントチャートデータ-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  const formatOptions = [
    {
      value: "png",
      label: "PNG画像",
      icon: FileImage,
      description: "PowerPointスライドに最適",
      recommended: true,
    },
    {
      value: "svg",
      label: "SVGベクター",
      icon: File,
      description: "任意のサイズにスケーラブル",
    },
    {
      value: "pdf",
      label: "データエクスポート",
      icon: FileText,
      description: "手動作成用のテキストデータ",
    },
  ];

  const aspectRatioOptions = [
    {
      value: "16:9",
      label: "16:9 (PowerPoint標準)",
      description: "1920 × 1080",
    },
    { value: "4:3", label: "4:3 (クラシック)", description: "1440 × 1080" },
    { value: "custom", label: "カスタム", description: "1600 × 900" },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            PowerPoint用エクスポート
          </DialogTitle>
          <DialogDescription>
            ガントチャートをPowerPoint対応形式でエクスポートします。クイックコピー機能を使用してプレゼンテーションに直接貼り付けることができます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Copy Option */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Copy className="w-4 h-4" />
                クリップボードにクイックコピー
                <Badge variant="secondary">推奨</Badge>
              </CardTitle>
              <CardDescription className="text-sm">
                PowerPointに直接貼り付けるためにクリップボードにコピー
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={copyToClipboard} className="w-full" size="lg">
                <Copy className="w-4 h-4 mr-2" />
                チャート画像をコピー
              </Button>
            </CardContent>
          </Card>

          {/* Clipboard Error Alert */}
          {clipboardError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                クリップボードアクセスがブロックされています。チャートはファイルとしてダウンロードされました。
                PowerPointにダウンロードされた画像を手動で挿入できます。
              </AlertDescription>
            </Alert>
          )}

          {/* Aspect Ratio */}
          <div>
            <Label>スライド形式</Label>
            <Select
              value={aspectRatio}
              onValueChange={(value: "16:9" | "4:3" | "custom") =>
                setAspectRatio(value)
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aspectRatioOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Format */}
          <div>
            <Label>エクスポート形式</Label>
            <div className="grid gap-2 mt-2">
              {formatOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-colors ${
                    format === option.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    setFormat(option.value as "png" | "svg" | "pdf")
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        <div>
                          <CardTitle className="text-sm">
                            {option.label}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {option.description}
                          </CardDescription>
                        </div>
                      </div>
                      {option.recommended && (
                        <Badge variant="secondary" className="text-xs">
                          最適
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {format === "png" && (
            <div>
              <Label>品質: {quality}%</Label>
              <Input
                type="range"
                min="70"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-2"
              />
            </div>
          )}

          <div>
            <Label htmlFor="backgroundColor">背景色</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="backgroundColor"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-12 h-8 p-1"
              />
              <Select
                value={backgroundColor}
                onValueChange={setBackgroundColor}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="#ffffff">白（デフォルト）</SelectItem>
                  <SelectItem value="#f8f9fa">ライトグレー</SelectItem>
                  <SelectItem value="#e9ecef">グレー</SelectItem>
                  <SelectItem value="transparent">透明</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeGrid"
              checked={includeGrid}
              onCheckedChange={(checked) => setIncludeGrid(checked as boolean)}
            />
            <Label htmlFor="includeGrid">グリッド線を含める</Label>
          </div>

          {exportSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                ✓ エクスポート成功！{" "}
                {clipboardError
                  ? "ファイルがダウンロードされました - PowerPointに手動で挿入してください。"
                  : "PowerPointに貼り付ける準備ができました。"}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                "エクスポート中..."
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1" />
                  ファイルエクスポート
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
