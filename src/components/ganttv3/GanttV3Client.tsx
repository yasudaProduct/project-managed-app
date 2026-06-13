"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Task,
  TimelineScale,
  GanttStyle,
  Category,
  ViewSwitcher,
  QuickActions,
  GanttChart,
  GroupBy,
} from "@/components/ganttv3";
import { TaskTable } from "@/components/ganttv3/TaskTable";
import { getGanttTasks, getPhases } from "@/app/wbs/[id]/ganttv3/action";
import {
  createTask,
  updateTask,
  deleteTask,
} from "@/app/wbs/[id]/actions/wbs-task-actions";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/app/wbs/[id]/actions/milestone-actions";
import {
  createGanttDependency,
  deleteGanttDependency,
} from "@/app/wbs/[id]/ganttv3/dependency-actions";
import { DependencyType } from "@/components/ganttv3/gantt";
import { toast } from "@/hooks/use-toast";

const defaultGanttStyle: GanttStyle = {
  theme: "modern",
  showGrid: true,
  showProgress: true,
  showDependencies: true,
  showCriticalPath: true,
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

interface GanttV3ClientProps {
  wbsId: number;
}

export function GanttV3Client({ wbsId }: GanttV3ClientProps) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [currentView, setCurrentView] = useState<"gantt" | "table">("gantt");
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("month");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.name))
  );

  // Add zoom level state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const [ganttStyle, setGanttStyle] = useState<GanttStyle>(defaultGanttStyle);

  // Add groupBy state
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");

  // クリティカルパス計算
  const calculateCriticalPath = useCallback((updatedTasks: Task[]): Task[] => {
    const DAY = 24 * 60 * 60 * 1000;
    const taskMap = new Map(
      updatedTasks.map((task) => [
        task.id,
        { ...task, isOnCriticalPath: false },
      ])
    );

    // 依存種別とラグから、後続タスクの最早開始の下限を算出する
    const impliedStart = (
      predStart: number,
      predFinish: number,
      successorDuration: number,
      type: DependencyType,
      lag: number
    ): number => {
      const lagMs = lag * DAY;
      const durMs = successorDuration * DAY;
      switch (type) {
        case "SS":
          return predStart + lagMs;
        case "FF":
          return predFinish + lagMs - durMs;
        case "SF":
          return predStart + lagMs - durMs;
        case "FS":
        default:
          return predFinish + lagMs;
      }
    };

    // 各タスクの最早開始時刻（メモ化）
    const earliestStartCache = new Map<string, number>();
    const calculateEarliestStart = (
      taskId: string,
      visited = new Set<string>()
    ): number => {
      const cached = earliestStartCache.get(taskId);
      if (cached !== undefined) return cached;
      if (visited.has(taskId)) return 0;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return 0;

      let earliestStart = task.startDate.getTime();

      for (const pred of task.predecessors) {
        const predTask = taskMap.get(pred.taskId);
        if (predTask) {
          const predStart = calculateEarliestStart(pred.taskId, visited);
          const predFinish = predStart + predTask.duration * DAY;
          earliestStart = Math.max(
            earliestStart,
            impliedStart(predStart, predFinish, task.duration, pred.type, pred.lag)
          );
        }
      }

      earliestStartCache.set(taskId, earliestStart);
      return earliestStart;
    };

    // 全タスクの最早開始を確定
    for (const task of updatedTasks) {
      calculateEarliestStart(task.id);
    }

    const criticalTasks = new Set<string>();

    const endTasks = updatedTasks.filter(
      (t) =>
        t.isMilestone ||
        !updatedTasks.some((other) =>
          other.predecessors.some((pred) => pred.taskId === t.id)
        )
    );

    const markCriticalPath = (taskId: string, visited = new Set<string>()) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return;

      criticalTasks.add(taskId);

      const taskStart = earliestStartCache.get(taskId) ?? 0;

      for (const pred of task.predecessors) {
        const predTask = taskMap.get(pred.taskId);
        if (predTask) {
          const predStart = earliestStartCache.get(pred.taskId) ?? 0;
          const predFinish = predStart + predTask.duration * DAY;
          const implied = impliedStart(
            predStart,
            predFinish,
            task.duration,
            pred.type,
            pred.lag
          );

          // この依存が後続の開始を律速している（余裕ゼロ）ならクリティカル
          if (Math.abs(implied - taskStart) < DAY) {
            markCriticalPath(pred.taskId, visited);
          }
        }
      }
    };

    for (const endTask of endTasks) {
      markCriticalPath(endTask.id);
    }

    return updatedTasks.map((task) => ({
      ...task,
      isOnCriticalPath: criticalTasks.has(task.id),
    }));
  }, []);

  // サーバーから最新タスクを取得してStateへ反映
  const refetchTasks = useCallback(async () => {
    const fresh = await getGanttTasks(wbsId);
    setTasks(calculateCriticalPath(fresh));
  }, [wbsId, calculateCriticalPath]);

  // 初期ロード
  useEffect(() => {
    refetchTasks();
    const fetchPhases = async () => {
      const phases = await getPhases(wbsId);
      setCategories(phases);
    };
    fetchPhases();
  }, [wbsId, refetchTasks]);

  // イベントハンドラ
  // タスク/マイルストーンの更新（楽観的更新 → サーバー保存 → 失敗時ロールバック）
  const handleTaskUpdate = useCallback(
    async (updatedTask: Task) => {
      const prevTasks = tasks;
      const newTasks = tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      );
      setTasks(calculateCriticalPath(newTasks));

      try {
        const dbId = Number(updatedTask.dbId ?? updatedTask.id);
        const result = updatedTask.isMilestone
          ? await updateMilestone({
              id: dbId,
              name: updatedTask.name,
              date: updatedTask.startDate,
              wbsId,
            })
          : await updateTask(wbsId, {
              id: dbId,
              taskNo: updatedTask.taskNo,
              name: updatedTask.name,
              yoteiStart: updatedTask.startDate,
              yoteiEnd: updatedTask.endDate,
              yoteiKosu: updatedTask.duration,
              status: updatedTask.status ?? "NOT_STARTED",
              assigneeId: updatedTask.assigneeId,
              phaseId: updatedTask.phaseId,
            });

        if (!result.success) {
          setTasks(calculateCriticalPath(prevTasks));
          toast({
            title: "更新に失敗しました",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        setTasks(calculateCriticalPath(prevTasks));
        toast({
          title: "更新に失敗しました",
          description: error instanceof Error ? error.message : "不明なエラー",
          variant: "destructive",
        });
      }
    },
    [tasks, calculateCriticalPath, wbsId]
  );

  // タスク追加（サーバーに作成 → 再取得）
  const handleTaskAdd = useCallback(
    async (newTask: Omit<Task, "id">) => {
      const phaseId =
        newTask.phaseId ??
        (categories[0] ? Number(categories[0].id) : undefined);
      if (!phaseId) {
        toast({
          title: "タスクを追加できません",
          description: "フェーズが存在しません",
          variant: "destructive",
        });
        return;
      }

      try {
        const result = await createTask(wbsId, {
          name: newTask.name,
          periods: [
            {
              startDate: newTask.startDate.toISOString(),
              endDate: newTask.endDate.toISOString(),
              type: "YOTEI",
              kosus: [{ kosu: newTask.duration ?? 0, type: "NORMAL" }],
            },
          ],
          status: newTask.status ?? "NOT_STARTED",
          assigneeId: newTask.assigneeId ? String(newTask.assigneeId) : undefined,
          phaseId,
        });

        if (result.success) {
          await refetchTasks();
        } else {
          toast({
            title: "タスクの追加に失敗しました",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "タスクの追加に失敗しました",
          description: error instanceof Error ? error.message : "不明なエラー",
          variant: "destructive",
        });
      }
    },
    [wbsId, categories, refetchTasks]
  );

  // タスク/マイルストーン削除（楽観的削除 → サーバー削除 → 失敗時は再取得で同期）
  const handleTaskDelete = useCallback(
    async (taskIds: string[]) => {
      const targets = tasks.filter((task) => taskIds.includes(task.id));
      const prevTasks = tasks;

      const filtered = prevTasks.filter((task) => !taskIds.includes(task.id));
      setTasks(
        calculateCriticalPath(
          filtered.map((task) => ({
            ...task,
            predecessors: task.predecessors.filter(
              (pred) => !taskIds.includes(pred.taskId)
            ),
          }))
        )
      );
      setSelectedTasks(new Set());

      try {
        const results = await Promise.all(
          targets.map((task) => {
            const dbId = Number(task.dbId ?? task.id);
            return task.isMilestone
              ? deleteMilestone(dbId, wbsId)
              : deleteTask(dbId);
          })
        );
        if (results.some((r) => !r.success)) {
          toast({
            title: "一部のタスクの削除に失敗しました",
            variant: "destructive",
          });
          await refetchTasks();
        }
      } catch (error) {
        toast({
          title: "タスクの削除に失敗しました",
          description: error instanceof Error ? error.message : "不明なエラー",
          variant: "destructive",
        });
        await refetchTasks();
      }
    },
    [tasks, calculateCriticalPath, wbsId, refetchTasks]
  );

  // タスク複製（サーバーに新規作成 → 再取得）。マイルストーンは対象外。
  const handleTaskDuplicate = useCallback(
    async (taskIds: string[]) => {
      const targets = tasks.filter(
        (task) => taskIds.includes(task.id) && !task.isMilestone
      );
      if (targets.length === 0) return;

      try {
        for (const task of targets) {
          const phaseId =
            task.phaseId ??
            (categories[0] ? Number(categories[0].id) : undefined);
          if (!phaseId) continue;
          await createTask(wbsId, {
            name: `${task.name} (Copy)`,
            periods: [
              {
                startDate: task.startDate.toISOString(),
                endDate: task.endDate.toISOString(),
                type: "YOTEI",
                kosus: [{ kosu: task.duration ?? 0, type: "NORMAL" }],
              },
            ],
            status: task.status ?? "NOT_STARTED",
            assigneeId: task.assigneeId ? String(task.assigneeId) : undefined,
            phaseId,
          });
        }
        await refetchTasks();
      } catch (error) {
        toast({
          title: "タスクの複製に失敗しました",
          description: error instanceof Error ? error.message : "不明なエラー",
          variant: "destructive",
        });
      }
    },
    [tasks, wbsId, categories, refetchTasks]
  );

  // 依存関係を追加（サーバーに作成 → 再取得）
  const handleDependencyAdd = useCallback(
    async (
      successorTaskId: string,
      predecessorTaskId: string,
      type: DependencyType,
      lag: number
    ) => {
      try {
        const result = await createGanttDependency(wbsId, {
          successorTaskId: Number(successorTaskId),
          predecessorTaskId: Number(predecessorTaskId),
          type,
          lag,
        });

        if (result.success) {
          await refetchTasks();
        } else {
          toast({
            title: "依存関係の追加に失敗しました",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "依存関係の追加に失敗しました",
          description: error instanceof Error ? error.message : "不明なエラー",
          variant: "destructive",
        });
      }
    },
    [wbsId, refetchTasks]
  );

  // 依存関係を削除（楽観的更新 → サーバー削除）
  const handleDependencyRemove = useCallback(
    async (dependencyDbId: number) => {
      const prevTasks = tasks;
      const newTasks = tasks.map((task) => ({
        ...task,
        predecessors: task.predecessors.filter(
          (pred) => pred.dbId !== dependencyDbId
        ),
      }));
      setTasks(calculateCriticalPath(newTasks));

      try {
        const result = await deleteGanttDependency(wbsId, dependencyDbId);
        if (!result.success) {
          setTasks(calculateCriticalPath(prevTasks));
          toast({
            title: "依存関係の削除に失敗しました",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        setTasks(calculateCriticalPath(prevTasks));
        toast({
          title: "依存関係の削除に失敗しました",
          description: error instanceof Error ? error.message : "不明なエラー",
          variant: "destructive",
        });
      }
    },
    [tasks, calculateCriticalPath, wbsId]
  );

  const handleTimelineScaleChange = useCallback((scale: TimelineScale) => {
    setTimelineScale(scale);
  }, []);

  const handleCategoryToggle = useCallback((categoryName: string) => {
    setExpandedCategories((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(categoryName)) {
        newExpanded.delete(categoryName);
      } else {
        newExpanded.add(categoryName);
      }
      return newExpanded;
    });
  }, []);

  const handleExpandAllCategories = useCallback(() => {
    setExpandedCategories(new Set(categories.map((c) => c.name)));
  }, [categories]);

  const handleCollapseAllCategories = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Main Navigation */}
      <div className="border-b bg-card px-2 py-2">
        <div className="flex items-center justify-between">
          <ViewSwitcher
            currentView={currentView}
            onViewChange={setCurrentView}
          />

          <div className="flex items-center gap-4">
            <QuickActions
              timelineScale={timelineScale}
              onTimelineScaleChange={handleTimelineScaleChange}
              style={ganttStyle}
              onStyleChange={setGanttStyle}
              selectedTasks={selectedTasks}
              onAddTask={() => {
                const newTask = {
                  name: "New Task",
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  duration: 5,
                  color: "#3B82F6",
                  isMilestone: false,
                  progress: 0,
                  predecessors: [],
                  level: 0,
                  isManuallyScheduled: false,
                  category: "TEST",
                  description: "",
                  resources: [],
                };
                handleTaskAdd(newTask);
              }}
              onDeleteTasks={() => handleTaskDelete(Array.from(selectedTasks))}
              onDuplicateTasks={() =>
                handleTaskDuplicate(Array.from(selectedTasks))
              }
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
            />

            {currentView === "gantt" && (
              <div className="flex items-center gap-2 border-l pl-4">
                <button
                  onClick={handleExpandAllCategories}
                  className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                >
                  全て展開
                </button>
                <button
                  onClick={handleCollapseAllCategories}
                  className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                >
                  全て閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === "gantt" ? (
          <GanttChart
            tasks={tasks}
            categories={categories}
            timelineScale={timelineScale}
            style={ganttStyle}
            expandedCategories={expandedCategories}
            zoomLevel={zoomLevel}
            groupBy={groupBy}
            onTaskUpdate={handleTaskUpdate}
            onCategoryToggle={handleCategoryToggle}
            onZoomChange={setZoomLevel}
          />
        ) : (
          <TaskTable
            tasks={tasks}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={(id) => handleTaskDelete([id])}
            onTaskAdd={handleTaskAdd}
            onTaskReorder={() => {}}
            onTaskDuplicate={(id) => handleTaskDuplicate([id])}
            onTaskIndent={() => {}}
            onDependencyAdd={handleDependencyAdd}
            onDependencyRemove={handleDependencyRemove}
          />
        )}
      </div>
    </div>
  );
}

export default GanttV3Client;
