import { useState } from "react";
import { GanttStyle } from "./gantt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Grid, BarChart } from "lucide-react";

interface StyleCustomizerProps {
  style: GanttStyle;
  onStyleChange: (style: GanttStyle) => void;
  onClose: () => void;
}

export const StyleCustomizer = ({
  style,
  onStyleChange,
  onClose,
}: StyleCustomizerProps) => {
  const [currentStyle, setCurrentStyle] = useState(style);

  const handleApply = () => {
    onStyleChange(currentStyle);
    onClose();
  };

  const themes = [
    {
      name: "modern",
      label: "モダン",
      description: "クリーンで現代的なデザイン",
      colors: {
        primary: "#3B82F6",
        secondary: "#10B981",
        accent: "#F59E0B",
        milestone: "#EF4444",
        criticalPath: "#DC2626",
        weekend: "#F3F4F6",
        today: "#FEF3C7",
      },
    },
    {
      name: "classic",
      label: "クラシック",
      description: "伝統的なビジネススタイル",
      colors: {
        primary: "#1F2937",
        secondary: "#374151",
        accent: "#6B7280",
        milestone: "#DC2626",
        criticalPath: "#B91C1C",
        weekend: "#F9FAFB",
        today: "#FEF3C7",
      },
    },
    {
      name: "minimal",
      label: "ミニマル",
      description: "シンプルでクリーンなデザイン",
      colors: {
        primary: "#6B7280",
        secondary: "#9CA3AF",
        accent: "#D1D5DB",
        milestone: "#F87171",
        criticalPath: "#EF4444",
        weekend: "#F9FAFB",
        today: "#FEF3C7",
      },
    },
  ];

  const colorOptions = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6B7280",
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>外観のカスタマイズ</DialogTitle>
          <DialogDescription>
            ガントチャートの視覚的な外観をカスタマイズします。事前定義されたテーマから選択するか、
            色やレイアウトオプションをカスタマイズしてプレゼンテーションスタイルに合わせることができます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <Label className="text-base font-medium">テーマ</Label>
            <div className="grid gap-2 mt-2">
              {themes.map((theme) => (
                <Card
                  key={theme.name}
                  className={`cursor-pointer transition-colors ${
                    currentStyle.theme === theme.name
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    setCurrentStyle({
                      ...currentStyle,
                      theme: theme.name as GanttStyle["theme"],
                      colors: theme.colors,
                    })
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{theme.label}</CardTitle>
                        <CardDescription className="text-xs">
                          {theme.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        {Object.values(theme.colors).map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Color Customization */}
          <div>
            <Label className="text-base font-medium">色</Label>
            <div className="space-y-3 mt-2">
              {Object.entries(currentStyle.colors).map(([key, color]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="capitalize">{key}</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex gap-1">
                      {colorOptions.map((optionColor) => (
                        <button
                          key={optionColor}
                          className={`w-5 h-5 rounded border ${
                            color === optionColor ? "ring-2 ring-primary" : ""
                          }`}
                          style={{ backgroundColor: optionColor }}
                          onClick={() =>
                            setCurrentStyle({
                              ...currentStyle,
                              colors: {
                                ...currentStyle.colors,
                                [key]: optionColor,
                              },
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Layout Options */}
          <div>
            <Label className="text-base font-medium">レイアウト</Label>
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4" />
                  <Label>グリッドを表示</Label>
                </div>
                <Switch
                  checked={currentStyle.showGrid}
                  onCheckedChange={(checked) =>
                    setCurrentStyle({
                      ...currentStyle,
                      showGrid: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart className="w-4 h-4" />
                  <Label>進捗を表示</Label>
                </div>
                <Switch
                  checked={currentStyle.showProgress}
                  onCheckedChange={(checked) =>
                    setCurrentStyle({
                      ...currentStyle,
                      showProgress: checked,
                    })
                  }
                />
              </div>

              <div>
                <Label>タスクの高さ: {currentStyle.taskHeight}px</Label>
                <Slider
                  value={[currentStyle.taskHeight]}
                  onValueChange={(value) =>
                    setCurrentStyle({
                      ...currentStyle,
                      taskHeight: value[0],
                    })
                  }
                  min={20}
                  max={60}
                  step={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>行の間隔: {currentStyle.rowSpacing}px</Label>
                <Slider
                  value={[currentStyle.rowSpacing]}
                  onValueChange={(value) =>
                    setCurrentStyle({
                      ...currentStyle,
                      rowSpacing: value[0],
                    })
                  }
                  min={4}
                  max={20}
                  step={2}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <Label className="text-base font-medium">プレビュー</Label>
            <Card className="mt-2 p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: currentStyle.colors.primary }}
                  />
                  <div
                    className="flex-1 h-6 rounded"
                    style={{
                      backgroundColor: `${currentStyle.colors.primary}20`,
                      border: `1px solid ${currentStyle.colors.primary}40`,
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: currentStyle.colors.secondary }}
                  />
                  <div
                    className="flex-1 h-6 rounded"
                    style={{
                      backgroundColor: `${currentStyle.colors.secondary}20`,
                      border: `1px solid ${currentStyle.colors.secondary}40`,
                    }}
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleApply}>変更を適用</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
