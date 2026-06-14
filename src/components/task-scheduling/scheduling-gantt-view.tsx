"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { GanttChart } from "@/components/ganttv3/GanttChart";
import {
  Task,
  GanttPhase,
  GanttStyle,
  TimelineScale,
  GroupBy,
  TaskSortBy,
} from "@/components/ganttv3/gantt";
import { groupTasksByType } from "@/components/ganttv3/utils/groupTasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 読み取り専用表示用のスタイル（クリティカルパスは本計算と食い違うため非表示）
const readonlyGanttStyle: GanttStyle = {
  theme: "modern",
  showGrid: true,
  showProgress: false,
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

interface SchedulingGanttViewProps {
  tasks: Task[];
  categories: GanttPhase[];
}

/**
 * 自動算出したスケジュールを ganttv3 のチャートで読み取り専用表示する。
 * 編集・DB保存はせず、グルーピング/並び順/スケールのみ切り替え可能。
 */
export function SchedulingGanttView({
  tasks,
  categories,
}: SchedulingGanttViewProps) {
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("month");
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");
  const [sortBy, setSortBy] = useState<TaskSortBy>("taskNo");
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // 現在のグルーピングにおける実グループ名（GanttChart と同一ロジック）
  const groupNames = useMemo(
    () => groupTasksByType(tasks, groupBy, categories).map((g) => g.name),
    [tasks, groupBy, categories],
  );
  const groupNamesKey = useMemo(
    () => [...groupNames].sort().join("\n"),
    [groupNames],
  );

  // グルーピング変更やデータ更新でグループ集合が変わったら全展開
  useEffect(() => {
    setExpandedCategories(new Set(groupNames));
    // groupNames は groupNamesKey が変わった時のみ実質変化する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupNamesKey]);

  const handleCategoryToggle = useCallback((categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  }, []);

  const noop = useCallback(() => {}, []);

  return (
    <div className="flex flex-col h-full">
      {/* 表示オプション（グルーピング/並び順/スケール） */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card flex-shrink-0">
        <Select
          value={groupBy}
          onValueChange={(v: GroupBy) => setGroupBy(v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">グループなし</SelectItem>
            <SelectItem value="phase">フェーズ</SelectItem>
            <SelectItem value="assignee">担当者</SelectItem>
            <SelectItem value="status">ステータス</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v: TaskSortBy) => setSortBy(v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="taskNo">タスクNo順</SelectItem>
            <SelectItem value="startDate">開始予定日順</SelectItem>
            <SelectItem value="assignee">担当者順</SelectItem>
            <SelectItem value="status">ステータス順</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={timelineScale}
          onValueChange={(v: TimelineScale) => setTimelineScale(v)}
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

      {/* ガントチャート本体（読み取り専用） */}
      <div className="flex-1 min-h-0">
        <GanttChart
          tasks={tasks}
          categories={categories}
          timelineScale={timelineScale}
          style={readonlyGanttStyle}
          expandedCategories={expandedCategories}
          zoomLevel={zoomLevel}
          groupBy={groupBy}
          sortBy={sortBy}
          assignees={[]}
          onTaskUpdate={noop}
          onCategoryToggle={handleCategoryToggle}
          onZoomChange={setZoomLevel}
          editMode={false}
        />
      </div>
    </div>
  );
}
