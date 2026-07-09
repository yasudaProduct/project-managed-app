import React from "react";
import {
  TimelineScale,
  GanttStyle,
  GanttColorMode,
  GroupBy,
  TaskSortBy,
} from "./gantt";
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
  Download,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  Palette,
  Blend,
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
  /** グループ内のタスクの並び順 */
  sortBy?: TaskSortBy;
  onSortByChange?: (sortBy: TaskSortBy) => void;
  /** タスク一覧をTSVで出力。未指定なら出力ボタンは表示しない */
  onExportTsv?: () => void;
  /** タスク追加を無効化する（編集モードでない、または保存中・データ読込中） */
  addDisabled?: boolean;
  /** タスク複製を無効化する（編集モード中はドラフト整合性のため抑止） */
  duplicateDisabled?: boolean;
  /** タスク削除を無効化する（保存処理中） */
  deleteDisabled?: boolean;
}

/** アイコンのみのシンプルなアクションボタン。ツールチップでボタン名を表示する。 */
function IconActionButton({
  label,
  onClick,
  disabled = false,
  active = false,
  variant = "outline",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: "outline" | "destructive";
  children: React.ReactNode;
}) {
  // disabled な <button> は hover/focus イベントが発火せず Radix Tooltip が開けないため、
  // 常にラップ用の <span> を Tooltip のトリガーにする（span は disabled でもイベントを受け取れる）
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={disabled ? 0 : -1}>
          <Button
            variant={active ? "default" : variant}
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className="h-8 w-8 p-0"
            aria-label={label}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
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
 *  操作ボタンはアイコンのみで表示し、ツールチップでボタン名を表示する。
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
  sortBy = "taskNo",
  onSortByChange,
  onExportTsv,
  addDisabled = false,
  duplicateDisabled = false,
  deleteDisabled = false,
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

  const setColorMode = (colorMode: GanttColorMode) =>
    onStyleChange({ ...style, colorMode });

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* タスク操作 */}
        <div className="flex items-center gap-1">
          <IconActionButton
            label="タスク追加"
            onClick={onAddTask}
            disabled={addDisabled}
          >
            <Plus className="w-4 h-4" />
          </IconActionButton>

          {selectedTasks.size > 0 && (
            <>
              <IconActionButton
                label={`複製（${selectedTasks.size}件）`}
                onClick={onDuplicateTasks}
                disabled={duplicateDisabled}
              >
                <Copy className="w-4 h-4" />
              </IconActionButton>
              <IconActionButton
                label={`削除（${selectedTasks.size}件）`}
                onClick={onDeleteTasks}
                disabled={deleteDisabled}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4" />
              </IconActionButton>
            </>
          )}
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
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <span>グループなし</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="phase">
                    <div className="flex items-center gap-2">
                      <span>フェーズ</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="assignee">
                    <div className="flex items-center gap-2">
                      <span>担当者</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="status">
                    <div className="flex items-center gap-2">
                      <span>ステータス</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        {/* 並び順 */}
        {onSortByChange && (
          <>
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(value: TaskSortBy) => {
                  onSortByChange(value);
                }}
              >
                <SelectTrigger className="w-40">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taskNo">タスクNo順</SelectItem>
                  <SelectItem value="startDate">開始予定日順</SelectItem>
                  <SelectItem value="assignee">担当者順</SelectItem>
                  <SelectItem value="status">ステータス順</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

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

        {/* 色分け方式 */}
        <div className="flex items-center gap-1 pl-2">
          <IconActionButton
            label="フェーズで色分け"
            onClick={() => setColorMode("phase")}
            active={style.colorMode === "phase"}
          >
            <Palette className="w-4 h-4" />
          </IconActionButton>
          <IconActionButton
            label="予定・実績・見通しで色分け"
            onClick={() => setColorMode("planActualForecast")}
            active={style.colorMode === "planActualForecast"}
          >
            <Blend className="w-4 h-4" />
          </IconActionButton>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 表示オプション */}
        <div className="flex items-center gap-1 pl-2">
          <IconActionButton
            label="グリッド表示"
            active={style.showGrid}
            onClick={() =>
              onStyleChange({
                ...style,
                showGrid: !style.showGrid,
              })
            }
          >
            <Grid3X3 className="w-4 h-4" />
          </IconActionButton>

          <IconActionButton
            label="依存関係表示"
            active={style.showDependencies}
            onClick={() =>
              onStyleChange({
                ...style,
                showDependencies: !style.showDependencies,
              })
            }
          >
            <GitBranch className="w-4 h-4" />
          </IconActionButton>

          <IconActionButton
            label="クリティカルパス表示"
            active={style.showCriticalPath}
            onClick={() =>
              onStyleChange({
                ...style,
                showCriticalPath: !style.showCriticalPath,
              })
            }
          >
            <Target className="w-4 h-4" />
          </IconActionButton>

          <IconActionButton
            label="本日ライン表示"
            active={style.showTodayLine}
            onClick={() =>
              onStyleChange({
                ...style,
                showTodayLine: !style.showTodayLine,
              })
            }
          >
            <Calendar className="w-4 h-4" />
          </IconActionButton>

          <IconActionButton
            label="実績バー表示（予定の下段に実績を表示）"
            active={style.showActual}
            onClick={() =>
              onStyleChange({
                ...style,
                showActual: !style.showActual,
              })
            }
          >
            <BarChart3 className="w-4 h-4" />
          </IconActionButton>

          <IconActionButton
            label="見通しバー表示（実績の下段に見通しを表示）"
            active={style.showForecast}
            onClick={() =>
              onStyleChange({
                ...style,
                showForecast: !style.showForecast,
              })
            }
          >
            <TrendingUp className="w-4 h-4" />
          </IconActionButton>
        </div>

        {/* 出力 */}
        {onExportTsv && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <IconActionButton label="タスク一覧をTSVで出力" onClick={onExportTsv}>
              <Download className="w-4 h-4" />
            </IconActionButton>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};
