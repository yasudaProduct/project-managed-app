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
import {
  Plus,
  Trash2,
  Copy,
  Grid3X3,
  GitBranch,
  Target,
  Calendar,
} from "lucide-react";

interface QuickActionsProps {
  timelineScale: TimelineScale;
  onTimelineScaleChange: (scale: TimelineScale) => void;
  style: GanttStyle;
  onStyleChange: (style: GanttStyle) => void;
  selectedTasks: Set<string>;
  onAddTask: () => void;
  onDeleteTasks: () => void;
  onDuplicateTasks: () => void;
}

/**
 * クイックアクションバー
 * @param timelineScale タイムラインスケール
 * @param onTimelineScaleChange タイムラインスケール変更
 * @param style ガントチャートスタイル
 * @param onStyleChange ガントチャートスタイル変更
 * @param selectedTasks 選択されたタスク
 * @param onAddTask タスク追加
 * @param onDeleteTasks タスク削除
 * @param onDuplicateTasks タスク複製
 * @description
 *  クイックアクションバーは、ガントチャートの上部に配置されるバーです。
 *  タスクの追加、削除、複製、タイムラインスケールの変更、ガントチャートスタイルの変更を行うことができます。
 *  また、タスクの選択状態を表示することができます。
 */
export const QuickActions = ({
  timelineScale,
  onTimelineScaleChange,
  style,
  onStyleChange,
  selectedTasks,
  onAddTask,
  onDeleteTasks,
  onDuplicateTasks,
}: QuickActionsProps) => {
  return (
    <div className="flex items-center gap-3">
      {/* タスク操作 */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          onClick={onAddTask}
          className="gap-2"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          タスク追加
        </Button>

        {selectedTasks.size > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onDuplicateTasks}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              複製 ({selectedTasks.size})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteTasks}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              削除 ({selectedTasks.size})
            </Button>
          </>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* タイムラインスケール */}
      <div className="flex items-center gap-2 pl-2">
        {/* <span className="text-sm font-medium">スケール:</span> */}
        <Select
          value={timelineScale}
          onValueChange={(value: TimelineScale) => {
            onTimelineScaleChange(value);
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">日</SelectItem>
            <SelectItem value="week">週</SelectItem>
            <SelectItem value="month">月</SelectItem>
            <SelectItem value="quarter">四半期</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 表示オプション */}
      <div className="flex items-center gap-1 pl-2">
        <Button
          variant={style.showGrid ? "default" : "outline"}
          size="sm"
          title="グリッド表示"
          onClick={() =>
            onStyleChange({
              ...style,
              showGrid: !style.showGrid,
            })
          }
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>

        <Button
          variant={style.showDependencies ? "default" : "outline"}
          size="sm"
          title="依存関係表示"
          onClick={() =>
            onStyleChange({
              ...style,
              showDependencies: !style.showDependencies,
            })
          }
        >
          <GitBranch className="w-4 h-4" />
        </Button>

        <Button
          variant={style.showCriticalPath ? "default" : "outline"}
          size="sm"
          title="クリティカルパス表示"
          onClick={() =>
            onStyleChange({
              ...style,
              showCriticalPath: !style.showCriticalPath,
            })
          }
        >
          <Target className="w-4 h-4" />
        </Button>

        <Button
          variant={style.showTodayLine ? "default" : "outline"}
          size="sm"
          title="本日ライン表示"
          onClick={() =>
            onStyleChange({
              ...style,
              showTodayLine: !style.showTodayLine,
            })
          }
        >
          <Calendar className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
