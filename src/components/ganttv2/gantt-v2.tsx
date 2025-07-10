"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { Milestone, WbsTask } from "@/types/wbs";
import { Project } from "@/types/project";
import GanttControls, { ViewMode, GroupBy } from "./gantt-controls";
import GanttTimeAxis from "./gantt-time-axis";
import GanttChart from "./gantt-chart";
import GanttTaskList from "./gantt-task-list";
import { getTaskStatusName } from "@/lib/utils";

interface GanttV2ComponentProps {
  tasks: WbsTask[];
  milestones: Milestone[];
  project: Project;
  wbsId: number;
  onTaskUpdate?: () => void;
}

interface TaskWithPosition extends WbsTask {
  startPosition: number;
  width: number;
  groupId?: string;
}

const VIEW_MODES = [
  { value: "day" as ViewMode, label: "日", days: 1 },
  { value: "week" as ViewMode, label: "週", days: 7 },
  { value: "month" as ViewMode, label: "月", days: 30 },
  { value: "quarter" as ViewMode, label: "四半期", days: 90 },
];

export default function GanttV2Component({
  tasks,
  milestones,
  project,
  wbsId,
  onTaskUpdate,
}: GanttV2ComponentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showMilestones, setShowMilestones] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  // スクロール同期用のref
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  // 日付範囲の計算（プロジェクト期間をベースに設定）
  const dateRange = useMemo(() => {
    // プロジェクトの開始日と終了日をベースに設定
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);

    // プロジェクト期間を少し拡張してバッファを追加
    const start = new Date(projectStart);
    start.setDate(start.getDate() - 7);
    const end = new Date(projectEnd);
    end.setDate(end.getDate() + 7);

    return { start, end };
  }, [project.startDate, project.endDate]);

  // フィルタリングされたタスク
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (
        assigneeFilter !== "all" &&
        task.assignee?.displayName !== assigneeFilter
      )
        return false;
      return true;
    });
  }, [tasks, statusFilter, assigneeFilter]);

  // 時間軸の生成とチャート幅の計算
  const { timeAxis, chartWidth } = useMemo(() => {
    const currentMode = VIEW_MODES.find((mode) => mode.value === viewMode)!;
    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // 横スクロールを可能にするために、各日の最小幅を設定
    const minDayWidth =
      viewMode === "day" ? 60 : viewMode === "week" ? 80 : 120;
    const calculatedChartWidth = Math.max(
      1200,
      (totalDays * minDayWidth) / currentMode.days
    );

    const intervals = Math.ceil(totalDays / currentMode.days);
    const intervalWidth = calculatedChartWidth / intervals;

    const axis = Array.from({ length: intervals }, (_, i) => {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i * currentMode.days);
      return {
        date,
        position: i * intervalWidth,
        width: intervalWidth,
      };
    });

    return { timeAxis: axis, chartWidth: calculatedChartWidth };
  }, [dateRange, viewMode]);

  // タスクの位置計算
  const tasksWithPosition = useMemo(() => {
    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return filteredTasks.map((task) => {
      const taskStart = task.yoteiStart || dateRange.start;
      const taskEnd = task.yoteiEnd || taskStart;

      const startDays = Math.max(
        0,
        Math.floor(
          (taskStart.getTime() - dateRange.start.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      const duration = Math.max(
        1,
        Math.ceil(
          (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      // チャート幅に基づいてピクセル位置を計算
      const startPosition = (startDays / totalDays) * chartWidth;
      const width = (duration / totalDays) * chartWidth;

      return {
        ...task,
        startPosition,
        width,
      } as TaskWithPosition;
    });
  }, [filteredTasks, dateRange, chartWidth]);

  // グループ化
  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [
        {
          id: "all",
          name: "すべてのタスク",
          tasks: tasksWithPosition,
          collapsed: false,
        },
      ];
    }

    const groupMap = new Map<string, TaskWithPosition[]>();

    tasksWithPosition.forEach((task) => {
      let groupKey: string;

      switch (groupBy) {
        case "phase":
          groupKey = task.phase?.id?.toString() || "unknown";
          break;
        case "assignee":
          groupKey = task.assignee?.id?.toString() || "unassigned";
          break;
        case "status":
          groupKey = task.status;
          break;
        default:
          groupKey = "all";
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(task);
    });

    return Array.from(groupMap.entries()).map(([id, tasks]) => ({
      id,
      name: tasks[0]
        ? groupBy === "phase"
          ? tasks[0].phase?.name || "未分類"
          : groupBy === "assignee"
          ? tasks[0].assignee?.displayName || "未割り当て"
          : groupBy === "status"
          ? getTaskStatusName(tasks[0].status)
          : "すべてのタスク"
        : "未分類",
      tasks,
      collapsed: collapsedGroups.has(id),
    }));
  }, [tasksWithPosition, groupBy, collapsedGroups]);

  // マイルストーンの位置計算
  const milestonesWithPosition = useMemo(() => {
    if (!showMilestones) return [];

    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return milestones.map((milestone) => {
      // タスクと同じ計算方法を使用
      const positionDays = Math.max(
        0,
        Math.floor(
          (milestone.date.getTime() - dateRange.start.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      
      // タスクと同じピクセル位置計算
      const position = (positionDays / totalDays) * chartWidth;
      
      return {
        ...milestone,
        position,
      };
    });
  }, [milestones, dateRange, showMilestones, chartWidth]);

  // スクロール同期関数
  const handleHeaderScroll = useCallback(() => {
    if (headerScrollRef.current && chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
    }
  }, []);

  const handleChartScroll = useCallback(() => {
    if (headerScrollRef.current && chartScrollRef.current) {
      headerScrollRef.current.scrollLeft = chartScrollRef.current.scrollLeft;
    }
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const toggleAllTasks = useCallback(() => {
    // 全タスクのIDを取得
    const allTaskIds = tasksWithPosition.map(task => task.id.toString());
    
    // 現在の折りたたみ状態をチェック
    const allCollapsed = allTaskIds.every(id => collapsedTasks.has(id));
    
    if (allCollapsed) {
      // 全て折りたたまれている場合 → 全て展開
      setCollapsedTasks(new Set());
    } else {
      // 一部または全て展開されている場合 → 全て折りたたむ
      setCollapsedTasks(new Set(allTaskIds));
    }
  }, [tasksWithPosition, collapsedTasks]);


  return (
    <div className="space-y-4">
      {/* コントロールパネル */}
      <GanttControls
        viewMode={viewMode}
        groupBy={groupBy}
        statusFilter={statusFilter}
        assigneeFilter={assigneeFilter}
        showMilestones={showMilestones}
        tasks={tasks}
        onViewModeChange={setViewMode}
        onGroupByChange={setGroupBy}
        onStatusFilterChange={setStatusFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        onShowMilestonesChange={setShowMilestones}
      />

      {/* ガントチャート */}
      <div className="flex">
        {/* タスクリスト */}
        <GanttTaskList
          groups={groups}
          groupBy={groupBy}
          onToggleGroup={toggleGroup}
          collapsedTasks={collapsedTasks}
          onToggleTask={(taskId: string) => {
            setCollapsedTasks((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(taskId)) {
                newSet.delete(taskId);
              } else {
                newSet.add(taskId);
              }
              return newSet;
            });
          }}
          onToggleAllTasks={toggleAllTasks}
        />

        {/* チャート領域 */}
        <div className="flex-1 relative min-w-0">
          {/* 時間軸ヘッダー */}
          <GanttTimeAxis
            timeAxis={timeAxis}
            chartWidth={chartWidth}
            viewMode={viewMode}
            headerScrollRef={headerScrollRef}
            onScroll={handleHeaderScroll}
          />

          {/* チャート本体 */}
          <GanttChart
            timeAxis={timeAxis}
            chartWidth={chartWidth}
            groups={groups}
            groupBy={groupBy}
            milestonesWithPosition={milestonesWithPosition}
            chartScrollRef={chartScrollRef}
            onScroll={handleChartScroll}
            wbsId={wbsId}
            onTaskUpdate={onTaskUpdate}
            collapsedTasks={collapsedTasks}
          />
        </div>
      </div>
    </div>
  );
}
