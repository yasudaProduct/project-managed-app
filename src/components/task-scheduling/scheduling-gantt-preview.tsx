"use client";

import { useState } from "react";
import { GanttChart } from "@/components/ganttv3/GanttChart";
import type {
  Task as GanttTask,
  GanttPhase,
  GanttStyle,
  TimelineScale,
} from "@/components/ganttv3/gantt";
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
}

/**
 * スケジューリング結果を ganttv3 の GanttChart で読み取り専用表示するラッパ。
 * editMode=false 固定なので DB への書き戻しは構造的に発生しない。
 */
export function SchedulingGanttPreview({
  tasks,
  categories,
}: SchedulingGanttPreviewProps) {
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("week");
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.name))
  );

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
          onTaskUpdate={() => {}}
          onCategoryToggle={handleCategoryToggle}
          onZoomChange={setZoomLevel}
          editMode={false}
        />
      </div>
    </div>
  );
}
