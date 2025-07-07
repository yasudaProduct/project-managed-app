"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Milestone, TaskStatus, Wbs, WbsTask } from "@/types/wbs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { formatDateyyyymmdd, getTaskStatusName } from "@/lib/utils";
import {
  Calendar,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Target,
  User,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GanttV2ComponentProps {
  tasks: WbsTask[];
  milestones: Milestone[];
  wbs: Wbs;
}

type ViewMode = "day" | "week" | "month" | "quarter";
type GroupBy = "phase" | "assignee" | "status" | "none";

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

const GROUP_OPTIONS = [
  { value: "none" as GroupBy, label: "グループなし" },
  { value: "phase" as GroupBy, label: "工程別" },
  { value: "assignee" as GroupBy, label: "担当者別" },
  { value: "status" as GroupBy, label: "ステータス別" },
];

export default function GanttV2Component({
  tasks,
  milestones,
}: GanttV2ComponentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showMilestones, setShowMilestones] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  // 日付範囲の計算
  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 3, 0),
      };
    }

    const allDates = tasks
      .flatMap((task) => [task.yoteiStart, task.yoteiEnd])
      .filter((date): date is Date => date !== null && date !== undefined);

    if (allDates.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 3, 0),
      };
    }

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // 範囲を少し拡張
    const start = new Date(minDate);
    start.setDate(start.getDate() - 7);
    const end = new Date(maxDate);
    end.setDate(end.getDate() + 7);

    return { start, end };
  }, [tasks]);

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

  // タスクの位置計算
  const tasksWithPosition = useMemo(() => {
    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const dayWidth = 100 / totalDays;

    return filteredTasks.map((task) => {
      const taskStart = task.yoteiStart || dateRange.start;
      const taskEnd = task.yoteiEnd || taskStart;

      const startDays = Math.max(
        0,
        Math.ceil(
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

      return {
        ...task,
        startPosition: startDays * dayWidth,
        width: duration * dayWidth,
      } as TaskWithPosition;
    });
  }, [filteredTasks, dateRange]);

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

  // 時間軸の生成
  const timeAxis = useMemo(() => {
    const currentMode = VIEW_MODES.find((mode) => mode.value === viewMode)!;
    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const intervals = Math.ceil(totalDays / currentMode.days);

    return Array.from({ length: intervals }, (_, i) => {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i * currentMode.days);
      return {
        date,
        position: (i * currentMode.days * 100) / totalDays,
        width: (currentMode.days * 100) / totalDays,
      };
    });
  }, [dateRange, viewMode]);

  // マイルストーンの位置計算
  const milestonesWithPosition = useMemo(() => {
    if (!showMilestones) return [];

    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return milestones.map((milestone) => {
      const position = Math.max(
        0,
        Math.ceil(
          (milestone.date.getTime() - dateRange.start.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      return {
        ...milestone,
        position: (position * 100) / totalDays,
      };
    });
  }, [milestones, dateRange, showMilestones]);

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

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "NOT_STARTED":
        return "bg-gray-400";
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="space-y-4">
      {/* コントロールパネル */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 表示モード */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              表示モード
            </label>
            <Select
              value={viewMode}
              onValueChange={(value: ViewMode) => setViewMode(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEW_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* グループ化 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              グループ化
            </label>
            <Select
              value={groupBy}
              onValueChange={(value: GroupBy) => setGroupBy(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ステータスフィルター */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              ステータス
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Array.from(new Set(tasks.map((t) => t.status))).map(
                  (status) => (
                    <SelectItem key={status} value={status}>
                      {getTaskStatusName(status)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 担当者フィルター */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              担当者
            </label>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Array.from(
                  new Set(
                    tasks.map((t) => t.assignee?.displayName).filter(Boolean)
                  )
                ).map((assignee) => (
                  <SelectItem key={assignee} value={assignee!}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 表示オプション */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMilestones(!showMilestones)}
            className={cn(
              "gap-2",
              showMilestones && "bg-blue-50 border-blue-200"
            )}
          >
            {showMilestones ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            マイルストーン
          </Button>
        </div>
      </div>

      {/* ガントチャート */}
      <Card>
        <CardContent className="p-0">
          <div className="flex overflow-hidden">
            {/* タスクリスト */}
            <div className="w-80 border-r border-gray-200 bg-gray-50 flex-shrink-0">
              {/* ヘッダー */}
              <div className="h-12 border-b border-gray-200 flex items-center px-4 bg-gray-100 font-semibold text-sm">
                タスク一覧
              </div>

              {/* タスクリスト */}
              <ScrollArea className="h-96">
                {groups.map((group) => (
                  <div key={group.id}>
                    {groupBy !== "none" && (
                      <div
                        className="h-8 px-4 bg-gray-100 border-b border-gray-200 flex items-center cursor-pointer hover:bg-gray-200"
                        onClick={() => toggleGroup(group.id)}
                      >
                        {group.collapsed ? (
                          <ChevronRight className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        )}
                        <span className="text-sm font-medium">
                          {group.name}
                        </span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {group.tasks.length}
                        </Badge>
                      </div>
                    )}

                    {!group.collapsed &&
                      group.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="h-12 px-4 border-b border-gray-200 flex items-center hover:bg-gray-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {task.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              {task.assignee && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {task.assignee.displayName}
                                </span>
                              )}
                              {task.yoteiKosu && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.yoteiKosu}h
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              task.status === "COMPLETED"
                                ? "default"
                                : "secondary"
                            }
                            className={cn(
                              "text-xs",
                              task.status === "COMPLETED" &&
                                "bg-green-100 text-green-800",
                              task.status === "IN_PROGRESS" &&
                                "bg-blue-100 text-blue-800",
                              task.status === "NOT_STARTED" &&
                                "bg-gray-100 text-gray-800"
                            )}
                          >
                            {getTaskStatusName(task.status)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                ))}
              </ScrollArea>
            </div>

            {/* チャート領域 */}
            <div className="flex-1 relative min-w-0">
              {/* 時間軸ヘッダー */}
              <div className="h-12 border-b border-gray-200 bg-gray-100 relative overflow-hidden">
                {timeAxis.map((interval, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full border-r border-gray-300 flex items-center justify-center text-xs font-medium"
                    style={{
                      left: `${interval.position}%`,
                      width: `${interval.width}%`,
                    }}
                  >
                    {viewMode === "day" &&
                      interval.date.toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                      })}
                    {viewMode === "week" &&
                      interval.date.toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                      })}
                    {viewMode === "month" &&
                      interval.date.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                      })}
                    {viewMode === "quarter" &&
                      `${interval.date.getFullYear()}Q${Math.ceil(
                        (interval.date.getMonth() + 1) / 3
                      )}`}
                  </div>
                ))}
              </div>

              {/* チャート本体 */}
              <div className="overflow-auto">
                <div className="relative min-w-full">
                  {/* グリッド線 */}
                  {timeAxis.map((interval, index) => (
                    <div
                      key={index}
                      className="absolute top-0 bottom-0 border-r border-gray-200"
                      style={{ left: `${interval.position}%` }}
                    />
                  ))}

                  {/* マイルストーン */}
                  {milestonesWithPosition.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                      style={{ left: `${milestone.position}%` }}
                    >
                      <div className="absolute top-0 -left-2">
                        <Target className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="absolute top-5 -left-10 text-xs text-red-600 font-medium whitespace-nowrap">
                        {milestone.name}
                      </div>
                    </div>
                  ))}

                  {/* タスクバー */}
                  <div className="space-y-0">
                    {groups.map((group) => (
                      <div key={group.id}>
                        {groupBy !== "none" && (
                          <div className="h-8 bg-gray-100 border-b border-gray-200" />
                        )}

                        {!group.collapsed &&
                          group.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="h-12 border-b border-gray-200 relative hover:bg-gray-50"
                            >
                              {task.yoteiStart && task.yoteiEnd && (
                                <div
                                  className={cn(
                                    "absolute top-2 h-8 rounded-md shadow-sm flex items-center px-2 text-white text-xs font-medium",
                                    getStatusColor(task.status)
                                  )}
                                  style={{
                                    left: `${task.startPosition}%`,
                                    width: `${Math.max(task.width, 2)}%`,
                                  }}
                                  title={`${task.name} (${formatDateyyyymmdd(
                                    task.yoteiStart.toISOString()
                                  )} - ${formatDateyyyymmdd(
                                    task.yoteiEnd.toISOString()
                                  )})`}
                                >
                                  <span className="truncate">
                                    {task.width > 10 && task.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
