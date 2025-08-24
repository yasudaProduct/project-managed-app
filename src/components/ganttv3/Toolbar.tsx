import React from "react";
import { TimelineScale, GanttStyle } from "./gantt";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
// import { Badge } from "../ui/badge";
import {
  Download,
  Upload,
  Settings,
  // ZoomIn,
  // ZoomOut,
  Grid,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Target,
} from "lucide-react";

interface ToolbarProps {
  timelineScale: TimelineScale;
  onTimelineScaleChange: (scale: TimelineScale) => void;
  onExport: () => void;
  onImport: () => void;
  onCustomize: () => void;
  style: GanttStyle;
  onStyleChange: (style: GanttStyle) => void;
}

export const Toolbar = ({
  timelineScale,
  onTimelineScaleChange,
  onExport,
  onImport,
  onCustomize,
  style,
  onStyleChange,
}: ToolbarProps) => {
  const scaleOptions = [
    { value: "day", label: "日表示", icon: Clock },
    { value: "week", label: "週表示", icon: Calendar },
    { value: "month", label: "月表示", icon: Calendar },
    { value: "quarter", label: "四半期表示", icon: Target },
  ];

  const toggleGridLines = () => {
    onStyleChange({
      ...style,
      showGrid: !style.showGrid,
    });
  };

  const toggleDependencies = () => {
    onStyleChange({
      ...style,
      showDependencies: !style.showDependencies,
    });
  };

  const toggleCriticalPath = () => {
    onStyleChange({
      ...style,
      showCriticalPath: !style.showCriticalPath,
    });
  };

  const toggleTodayLine = () => {
    onStyleChange({
      ...style,
      showTodayLine: !style.showTodayLine,
    });
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
      {/* Timeline Scale */}
      <div className="flex items-center gap-2">
        <Select
          value={timelineScale}
          onValueChange={(value: TimelineScale) => onTimelineScaleChange(value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {scaleOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4" />
                    {option.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* View Options */}
      <div className="flex items-center gap-1">
        <Button
          variant={style.showGrid ? "default" : "outline"}
          size="sm"
          onClick={toggleGridLines}
          className="gap-1"
        >
          <Grid className="w-4 h-4" />
          グリッド
        </Button>

        <Button
          variant={style.showDependencies ? "default" : "outline"}
          size="sm"
          onClick={toggleDependencies}
          className="gap-1"
        >
          {style.showDependencies ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
          依存関係
        </Button>

        <Button
          variant={style.showCriticalPath ? "default" : "outline"}
          size="sm"
          onClick={toggleCriticalPath}
          className="gap-1"
        >
          <Target className="w-4 h-4" />
          クリティカルパス
        </Button>

        <Button
          variant={style.showTodayLine ? "default" : "outline"}
          size="sm"
          onClick={toggleTodayLine}
          className="gap-1"
        >
          <Calendar className="w-4 h-4" />
          今日
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Import/Export */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className="gap-1"
        >
          <Upload className="w-4 h-4" />
          インポート
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="gap-1"
        >
          <Download className="w-4 h-4" />
          エクスポート
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Customize */}
      <Button
        variant="outline"
        size="sm"
        onClick={onCustomize}
        className="gap-1"
      >
        <Settings className="w-4 h-4" />
        カスタマイズ
      </Button>
    </div>
  );
};
