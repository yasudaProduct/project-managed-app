"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { WbsTask } from "@/types/wbs";
import { GroupBy } from "./gantt-controls";
import { getTaskStatusName } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  Calendar,
  CalendarDays,
  Minimize2,
  Maximize2,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTaskRowStyleDynamic,
  getGroupHeaderStyle,
} from "./gantt-row-constants";
import { TaskModal } from "@/components/wbs/task-modal";

interface TaskWithPosition extends WbsTask {
  startPosition: number;
  width: number;
  groupId?: string;
}

interface TaskGroup {
  id: string;
  name: string;
  tasks: TaskWithPosition[];
  collapsed: boolean;
}

interface GanttTaskListProps {
  groups: TaskGroup[];
  groupBy: GroupBy;
  onToggleGroup: (groupId: string) => void;
  collapsedTasks: Set<string>;
  onToggleTask: (taskId: string) => void;
  onToggleAllTasks: () => void;
  wbsId: number;
  onTaskUpdate?: () => void;
}

export default function GanttTaskList({
  groups,
  groupBy,
  onToggleGroup,
  collapsedTasks,
  onToggleTask,
  onToggleAllTasks,
  wbsId,
  onTaskUpdate,
}: GanttTaskListProps) {
  const [selectedTask, setSelectedTask] = useState<WbsTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEditClick = (task: WbsTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    if (onTaskUpdate) {
      onTaskUpdate();
    }
  };
  return (
    <div className="w-60 lg:w-96 border-r border-gray-200 bg-gray-50 flex-shrink-0">
      {/* ヘッダー */}
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-100 font-semibold text-sm">
        <span>タスク詳細</span>

        {/* 全タスク切り替えボタン */}
        <button
          onClick={onToggleAllTasks}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors"
          data-testid="toggle-all-tasks-button"
          title={(() => {
            // 全タスクの総数を計算
            const totalTasks = groups.reduce(
              (sum, group) => sum + group.tasks.length,
              0
            );
            const collapsedCount = collapsedTasks.size;

            if (collapsedCount === 0) {
              return "全て折りたたむ";
            } else if (collapsedCount === totalTasks) {
              return "全て展開";
            } else {
              return "全て折りたたむ";
            }
          })()}
        >
          {(() => {
            // 全タスクの総数を計算
            const totalTasks = groups.reduce(
              (sum, group) => sum + group.tasks.length,
              0
            );
            const collapsedCount = collapsedTasks.size;

            if (collapsedCount === 0) {
              return (
                <>
                  <Minimize2 className="h-3 w-3" />
                  <span className="hidden sm:inline">全て折りたたむ</span>
                </>
              );
            } else if (collapsedCount === totalTasks) {
              return (
                <>
                  <Maximize2 className="h-3 w-3" />
                  <span className="hidden sm:inline">全て展開</span>
                </>
              );
            } else {
              return (
                <>
                  <Minimize2 className="h-3 w-3" />
                  <span className="hidden sm:inline">全て折りたたむ</span>
                </>
              );
            }
          })()}
        </button>
      </div>

      {/* タスクリスト */}
      <ScrollArea className="h-96">
        {groups.map((group) => (
          <div key={group.id}>
            {/* グループヘッダー */}
            {groupBy !== "none" && (
              <div
                className="px-4 bg-gray-100 border-b border-gray-200 flex items-center cursor-pointer hover:bg-gray-200"
                style={getGroupHeaderStyle()}
                onClick={() => onToggleGroup(group.id)}
              >
                {group.collapsed ? (
                  <ChevronRight className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                <span className="text-sm font-medium">{group.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {group.tasks.length}
                </Badge>
              </div>
            )}

            {!group.collapsed &&
              group.tasks.map((task) => {
                // 日付フォーマット関数
                const formatDate = (
                  date: string | Date | undefined
                ): string => {
                  if (!date) return "未設定";
                  if (typeof date === "string") return date;
                  return date.toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                  });
                };

                const isTaskCollapsed = collapsedTasks.has(task.id.toString());

                return (
                  <div
                    key={task.id}
                    className={`px-4 border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 flex flex-col ${
                      isTaskCollapsed ? "justify-center" : "py-2"
                    }`}
                    style={getTaskRowStyleDynamic(task, isTaskCollapsed)}
                  >
                    {/* タスク名とコントロール */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* 折りたたみボタン */}
                        <button
                          onClick={() => onToggleTask(task.id.toString())}
                          className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                          title={
                            isTaskCollapsed ? "詳細を表示" : "詳細を非表示"
                          }
                        >
                          {isTaskCollapsed ? (
                            <ChevronRight className="h-3 w-3 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-gray-500" />
                          )}
                        </button>

                        {/* タスク名 */}
                        <div className="text-sm font-medium truncate pr-2">
                          {task.name}
                        </div>

                        {task.assignee && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">
                              {task.assignee.displayName}
                            </span>
                          </div>
                        )}

                        {/* 予定工数 */}
                        {task.yoteiKosu && task.yoteiKosu > 0 && (
                          <>
                            <span className="text-gray-400 hidden sm:inline">
                              |
                            </span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="whitespace-nowrap">
                                {task.yoteiKosu}h
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 編集ボタン */}
                        <button
                          onClick={() => handleEditClick(task)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="タスクを編集"
                        >
                          <Edit className="h-3 w-3 text-gray-500" />
                        </button>

                        {/* ステータスバッジ */}
                        <Badge
                          variant={
                            task.status === "COMPLETED"
                              ? "default"
                              : "secondary"
                          }
                          className={cn(
                            "text-xs flex-shrink-0",
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
                    </div>

                    {/* 詳細情報（折りたたみ可能） */}
                    {!isTaskCollapsed && (
                      <div className="mt-2 ml-6 space-y-1">
                        {/* 日程と工数の行 */}
                        <div className="flex items-center gap-2 lg:gap-3 text-xs text-gray-600 flex-wrap">
                          {/* 予定開始日 */}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {formatDate(task.yoteiStart)}
                            </span>
                          </div>

                          {/* 矢印 */}
                          <span className="text-gray-400 hidden sm:inline">
                            →
                          </span>

                          {/* 予定終了日 */}
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3 flex-shrink-0 sm:hidden" />
                            <span className="whitespace-nowrap">
                              {formatDate(task.yoteiEnd)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </ScrollArea>

      {/* タスク編集モーダル */}
      <TaskModal
        wbsId={wbsId}
        task={selectedTask || undefined}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
