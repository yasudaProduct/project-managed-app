import React from "react";
import { TimelineScale, GanttStyle, GroupBy, ColorMode } from "./gantt";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Plus,
  Trash2,
  Copy,
  Grid3X3,
  GitBranch,
  Target,
  Calendar,
  Users,
  Layers,
  Activity,
  List,
  Palette,
  Pencil,
  Save,
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
  groupBy?: GroupBy;
  onGroupByChange?: (groupBy: GroupBy) => void;
  colorMode: ColorMode;
  onColorModeChange: (colorMode: ColorMode) => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

/**
 * アイコンのみのボタン + ツールチップ
 */
const IconButton = ({
  label,
  icon,
  onClick,
  active,
  variant,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  variant?: "outline" | "default" | "destructive";
  disabled?: boolean;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        variant={variant ?? (active ? "default" : "outline")}
        onClick={onClick}
        disabled={disabled}
        className="h-8 w-8"
      >
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

/**
 * クイックアクションバー
 *
 * 上部のアクションボタンはアイコンのみのシンプルなボタンとし、
 * ツールチップでボタン名を表示する。
 * タスクの追加・削除は編集モードでのみ実行可能。
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
  groupBy = "none",
  onGroupByChange,
  colorMode,
  onColorModeChange,
  isEditMode,
  onToggleEditMode,
  onSave,
  isSaving,
  hasUnsavedChanges,
}: QuickActionsProps) => {
  const getGroupIcon = (group: GroupBy) => {
    switch (group) {
      case "phase":
        return <Layers className="w-4 h-4" />;
      case "assignee":
        return <Users className="w-4 h-4" />;
      case "status":
        return <Activity className="w-4 h-4" />;
      default:
        return <List className="w-4 h-4" />;
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-3">
        {/* 編集モード操作 */}
        <div className="flex items-center gap-1">
          <IconButton
            label={isEditMode ? "編集モードを終了" : "編集モード"}
            icon={<Pencil className="w-4 h-4" />}
            onClick={onToggleEditMode}
            active={isEditMode}
          />

          {isEditMode && (
            <>
              <IconButton
                label="タスク追加"
                icon={<Plus className="w-4 h-4" />}
                onClick={onAddTask}
              />
              <IconButton
                label={isSaving ? "保存中..." : "保存"}
                icon={<Save className="w-4 h-4" />}
                onClick={onSave}
                variant="default"
                disabled={isSaving || !hasUnsavedChanges}
              />
            </>
          )}

          {selectedTasks.size > 0 && (
            <>
              <IconButton
                label={`複製 (${selectedTasks.size})`}
                icon={<Copy className="w-4 h-4" />}
                onClick={onDuplicateTasks}
              />
              <IconButton
                label={`削除 (${selectedTasks.size})`}
                icon={<Trash2 className="w-4 h-4" />}
                onClick={onDeleteTasks}
                variant="destructive"
              />
            </>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 色分けモード */}
        <div className="flex items-center gap-2">
          <Select
            value={colorMode}
            onValueChange={(value: ColorMode) => onColorModeChange(value)}
          >
            <SelectTrigger className="w-44">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phase">フェーズで色分け</SelectItem>
              <SelectItem value="planActual">予定/実績/見通しで色分け</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* グループ表示 */}
        {onGroupByChange && (
          <>
            <div className="flex items-center gap-2">
              <Select
                value={groupBy}
                onValueChange={(value: GroupBy) => {
                  onGroupByChange(value);
                }}
              >
                <SelectTrigger className="w-36">
                  <div className="flex items-center gap-2">
                    {getGroupIcon(groupBy)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">グループなし</SelectItem>
                  <SelectItem value="phase">フェーズ</SelectItem>
                  <SelectItem value="assignee">担当者</SelectItem>
                  <SelectItem value="status">ステータス</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        {/* タイムラインスケール */}
        <div className="flex items-center gap-2">
          <Select
            value={timelineScale}
            onValueChange={(value: TimelineScale) => {
              onTimelineScaleChange(value);
            }}
          >
            <SelectTrigger className="w-24">
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
        <div className="flex items-center gap-1">
          <IconButton
            label="グリッド表示"
            icon={<Grid3X3 className="w-4 h-4" />}
            active={style.showGrid}
            onClick={() => onStyleChange({ ...style, showGrid: !style.showGrid })}
          />
          <IconButton
            label="依存関係表示"
            icon={<GitBranch className="w-4 h-4" />}
            active={style.showDependencies}
            onClick={() =>
              onStyleChange({
                ...style,
                showDependencies: !style.showDependencies,
              })
            }
          />
          <IconButton
            label="クリティカルパス表示"
            icon={<Target className="w-4 h-4" />}
            active={style.showCriticalPath}
            onClick={() =>
              onStyleChange({
                ...style,
                showCriticalPath: !style.showCriticalPath,
              })
            }
          />
          <IconButton
            label="本日ライン表示"
            icon={<Calendar className="w-4 h-4" />}
            active={style.showTodayLine}
            onClick={() =>
              onStyleChange({ ...style, showTodayLine: !style.showTodayLine })
            }
          />
        </div>
      </div>
    </TooltipProvider>
  );
};
