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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

// タスクリスト幅の最小・最大（px）
const TASK_LIST_MIN_WIDTH = 240;
const TASK_LIST_MAX_WIDTH = 800;

// 行高さの基準値（rowScale=1 のときの px）
const BASE_TASK_HEIGHT = 16;
const BASE_ROW_SPACING = 4;
const BASE_CATEGORY_HEIGHT = 20;
// 行高さスケール（Ctrl+ホイールで変更）の下限・上限
const ROW_SCALE_MIN = 0.6;
const ROW_SCALE_MAX = 3;

// 予定日（Date）をタスクリスト表示用に MM/DD へ整形する
const formatMonthDay = (date?: Date): string => {
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
};

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
    ref,
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

    // 行高さスケール（Ctrl+ホイールで全行の高さを均等に増減）
    const [rowScale, setRowScale] = useState(1);
    const chartContentRef = useRef<HTMLDivElement>(null);

    // タスクリスト幅（マウスドラッグでリサイズ可能）
    const [taskListWidth, setTaskListWidth] = useState(440);
    const resizeStateRef = useRef<{
      startX: number;
      startWidth: number;
    } | null>(null);

    const handleResizeStart = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        resizeStateRef.current = {
          startX: e.clientX,
          startWidth: taskListWidth,
        };

        const handleMove = (ev: MouseEvent) => {
          if (!resizeStateRef.current) return;
          const delta = ev.clientX - resizeStateRef.current.startX;
          const next = Math.min(
            TASK_LIST_MAX_WIDTH,
            Math.max(
              TASK_LIST_MIN_WIDTH,
              resizeStateRef.current.startWidth + delta,
            ),
          );
          setTaskListWidth(next);
        };
        const handleUp = () => {
          resizeStateRef.current = null;
          document.removeEventListener("mousemove", handleMove);
          document.removeEventListener("mouseup", handleUp);
          document.body.style.userSelect = "";
          document.body.style.cursor = "";
        };
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
      },
      [taskListWidth],
    );

    // タスクリスト幅を最小⇔最大でトグルする
    const isTaskListMaxed = taskListWidth >= TASK_LIST_MAX_WIDTH;
    const handleToggleTaskListWidth = useCallback(() => {
      setTaskListWidth((w) =>
        w >= TASK_LIST_MAX_WIDTH ? TASK_LIST_MIN_WIDTH : TASK_LIST_MAX_WIDTH,
      );
    }, []);

    // 行の寸法 - rowScale に比例（Ctrl+ホイールで均等に増減）
    const TASK_HEIGHT = Math.round(BASE_TASK_HEIGHT * rowScale);
    const ROW_SPACING = Math.round(BASE_ROW_SPACING * rowScale);
    const ROW_HEIGHT = TASK_HEIGHT + ROW_SPACING;
    const CATEGORY_HEIGHT = Math.round(BASE_CATEGORY_HEIGHT * rowScale);
    const HEADER_HEIGHT = 50;
    const TASK_LIST_WIDTH = taskListWidth;

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

    // Ctrl+ホイールで全行の高さを均等に増減（ブラウザのページズームは抑止）
    useEffect(() => {
      const el = chartContentRef.current;
      if (!el) return;

      const handleWheel = (e: WheelEvent) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        setRowScale((prev) => {
          // 上スクロールで拡大・下スクロールで縮小（deltaY に比例した滑らかな変化）
          const next = prev * Math.exp(-e.deltaY * 0.001);
          return Math.min(ROW_SCALE_MAX, Math.max(ROW_SCALE_MIN, next));
        });
      };

      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
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

    // 依存矢印用: 可視タスクと、そのバー中心Y座標（タスクID→Y）
    const visibleTasks = useMemo(
      () =>
        ganttRows
          .filter((row) => row.type === "task" && row.task)
          .map((row) => row.task!),
      [ganttRows],
    );
    const taskCenterYById = useMemo(() => {
      const map = new Map<string, number>();
      ganttRows.forEach((row) => {
        if (row.type === "task" && row.task) {
          map.set(row.task.id, row.y + row.height / 2);
        }
      });
      return map;
    }, [ganttRows]);

    // 各種寸法を計算
    const totalDays = Math.ceil(
      (timelineBounds.end.getTime() - timelineBounds.start.getTime()) /
        (24 * 60 * 60 * 1000),
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
      1200,
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
      [timelineBounds.start, columnWidth, scaleMultiplier],
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
          (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000),
        );
        const paddedDays = totalProjectDays * 1.2;
        const totalColumns = paddedDays / scaleMultiplier;
        const targetColumnWidth = containerWidth / totalColumns;
        const baseColumnWidth = getBaseColumnWidth();
        const requiredZoom = Math.max(
          0.1,
          Math.min(3.0, targetColumnWidth / baseColumnWidth),
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
          Math.min(...startDates.map((d) => d.getTime())),
        );
        const latestEnd = new Date(
          Math.max(...endDates.map((d) => d.getTime())),
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
            <div className="w-px h-4 bg-border mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleTaskListWidth}
              className="gap-2"
              title={
                isTaskListMaxed
                  ? "タスクリストを最小化"
                  : "タスクリストを最大化"
              }
            >
              {isTaskListMaxed ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </Button>
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
          <div ref={chartContentRef} className="flex h-full">
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
                <div className="flex items-center gap-2 w-full text-xs font-medium text-muted-foreground">
                  <span className="w-2 flex-shrink-0" aria-hidden />
                  <span className="w-16 flex-shrink-0 truncate">No.</span>
                  <span className="flex-1 min-w-0 truncate">タスク名</span>
                  <span className="w-12 flex-shrink-0 text-right">開始</span>
                  <span className="w-12 flex-shrink-0 text-right">終了</span>
                  <span className="w-12 flex-shrink-0 text-right">工数</span>
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
                            className="w-3 h-3 flex-shrink-0"
                            style={{
                              backgroundColor: row.category!.color,
                            }}
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
                          className={`px-4 py-0 border-b border-border hover:bg-muted/30 transition-colors absolute w-full flex items-center `}
                          style={{
                            top: row.y,
                            height: row.height,
                            paddingLeft: `${16 + task.level * 16}px`,
                            lineHeight: `${row.height}px`,
                          }}
                        >
                          <div className="flex items-center gap-2 w-full h-full">
                            {task.level > 0 && (
                              <div className="w-3 h-3 border-l border-b border-muted-foreground/30 flex-shrink-0" />
                            )}
                            <div
                              className="w-2 h-2 flex-shrink-0"
                              style={{
                                backgroundColor: task.color,
                              }}
                            />
                            <div className="w-16 flex-shrink-0 text-xs text-muted-foreground truncate">
                              {task.taskNo ?? ""}
                            </div>
                            <div className="flex-1 min-w-0 font-medium truncate text-xs leading-tight">
                              {task.name}
                            </div>
                            <div className="w-12 flex-shrink-0 text-xs text-muted-foreground text-right tabular-nums">
                              {formatMonthDay(task.startDate)}
                            </div>
                            <div className="w-12 flex-shrink-0 text-xs text-muted-foreground text-right tabular-nums">
                              {task.isMilestone
                                ? ""
                                : formatMonthDay(task.endDate)}
                            </div>
                            <div className="w-12 flex-shrink-0 text-xs text-muted-foreground text-right tabular-nums">
                              {task.isMilestone ? "M" : `${task.duration}h`}
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

            {/* タスクリスト幅のリサイズハンドル */}
            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={handleResizeStart}
              className="w-1 flex-shrink-0 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary transition-colors"
              title="ドラッグして幅を調整"
            />

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
                            />,
                          );

                          // カテゴリのサマリーバー
                          const categoryRange =
                            categoryRanges[row.categoryName!];
                          if (categoryRange) {
                            const categoryStartX = dateToX(categoryRange.start);
                            const categoryEndX = dateToX(categoryRange.end);
                            const categoryWidth = Math.max(
                              categoryEndX - categoryStartX,
                              20,
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
                              />,
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
                              />,
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
                              />,
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
                                task.isMilestone ? 0 : 20,
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

                      {/* 依存関係の矢印 */}
                      {style.showDependencies && (
                        <DependencyArrows
                          tasks={visibleTasks}
                          dateToX={dateToX}
                          rowHeight={ROW_HEIGHT}
                          taskHeight={TASK_HEIGHT}
                          style={style}
                          taskPositions={taskCenterYById}
                        />
                      )}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

GanttChart.displayName = "GanttChart";
