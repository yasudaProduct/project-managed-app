import React, {
  forwardRef,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  JSX,
} from "react";
import { Task, TimelineScale, GanttStyle, GanttPhase, GroupBy } from "./gantt";
import { groupTasksByType } from "./utils/groupTasks";
import { TimelineHeader } from "./TimelineHeader";
import { TaskBar } from "./TaskBar";
import { GridLines } from "./GridLines";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DependencyArrows } from "./DependencyArrows";
import { Button } from "../ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface GanttChartProps {
  tasks: Task[];
  categories: GanttPhase[];
  timelineScale: TimelineScale;
  style: GanttStyle;
  expandedCategories: Set<string>;
  zoomLevel?: number;
  groupBy?: GroupBy;
  onTaskUpdate: (task: Task) => void;
  onCategoryToggle: (categoryName: string) => void;
  onZoomChange?: (zoom: number) => void;
}

// 単一行タイプ - タスクリストとタイムラインの両方で使用し、完全な1:1整列を保証する
interface GanttRow {
  type: "category" | "task";
  id: string;
  y: number;
  height: number;
  categoryName?: string;
  task?: Task;
  category?: GanttPhase;
}

export const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(
  (
    {
      tasks,
      categories,
      timelineScale,
      style,
      expandedCategories,
      zoomLevel = 1.0,
      groupBy = "phase",
      onTaskUpdate,
      onCategoryToggle,
      onZoomChange,
    },
    ref
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    onTaskUpdate;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [draggedTask, setDraggedTask] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [dragMode, setDragMode] = useState<
      "move" | "resize-start" | "resize-end" | null
    >(null);
    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);

    // 厳密な寸法定数 - 可変性なし、絶対的な精度
    const TASK_HEIGHT = 16;
    const ROW_SPACING = 4;
    const ROW_HEIGHT = TASK_HEIGHT + ROW_SPACING; // 20px
    const CATEGORY_HEIGHT = 20;
    const HEADER_HEIGHT = 50;
    const TASK_LIST_WIDTH = 300;

    // タイムラインの範囲を計算
    const timelineBounds = useMemo(() => {
      if (tasks.length === 0) {
        const now = new Date();
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        };
      }

      const dates = tasks.flatMap((task) => [task.startDate, task.endDate]);
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      const paddingDays =
        timelineScale === "day" ? 7 : timelineScale === "week" ? 14 : 30;
      const padding = paddingDays * 24 * 60 * 60 * 1000;

      return {
        start: new Date(minDate.getTime() - padding),
        end: new Date(maxDate.getTime() + padding),
      };
    }, [tasks, timelineScale]);

    // タイムラインのスクロール同期を処理
    useEffect(() => {
      const handleScroll = () => {
        if (timelineScrollRef.current) {
          setScrollLeft(timelineScrollRef.current.scrollLeft);
        }
      };

      const scrollElement = timelineScrollRef.current;
      if (scrollElement) {
        scrollElement.addEventListener("scroll", handleScroll);
        return () => scrollElement.removeEventListener("scroll", handleScroll);
      }
    }, []);

    // 列幅を計算
    const getBaseColumnWidth = useCallback(() => {
      switch (timelineScale) {
        case "day":
          return 40;
        case "week":
          return 80;
        case "month":
          return 120;
        case "quarter":
          return 200;
        default:
          return 80;
      }
    }, [timelineScale]);

    const columnWidth = Math.round(getBaseColumnWidth() * zoomLevel);

    // タスクをグループ化
    const taskGroups = useMemo(() => {
      return groupTasksByType(tasks, groupBy, categories);
    }, [tasks, groupBy, categories]);

    // グループごとのタスクマップ（互換性のため）
    const groupedTasks = useMemo(() => {
      const grouped: Record<string, Task[]> = {};
      taskGroups.forEach((group) => {
        grouped[group.name] = group.tasks;
      });
      return grouped;
    }, [taskGroups]);

    // 堅牢な行計算 - 両側の単一の信頼できる情報源（SSOT）
    const ganttRows = useMemo(() => {
      const rows: GanttRow[] = [];
      let currentY = 0;

      taskGroups.forEach((group) => {
        const category = categories.find((c) => c.name === group.name) || {
          name: group.name,
          color: group.color || "#6B7280",
          id: group.id,
        };

        // フェーズ行
        rows.push({
          type: "category",
          id: `category-${group.id ?? group.name}`,
          y: currentY,
          height: CATEGORY_HEIGHT,
          categoryName: group.name,
          category,
        });
        currentY += CATEGORY_HEIGHT;

        // タスク行 - フェーズが展開されている場合のみ
        if (expandedCategories.has(group.name)) {
          group.tasks.forEach((task) => {
            rows.push({
              type: "task",
              id: `task-${task.id}`,
              y: currentY,
              height: ROW_HEIGHT,
              task,
              categoryName: group.name,
            });
            currentY += ROW_HEIGHT;
          });
        }
      });

      return rows;
    }, [
      taskGroups,
      categories,
      expandedCategories,
      CATEGORY_HEIGHT,
      ROW_HEIGHT,
    ]);

    // 各種寸法を計算
    const totalDays = Math.ceil(
      (timelineBounds.end.getTime() - timelineBounds.start.getTime()) /
        (24 * 60 * 60 * 1000)
    );
    const scaleMultiplier =
      timelineScale === "day"
        ? 1
        : timelineScale === "week"
        ? 7
        : timelineScale === "month"
        ? 30
        : 90;
    const chartWidth = Math.max(
      (totalDays / scaleMultiplier) * columnWidth,
      1200
    );
    const totalContentHeight =
      ganttRows.length > 0
        ? ganttRows[ganttRows.length - 1].y +
          ganttRows[ganttRows.length - 1].height
        : 100;
    const chartHeight = Math.max(totalContentHeight + 50, 400);

    // 日付をX座標に変換
    const dateToX = useCallback(
      (date: Date) => {
        const daysDiff =
          (date.getTime() - timelineBounds.start.getTime()) /
          (24 * 60 * 60 * 1000);
        return (daysDiff / scaleMultiplier) * columnWidth;
      },
      [timelineBounds.start, columnWidth, scaleMultiplier]
    );

    // ナビゲーション用ハンドラ
    const handleScrollLeft = useCallback(() => {
      if (timelineScrollRef.current) {
        timelineScrollRef.current.scrollBy({
          left: -columnWidth * 5,
          behavior: "smooth",
        });
      }
    }, [columnWidth]);

    const handleScrollRight = useCallback(() => {
      if (timelineScrollRef.current) {
        timelineScrollRef.current.scrollBy({
          left: columnWidth * 5,
          behavior: "smooth",
        });
      }
    }, [columnWidth]);

    const handleZoomIn = useCallback(() => {
      const newZoom = Math.min(zoomLevel * 1.2, 3.0);
      onZoomChange?.(newZoom);
    }, [zoomLevel, onZoomChange]);

    const handleZoomOut = useCallback(() => {
      const newZoom = Math.max(zoomLevel / 1.2, 0.3);
      onZoomChange?.(newZoom);
    }, [zoomLevel, onZoomChange]);

    const handleFitToScreen = useCallback(() => {
      if (!timelineScrollRef.current || tasks.length === 0 || !onZoomChange)
        return;

      try {
        const containerWidth = timelineScrollRef.current.clientWidth;
        const dates = tasks.flatMap((task) => [task.startDate, task.endDate]);
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
        const totalProjectDays = Math.ceil(
          (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        const paddedDays = totalProjectDays * 1.2;
        const totalColumns = paddedDays / scaleMultiplier;
        const targetColumnWidth = containerWidth / totalColumns;
        const baseColumnWidth = getBaseColumnWidth();
        const requiredZoom = Math.max(
          0.1,
          Math.min(3.0, targetColumnWidth / baseColumnWidth)
        );

        onZoomChange(requiredZoom);

        setTimeout(() => {
          if (timelineScrollRef.current) {
            const startX = dateToX(minDate);
            const scrollX = Math.max(0, startX - containerWidth * 0.1);
            timelineScrollRef.current.scrollTo({
              left: scrollX,
              behavior: "smooth",
            });
          }
        }, 100);
      } catch (error) {
        console.error("Error in fit to screen:", error);
      }
    }, [tasks, onZoomChange, scaleMultiplier, getBaseColumnWidth, dateToX]);

    const todayX = useMemo(() => {
      if (!style.showTodayLine) return null;
      const today = new Date();
      if (today >= timelineBounds.start && today <= timelineBounds.end) {
        return dateToX(today);
      }
      return null;
    }, [style.showTodayLine, timelineBounds, dateToX]);

    const handleScrollToToday = useCallback(() => {
      if (timelineScrollRef.current && todayX !== null) {
        const containerWidth = timelineScrollRef.current.clientWidth;
        const scrollX = Math.max(0, todayX - containerWidth / 2);
        timelineScrollRef.current.scrollTo({
          left: scrollX,
          behavior: "smooth",
        });
      }
    }, [todayX]);

    // サマリーバー用にカテゴリの期間を計算
    const categoryRanges = useMemo(() => {
      const ranges: Record<
        string,
        { start: Date; end: Date; progress: number; color: string }
      > = {};

      Object.entries(groupedTasks).forEach(([categoryName, categoryTasks]) => {
        if (categoryTasks.length === 0) return;

        const category = categories.find((c) => c.name === categoryName) || {
          name: categoryName,
          color: "#6B7280",
          id: "uncategorized",
        };

        const startDates = categoryTasks.map((task) => task.startDate);
        const endDates = categoryTasks.map((task) => task.endDate);
        const earliestStart = new Date(
          Math.min(...startDates.map((d) => d.getTime()))
        );
        const latestEnd = new Date(
          Math.max(...endDates.map((d) => d.getTime()))
        );
        const avgProgress =
          categoryTasks.reduce((sum, task) => sum + task.progress, 0) /
          categoryTasks.length;

        ranges[categoryName] = {
          start: earliestStart,
          end: latestEnd,
          progress: avgProgress,
          color: category.color,
        };
      });

      return ranges;
    }, [groupedTasks, categories]);

    return (
      <>
        {/* ナビゲーション操作 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrollLeft}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrollRight}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToScreen}
              className="gap-2"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            {todayX !== null && (
              <Button variant="outline" size="sm" onClick={handleScrollToToday}>
                今日
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
            <span>
              {timelineBounds.start
                .toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
                .replace(/\./g, "/")}{" "}
              -{" "}
              {timelineBounds.end
                .toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
                .replace(/\./g, "/")}
            </span>
          </div>
        </div>
        <div ref={ref} className="w-full h-full bg-background gantt-chart">
          <div className="flex h-full">
            {/* タスクリスト列 */}
            <div
              className="border-r border-border bg-card flex-shrink-0"
              style={{ width: TASK_LIST_WIDTH }}
            >
              {/* ヘッダー */}
              <div
                className="border-b border-border px-4 py-3 bg-muted/30 flex flex-col justify-center"
                style={{ height: HEADER_HEIGHT }}
              >
                <div className="flex items-center justify-between">
                  {/* <h3 className="font-medium">タスク名</h3>
                  <div className="text-xs text-muted-foreground">詳細</div> */}
                </div>
              </div>

              {/* タスクリストの内容 */}
              <div
                className="overflow-y-auto relative"
                style={{ height: `calc(100% - ${HEADER_HEIGHT}px)` }}
              >
                <div
                  style={{ height: totalContentHeight, position: "relative" }}
                >
                  {ganttRows.map((row) => {
                    if (row.type === "category") {
                      return (
                        <div
                          key={row.id}
                          className="bg-muted/50 border-b border-border px-4 py-0 flex items-center gap-3 cursor-pointer hover:bg-muted/70 transition-colors absolute w-full"
                          style={{
                            top: row.y,
                            height: row.height,
                            lineHeight: `${row.height}px`,
                          }}
                          onClick={() => onCategoryToggle(row.categoryName!)}
                        >
                          <button className="p-0.5 hover:bg-muted rounded transition-colors">
                            {expandedCategories.has(row.categoryName!) ? (
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 9l6 6 6-6"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 6l6 6-6 6"
                                />
                              </svg>
                            )}
                          </button>
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: row.category!.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">
                              {row.categoryName}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {groupedTasks[row.categoryName!]?.length || 0}
                          </div>
                        </div>
                      );
                    } else if (row.type === "task" && row.task) {
                      const task = row.task;
                      return (
                        <div
                          key={row.id}
                          className={`px-4 py-0 border-b border-border hover:bg-muted/30 transition-colors absolute w-full flex items-center ${
                            task.isOnCriticalPath && style.showCriticalPath
                              ? "bg-red-50/50"
                              : ""
                          }`}
                          style={{
                            top: row.y,
                            height: row.height,
                            paddingLeft: `${16 + task.level * 16}px`,
                            lineHeight: `${row.height}px`,
                          }}
                        >
                          <div className="flex items-center justify-between w-full h-full">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {task.level > 0 && (
                                <div className="w-3 h-3 border-l border-b border-muted-foreground/30" />
                              )}
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    task.isOnCriticalPath &&
                                    style.showCriticalPath
                                      ? style.colors.criticalPath
                                      : task.color,
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-xs leading-tight">
                                  {task.name}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground ml-2">
                              {task.isMilestone ? "M" : `${task.duration}d`}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            {/* タイムライン領域 */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* タイムラインコンテンツのコンテナ */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* タイムラインヘッダー */}
                <div style={{ height: HEADER_HEIGHT }}>
                  <TimelineHeader
                    start={timelineBounds.start}
                    end={timelineBounds.end}
                    scale={timelineScale}
                    columnWidth={columnWidth}
                    height={HEADER_HEIGHT}
                    showWeekends={style.showWeekends}
                    scrollLeft={scrollLeft}
                  />
                </div>

                {/* タイムラインコンテンツ - タスクリストと全く同じY座標を使用 */}
                <div ref={timelineScrollRef} className="flex-1 overflow-auto">
                  <div style={{ width: chartWidth, height: chartHeight }}>
                    <svg
                      width={chartWidth}
                      height={chartHeight}
                      className="block"
                    >
                      {/* 背景とグリッド */}
                      {style.showGrid && (
                        <GridLines
                          width={chartWidth}
                          height={chartHeight}
                          columnWidth={columnWidth}
                          rowHeight={ROW_HEIGHT}
                          scale={timelineScale}
                          startDate={timelineBounds.start}
                          showWeekends={style.showWeekends}
                          weekendColor={style.colors.weekend}
                        />
                      )}

                      {/* 本日ライン */}
                      {todayX !== null && (
                        <line
                          x1={todayX}
                          y1={0}
                          x2={todayX}
                          y2={chartHeight}
                          stroke={style.colors.today}
                          strokeWidth={2}
                          strokeDasharray="5,5"
                          className="pointer-events-none"
                        />
                      )}

                      {/* 同じganttRowsを使ってタイムライン要素を描画 */}
                      {ganttRows.map((row) => {
                        if (row.type === "category") {
                          // カテゴリの背景ストライプ
                          const elements: JSX.Element[] = [];

                          elements.push(
                            <rect
                              key={`${row.id}-bg`}
                              x={0}
                              y={row.y}
                              width={chartWidth}
                              height={row.height}
                              fill="rgba(0,0,0,0.02)"
                              className="pointer-events-none"
                            />
                          );

                          // カテゴリのサマリーバー
                          const categoryRange =
                            categoryRanges[row.categoryName!];
                          if (categoryRange) {
                            const categoryStartX = dateToX(categoryRange.start);
                            const categoryEndX = dateToX(categoryRange.end);
                            const categoryWidth = Math.max(
                              categoryEndX - categoryStartX,
                              20
                            );
                            const categoryBarHeight = 8;
                            const categoryBarY =
                              row.y + (row.height - categoryBarHeight) / 2;

                            elements.push(
                              <rect
                                key={`${row.id}-bar-bg`}
                                x={categoryStartX}
                                y={categoryBarY}
                                width={categoryWidth}
                                height={categoryBarHeight}
                                fill={categoryRange.color}
                                fillOpacity={0.3}
                                rx={2}
                                className="pointer-events-none"
                              />
                            );

                            const progressWidth =
                              (categoryWidth * categoryRange.progress) / 100;
                            elements.push(
                              <rect
                                key={`${row.id}-bar-progress`}
                                x={categoryStartX}
                                y={categoryBarY}
                                width={progressWidth}
                                height={categoryBarHeight}
                                fill={categoryRange.color}
                                fillOpacity={0.8}
                                rx={2}
                                className="pointer-events-none"
                              />
                            );

                            elements.push(
                              <rect
                                key={`${row.id}-bar-border`}
                                x={categoryStartX}
                                y={categoryBarY}
                                width={categoryWidth}
                                height={categoryBarHeight}
                                fill="none"
                                stroke={categoryRange.color}
                                strokeWidth={1}
                                strokeOpacity={0.6}
                                rx={2}
                                className="pointer-events-none"
                              />
                            );
                          }

                          return elements;
                        } else if (row.type === "task" && row.task) {
                          // タスクバー - タスクリスト行と完全に一致するY位置
                          const task = row.task;
                          const taskBarY =
                            row.y + (row.height - TASK_HEIGHT) / 2;

                          return (
                            <TaskBar
                              key={row.id}
                              task={task}
                              x={dateToX(task.startDate)}
                              y={taskBarY}
                              width={Math.max(
                                dateToX(task.endDate) - dateToX(task.startDate),
                                task.isMilestone ? 0 : 20
                              )}
                              height={TASK_HEIGHT}
                              style={style}
                              onDragStart={() => {}}
                              isDragging={false}
                            />
                          );
                        }
                        return null;
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
);

GanttChart.displayName = "GanttChart";
