"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { Milestone, WbsTask } from "@/types/wbs";
import { Project } from "@/types/project";
import GanttControls, { ViewMode, GroupBy } from "./gantt-controls";
import GanttTimeAxis from "./gantt-time-axis";
import GanttChart from "./gantt-chart";
import GanttTaskList from "./gantt-task-list";
import {
  calculateDateRange,
  filterTasks,
  generateTimeAxis,
  calculateTaskPositions,
  groupTasks,
  calculateMilestonePositions,
} from "./gantt-utils";

interface GanttV2ComponentProps {
  tasks: WbsTask[];
  milestones: Milestone[];
  project: Project;
  wbsId: number;
  onTaskUpdate?: () => void;
}

export default function GanttV2Component({
  tasks,
  milestones,
  project,
  wbsId,
  onTaskUpdate,
}: GanttV2ComponentProps) {
  // フィルタリング
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // マイルストーン
  const [showMilestones, setShowMilestones] = useState(true);

  // 折りたたみ
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  // スクロール同期用のref
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  // 日付範囲の計算
  console.log("project", project);
  console.log(
    "tasks",
    tasks.map((task) => ({
      startDate: task.yoteiStart,
      endDate: task.yoteiEnd,
    }))
  );
  const dateRange = useMemo(
    () =>
      calculateDateRange(
        project,
        tasks.map((task) => ({
          startDate: task.yoteiStart,
          endDate: task.yoteiEnd,
        }))
      ),
    [project.startDate, project.endDate]
  );

  // フィルタリングされたタスク
  const filteredTasks = useMemo(
    () => filterTasks(tasks, statusFilter, assigneeFilter),
    [tasks, statusFilter, assigneeFilter]
  );

  // 時間軸の生成とチャート幅の計算
  const { timeAxis, chartWidth } = useMemo(
    () => generateTimeAxis(dateRange, viewMode),
    [dateRange, viewMode]
  );

  // タスクの位置計算
  const tasksWithPosition = useMemo(
    () => calculateTaskPositions(filteredTasks, dateRange, chartWidth),
    [filteredTasks, dateRange, chartWidth]
  );

  // グループ化
  const groups = useMemo(
    () => groupTasks(tasksWithPosition, groupBy, collapsedGroups),
    [tasksWithPosition, groupBy, collapsedGroups]
  );

  // マイルストーンの位置計算
  const milestonesWithPosition = useMemo(
    () =>
      showMilestones
        ? calculateMilestonePositions(milestones, dateRange, chartWidth)
        : [],
    [milestones, dateRange, showMilestones, chartWidth]
  );

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
    const allTaskIds = tasksWithPosition.map((task) => task.id.toString());

    // 現在の折りたたみ状態をチェック
    const allCollapsed = allTaskIds.every((id) => collapsedTasks.has(id));

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
        <div data-testid="gantt-task-list">
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
            wbsId={wbsId}
            onTaskUpdate={onTaskUpdate}
          />
        </div>

        {/* チャート領域 */}
        <div className="flex-1 relative min-w-0" data-testid="gantt-chart-area">
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
