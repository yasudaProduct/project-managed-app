"use client";

import { useEffect, useState } from "react";
import { GanttChart } from "@/components/ganttv3/gantt-chart";
import type {
  Task as GanttTask,
  GanttPhase,
  GanttStyle,
  TimelineScale,
} from "@/components/ganttv3/gantt";
import type { AssigneeOption } from "@/components/ganttv3/inline-task-edit-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 読み取り専用プレビュー用のスタイル（GanttV3Client の defaultGanttStyle を踏襲）
const previewStyle: GanttStyle = {
  theme: "modern",
  showGrid: true,
  showProgress: false,
  showActual: false,
  showForecast: false,
  colorMode: "phase",
  showDependencies: true,
  showCriticalPath: false,
  showWeekends: true,
  showTodayLine: true,
  taskHeight: 16,
  rowSpacing: 4,
  labelPosition: "inside",
  colors: {
    primary: "#3B82F6",
    secondary: "#6B7280",
    accent: "#10B981",
    milestone: "#EF4444",
    criticalPath: "#DC2626",
    weekend: "#F3F4F6",
    today: "#F59E0B",
  },
};

interface SchedulingGanttPreviewProps {
  tasks: GanttTask[];
  categories: GanttPhase[];
  /** 手動調整モード（trueでバーのドラッグ・インライン編集が有効） */
  editMode?: boolean;
  /** インライン編集パネルの担当者プルダウン選択肢 */
  assignees?: AssigneeOption[];
  /** 編集内容の通知（親が画面上の状態として保持する。DBには書き込まない） */
  onTaskUpdate?: (task: GanttTask) => void;
  /** 調整モードに入る（未指定なら調整UIは表示されず読み取り専用） */
  onEnterEditMode?: () => void;
  /** 調整を確定して調整モードを抜ける */
  onSaveEdit?: () => void;
  /** 調整を破棄して調整モードを抜ける */
  onCancelEdit?: () => void;
}

/**
 * スケジューリング結果を ganttv3 の GanttChart で表示するラッパ。
 * 既定は読み取り専用。編集系props（onEnterEditMode等）を渡すと手動調整モードが
 * 有効になるが、編集は onTaskUpdate で親のクライアント状態に反映されるだけで、
 * DB への書き戻しは構造的に発生しない。
 */
export function SchedulingGanttPreview({
  tasks,
  categories,
  editMode = false,
  assignees = [],
  onTaskUpdate,
  onEnterEditMode,
  onSaveEdit,
  onCancelEdit,
}: SchedulingGanttPreviewProps) {
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("week");
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.name))
  );

  // 再計算などで親から渡るフェーズ（categories）の集合が変わったら全展開に同期する。
  // 初期化(useState)は初回しか走らないため、これがないと新フェーズが折りたたまれた
  // ままになりタスク行が表示されない。
  const categoryKey = categories
    .map((c) => c.name)
    .sort()
    .join("\u001f");
  useEffect(() => {
    setExpandedCategories(new Set(categories.map((c) => c.name)));
    // categoryKey が変わったときのみ実質再計算されるため categories は依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey]);

  const handleCategoryToggle = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        表示できるスケジュール結果がありません（担当者・予定工数の未設定や循環依存のタスクは除外されます）。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">表示単位</span>
        <Select
          value={timelineScale}
          onValueChange={(v) => setTimelineScale(v as TimelineScale)}
        >
          <SelectTrigger className="w-32">
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
      <div className="overflow-x-auto border rounded-lg">
        <GanttChart
          tasks={tasks}
          categories={categories}
          timelineScale={timelineScale}
          style={previewStyle}
          expandedCategories={expandedCategories}
          zoomLevel={zoomLevel}
          groupBy="phase"
          sortBy="startDate"
          assignees={assignees}
          onTaskUpdate={onTaskUpdate ?? (() => {})}
          onCategoryToggle={handleCategoryToggle}
          onZoomChange={setZoomLevel}
          editMode={editMode}
          onEnterEditMode={onEnterEditMode}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        />
      </div>
    </div>
  );
}
