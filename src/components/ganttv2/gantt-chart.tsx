"use client";

import React, { useState } from "react";
import { Milestone, TaskStatus, WbsTask } from "@/types/wbs";
import { GroupBy } from "./gantt-controls";
import { Target, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskModal } from "@/components/wbs/task-modal";
import { updateTask } from "@/app/wbs/[id]/wbs-task-actions";
import { toast } from "@/hooks/use-toast";
import { formatDateToLocalString } from "./gantt-utils";
import { getTaskRowStyleDynamic, getGroupHeaderStyle, getTaskBarStyleDynamic } from "./gantt-row-constants";

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

interface TimeInterval {
  date: Date;
  position: number;
  width: number;
}

interface MilestoneWithPosition extends Milestone {
  position: number;
}

interface GanttChartProps {
  timeAxis: TimeInterval[];
  chartWidth: number;
  groups: TaskGroup[];
  groupBy: GroupBy;
  milestonesWithPosition: MilestoneWithPosition[];
  chartScrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  wbsId: number;
  onTaskUpdate?: () => void;
  collapsedTasks: Set<string>;
}

export default function GanttChart({
  timeAxis,
  chartWidth,
  groups,
  groupBy,
  milestonesWithPosition,
  chartScrollRef,
  onScroll,
  wbsId,
  onTaskUpdate,
  collapsedTasks,
}: GanttChartProps) {
  const [selectedTask, setSelectedTask] = useState<WbsTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ドラッグ関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<TaskWithPosition | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // リサイズ関連の状態
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<
    "start" | "end" | null
  >(null);
  const [originalTaskData, setOriginalTaskData] = useState<{
    start: number;
    width: number;
  } | null>(null);

  // クリック/ドラッグ判定用の状態
  const [mouseDownPosition, setMouseDownPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hasDragStarted, setHasDragStarted] = useState(false);
  const [clickTask, setClickTask] = useState<TaskWithPosition | null>(null);
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

  const handleTaskClick = React.useCallback((task: TaskWithPosition) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    // タスク更新後にコールバックを呼び出す
    if (onTaskUpdate) {
      onTaskUpdate();
    }
  };

  // 日付範囲の計算（プロジェクト期間をベースに設定）
  const dateRange = React.useMemo(() => {
    if (timeAxis.length === 0) return { start: new Date(), end: new Date() };
    const start = timeAxis[0].date;
    const end = new Date(timeAxis[timeAxis.length - 1].date);
    end.setDate(end.getDate() + 7); // 最後の期間を考慮
    return { start, end };
  }, [timeAxis]);

  // ピクセル位置から日付を計算
  const positionToDate = (position: number): Date => {
    // 時間軸計算と同じ正規化ロジックを使用
    const normalizedRangeStart = new Date(dateRange.start);
    normalizedRangeStart.setHours(0, 0, 0, 0);

    const normalizedRangeEnd = new Date(dateRange.end);
    normalizedRangeEnd.setHours(0, 0, 0, 0);

    const totalDays = Math.ceil(
      (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const dayPosition = (position / chartWidth) * totalDays;

    const resultDate = new Date(normalizedRangeStart);
    resultDate.setDate(resultDate.getDate() + Math.round(dayPosition));
    return resultDate;
  };

  // マウスダウン（ドラッグ開始の可能性）
  const handleMouseDown = (e: React.MouseEvent, task: TaskWithPosition) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    // 初期位置を記録
    setMouseDownPosition({ x: e.clientX, y: e.clientY });
    setClickTask(task);
    setHasDragStarted(false);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // リサイズ開始
  const handleResizeStart = (
    e: React.MouseEvent,
    task: TaskWithPosition,
    direction: "start" | "end"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setDraggedTask(task);
    setResizeDirection(direction);
    setOriginalTaskData({
      start: task.startPosition,
      width: task.width,
    });
  };

  // ドラッグ・リサイズ中
  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      // ドラッグ判定のしきい値（5px移動したらドラッグとみなす）
      const DRAG_THRESHOLD = 5;

      if (
        mouseDownPosition &&
        clickTask &&
        !isDragging &&
        !isResizing &&
        !hasDragStarted
      ) {
        // ドラッグ開始の判定
        const deltaX = Math.abs(e.clientX - mouseDownPosition.x);
        const deltaY = Math.abs(e.clientY - mouseDownPosition.y);

        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          // ドラッグ開始
          setIsDragging(true);
          setDraggedTask(clickTask);
          setHasDragStarted(true);
        }
        return;
      }

      if (
        (!isDragging && !isResizing) ||
        !draggedTask ||
        !chartScrollRef.current
      )
        return;

      const chartRect = chartScrollRef.current.getBoundingClientRect();
      const currentX =
        e.clientX - chartRect.left + chartScrollRef.current.scrollLeft;

      if (isDragging) {
        // ドラッグ中の処理
        const newX = currentX - dragOffset.x;
        const constrainedX = Math.max(
          0,
          Math.min(newX, chartWidth - draggedTask.width)
        );
        setDraggedTask((prev) =>
          prev ? { ...prev, startPosition: constrainedX } : null
        );
      } else if (isResizing && originalTaskData) {
        // リサイズ中の処理
        if (resizeDirection === "end") {
          // 右端をドラッグ（終了日を変更）
          const newWidth = Math.max(20, currentX - draggedTask.startPosition);
          setDraggedTask((prev) =>
            prev ? { ...prev, width: newWidth } : null
          );
        } else if (resizeDirection === "start") {
          // 左端をドラッグ（開始日を変更）
          const newStart = Math.max(
            0,
            Math.min(
              currentX,
              originalTaskData.start + originalTaskData.width - 20
            )
          );
          const newWidth =
            originalTaskData.start + originalTaskData.width - newStart;
          setDraggedTask((prev) =>
            prev ? { ...prev, startPosition: newStart, width: newWidth } : null
          );
        }
      }
    },
    [
      isDragging,
      isResizing,
      draggedTask,
      dragOffset,
      chartWidth,
      resizeDirection,
      originalTaskData,
      mouseDownPosition,
      clickTask,
      hasDragStarted,
    ]
  );

  // ドラッグ・リサイズ終了
  const handleMouseUp = React.useCallback(async () => {
    // ドラッグが発生しなかった場合（クリック）
    if (
      mouseDownPosition &&
      clickTask &&
      !hasDragStarted &&
      !isDragging &&
      !isResizing
    ) {
      handleTaskClick(clickTask);
      // 状態をリセット
      setMouseDownPosition(null);
      setClickTask(null);
      setHasDragStarted(false);
      return;
    }

    if ((!isDragging && !isResizing) || !draggedTask) {
      // 状態をリセット
      setMouseDownPosition(null);
      setClickTask(null);
      setHasDragStarted(false);
      return;
    }

    const wasResizing = isResizing;
    setIsDragging(false);
    setIsResizing(false);

    try {
      let newStartDate: Date;
      let newEndDate: Date;

      if (wasResizing) {
        // リサイズの場合
        newStartDate = positionToDate(draggedTask.startPosition);
        const endPosition = draggedTask.startPosition + draggedTask.width;
        newEndDate = positionToDate(endPosition);
      } else {
        // ドラッグ移動の場合
        newStartDate = positionToDate(draggedTask.startPosition);
        const originalDuration =
          draggedTask.yoteiEnd && draggedTask.yoteiStart
            ? Math.ceil(
                (draggedTask.yoteiEnd.getTime() -
                  draggedTask.yoteiStart.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 1;
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + originalDuration);
      }

      // タスクの更新
      const result = await updateTask(wbsId, {
        id: Number(draggedTask.id),
        name: draggedTask.name,
        yoteiStart: newStartDate,
        yoteiEnd: newEndDate,
        yoteiKosu: draggedTask.yoteiKosu || 0,
        status: draggedTask.status,
        assigneeId: Number(draggedTask.assigneeId),
        phaseId: draggedTask.phaseId || 0,
      });

      if (result.success) {
        toast({
          title: wasResizing
            ? "タスクの期間を変更しました"
            : "タスクを移動しました",
          description: `${draggedTask.name}の期間を更新しました`,
        });

        if (onTaskUpdate) {
          onTaskUpdate();
        }
      } else {
        toast({
          title: wasResizing
            ? "期間の変更に失敗しました"
            : "タスクの移動に失敗しました",
          description: result.error,
          variant: "destructive",
        });
        // 元の状態に戻す
        if (originalTaskData) {
          setDraggedTask((prev) =>
            prev
              ? {
                  ...prev,
                  startPosition: originalTaskData.start,
                  width: originalTaskData.width,
                }
              : null
          );
        }
      }
    } catch (error) {
      toast({
        title: wasResizing
          ? "期間の変更に失敗しました"
          : "タスクの移動に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        variant: "destructive",
      });
      // 元の状態に戻す
      if (originalTaskData) {
        setDraggedTask((prev) =>
          prev
            ? {
                ...prev,
                startPosition: originalTaskData.start,
                width: originalTaskData.width,
              }
            : null
        );
      }
    }

    // 状態をリセット
    setDraggedTask(null);
    setDragOffset({ x: 0, y: 0 });
    setResizeDirection(null);
    setOriginalTaskData(null);
    setMouseDownPosition(null);
    setClickTask(null);
    setHasDragStarted(false);
  }, [
    isDragging,
    isResizing,
    draggedTask,
    originalTaskData,
    wbsId,
    onTaskUpdate,
    positionToDate,
    mouseDownPosition,
    clickTask,
    hasDragStarted,
    handleTaskClick,
  ]);

  // グローバルマウスイベントの設定
  React.useEffect(() => {
    if (isDragging || isResizing || mouseDownPosition) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      if (isDragging || isResizing) {
        document.body.style.cursor = isDragging ? "grabbing" : "col-resize";
        document.body.style.userSelect = "none";
      }

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [
    isDragging,
    isResizing,
    mouseDownPosition,
    handleMouseMove,
    handleMouseUp,
  ]);

  return (
    <div ref={chartScrollRef} className="overflow-auto" onScroll={onScroll}>
      <div
        className="relative"
        style={{ width: `${chartWidth}px`, minWidth: "100%" }}
      >
        {/* グリッド線 */}
        {timeAxis.map((interval, index) => (
          <div
            key={index}
            className="absolute top-0 bottom-0 border-r border-gray-200"
            style={{ left: `${interval.position}px` }}
          />
        ))}

        {/* マイルストーン */}
        {milestonesWithPosition.map((milestone) => (
          <div
            key={milestone.id}
            data-milestone-id={milestone.id}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `${milestone.position}px` }}
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
                <div 
                  className="bg-gray-100 border-b border-gray-200" 
                  style={getGroupHeaderStyle()}
                />
              )}

              {!group.collapsed &&
                group.tasks.map((task) => {
                  const isTaskCollapsed = collapsedTasks.has(
                    task.id.toString()
                  );
                  return (
                    <div
                      key={task.id}
                      className="border-b border-gray-200 relative hover:bg-gray-50 transition-all duration-200"
                      style={getTaskRowStyleDynamic(task, isTaskCollapsed)}
                    >
                      {task.yoteiStart && task.yoteiEnd && (
                        <div
                          data-task-id={task.id}
                          className={cn(
                            "absolute rounded-md shadow-sm flex items-center px-2 text-white text-xs font-medium transition-all duration-200 group select-none",
                            "hover:shadow-md hover:z-10 relative",
                            (isDragging || isResizing) &&
                              draggedTask?.id === task.id
                              ? "scale-105 shadow-lg z-20 opacity-80"
                              : "hover:scale-105",
                            isDragging && draggedTask?.id === task.id
                              ? "cursor-grabbing"
                              : "cursor-grab",
                            getStatusColor(task.status)
                          )}
                          style={{
                            left: `${
                              draggedTask?.id === task.id &&
                              (isDragging || isResizing)
                                ? draggedTask.startPosition
                                : task.startPosition
                            }px`,
                            width: `${
                              draggedTask?.id === task.id &&
                              (isDragging || isResizing)
                                ? Math.max(draggedTask.width, 20)
                                : Math.max(task.width, 20)
                            }px`,
                            ...getTaskBarStyleDynamic(task, isTaskCollapsed),
                          }}
                          title={`${task.name} (${formatDateToLocalString(
                            task.yoteiStart
                          )} - ${formatDateToLocalString(
                            task.yoteiEnd
                          )}) - ドラッグで移動、クリックで編集`}
                          onMouseDown={(e) => handleMouseDown(e, task)}
                        >
                          {/* 左リサイズハンドル */}
                          <div
                            className="absolute left-0 top-0 w-2 h-full cursor-col-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-30 rounded-l-md transition-opacity"
                            onMouseDown={(e) =>
                              handleResizeStart(e, task, "start")
                            }
                            title="開始日を変更"
                          />

                          <span className="truncate flex-1 pointer-events-none">
                            {task.width > 50 && task.name}
                          </span>

                          <Edit className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

                          {/* 右リサイズハンドル */}
                          <div
                            className="absolute right-0 top-0 w-2 h-full cursor-col-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-30 rounded-r-md transition-opacity"
                            onMouseDown={(e) =>
                              handleResizeStart(e, task, "end")
                            }
                            title="終了日を変更"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

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
