"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Task,
  TimelineScale,
  GanttStyle,
  Category,
  ViewSwitcher,
  QuickActions,
  GanttChart,
  GroupBy,
  ColorMode,
  TaskStatus,
  TaskFormModal,
  NewTaskInput,
  TaskDetailSidebar,
} from "@/components/ganttv3";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import {
  getGanttTasks as getGanttTasks,
  getPhases,
  getGanttAssignees,
  createGanttTask,
  deleteGanttTask,
} from "./action";

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

// ステータス→タスクバー色（action.ts の convertTask と揃える）
const statusToColor = (status?: TaskStatus): string => {
  switch (status) {
    case "COMPLETED":
      return "green";
    case "IN_PROGRESS":
      return "blue";
    case "ON_HOLD":
      return "yellow";
    default:
      return "gray";
  }
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [currentView, setCurrentView] = useState<"gantt" | "table">("gantt");
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("month");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const params = useParams();
  const wbsId = Number(params.id);

  // 追加された機能用の状態
  const [isEditMode, setIsEditMode] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>("phase");
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(
    null
  );
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>(
    []
  );
  const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const newTaskCounter = useRef(0);

  useEffect(() => {
    const fetchTasks = async () => {
      const tasks = await getGanttTasks(wbsId);
      setTasks(tasks);
    };
    const fetchPhases = async () => {
      const phases = await getPhases(wbsId);
      setCategories(phases);
      // 初期表示ではフェーズを展開する
      setExpandedCategories(new Set(phases.map((p) => p.name)));
    };
    const fetchAssignees = async () => {
      const assignees = await getGanttAssignees(wbsId);
      setAssignees(assignees);
    };
    fetchTasks();
    fetchPhases();
    fetchAssignees();
  }, [wbsId]);

  // Add zoom level state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const [ganttStyle, setGanttStyle] = useState<GanttStyle>(defaultGanttStyle);

  // Add groupBy state
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");

  // クリティカルパス計算
  const calculateCriticalPath = useCallback((updatedTasks: Task[]): Task[] => {
    const taskMap = new Map(
      updatedTasks.map((task) => [
        task.id,
        { ...task, isOnCriticalPath: false },
      ])
    );

    const calculateEarliestTimes = (
      taskId: string,
      visited = new Set<string>()
    ): number => {
      if (visited.has(taskId)) return 0;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return 0;

      let earliestStart = task.startDate.getTime();

      for (const pred of task.predecessors) {
        const predTask = taskMap.get(pred.taskId);
        if (predTask) {
          const predFinish =
            calculateEarliestTimes(pred.taskId, visited) +
            predTask.duration * 24 * 60 * 60 * 1000;
          earliestStart = Math.max(earliestStart, predFinish);
        }
      }

      return earliestStart;
    };

    const taskDurations = new Map<string, number>();
    for (const task of updatedTasks) {
      const earliestFinish =
        calculateEarliestTimes(task.id) + task.duration * 24 * 60 * 60 * 1000;
      taskDurations.set(task.id, earliestFinish);
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

      for (const pred of task.predecessors) {
        const predTask = taskMap.get(pred.taskId);
        if (predTask) {
          const predFinish = taskDurations.get(pred.taskId) || 0;
          const taskStart = taskDurations.get(taskId) || 0;

          if (
            Math.abs(
              predFinish - taskStart + task.duration * 24 * 60 * 60 * 1000
            ) <
            24 * 60 * 60 * 1000
          ) {
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

  // イベントハンドラ
  const handleTaskUpdate = useCallback(
    (updatedTask: Task) => {
      const newTasks = tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      );
      setTasks(calculateCriticalPath(newTasks));
    },
    [tasks, calculateCriticalPath]
  );

  // タスクモーダルから追加（ローカル状態に反映。DB反映は保存時）
  const handleAddTaskFromModal = useCallback(
    (input: NewTaskInput) => {
      const task: Task = {
        id: `new-${newTaskCounter.current++}`,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        duration: input.yoteiKosu,
        color: statusToColor(input.status),
        isMilestone: false,
        progress: 0,
        predecessors: [],
        level: 0,
        isManuallyScheduled: true,
        category: input.phaseName,
        assignee: input.assigneeName,
        status: input.status,
        yoteiKosu: input.yoteiKosu,
        isNew: true,
        phaseId: input.phaseId,
        assigneeId: input.assigneeId,
      };
      setTasks((prev) => calculateCriticalPath([...prev, task]));
      // 追加先フェーズを展開して見えるようにする
      setExpandedCategories((prev) => new Set([...prev, input.phaseName]));
    },
    [calculateCriticalPath]
  );

  // 編集モードでの単一タスク削除（実績データは保持したままDB反映は保存時）
  const handleDeleteTask = useCallback(
    (task: Task) => {
      if (!task.isNew) {
        setDeletedTaskIds((prev) => new Set(prev).add(task.id));
      }
      setTasks((prev) =>
        calculateCriticalPath(prev.filter((t) => t.id !== task.id))
      );
      setSelectedTaskDetail((prev) => (prev?.id === task.id ? null : prev));
    },
    [calculateCriticalPath]
  );

  const handleTaskDelete = useCallback(
    (taskIds: string[]) => {
      setTasks((prev) => {
        const filtered = prev.filter((task) => !taskIds.includes(task.id));
        return calculateCriticalPath(
          filtered.map((task) => ({
            ...task,
            predecessors: task.predecessors.filter(
              (pred) => !taskIds.includes(pred.taskId)
            ),
          }))
        );
      });
      setSelectedTasks(new Set());
    },
    [calculateCriticalPath]
  );

  const handleTaskDuplicate = useCallback(
    (taskIds: string[]) => {
      const tasksToClone = tasks.filter((task) => taskIds.includes(task.id));
      const clonedTasks = tasksToClone.map((task) => ({
        ...task,
        id: `new-${newTaskCounter.current++}`,
        name: `${task.name} (Copy)`,
        predecessors: [],
        isOnCriticalPath: false,
      }));
      setTasks((prev) => calculateCriticalPath([...prev, ...clonedTasks]));
    },
    [tasks, calculateCriticalPath]
  );

  // 保存：新規タスクの作成と削除タスクのDB反映を行う
  const hasUnsavedChanges =
    tasks.some((t) => t.isNew) || deletedTaskIds.size > 0;

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // 新規タスクをDBに登録
      const newTasks = tasks.filter((t) => t.isNew);
      for (const t of newTasks) {
        if (t.phaseId == null) {
          throw new Error(`「${t.name}」のフェーズが未設定です`);
        }
        const res = await createGanttTask(wbsId, {
          name: t.name,
          phaseId: t.phaseId,
          assigneeId: t.assigneeId,
          yoteiStartDate: t.startDate.toISOString(),
          yoteiEndDate: t.endDate.toISOString(),
          yoteiKosu: t.yoteiKosu ?? 0,
          status: t.status ?? "NOT_STARTED",
        });
        if (!res.success) {
          throw new Error(res.error || "タスクの作成に失敗しました");
        }
      }

      // 削除タスクをDBから削除（紐づく実績データは保持される）
      for (const id of Array.from(deletedTaskIds)) {
        const res = await deleteGanttTask(Number(id));
        if (!res.success) {
          throw new Error(res.error || "タスクの削除に失敗しました");
        }
      }

      // 最新のタスクを再取得
      const reloaded = await getGanttTasks(wbsId);
      setTasks(calculateCriticalPath(reloaded));
      setDeletedTaskIds(new Set());
      setSelectedTaskDetail(null);
      toast({ title: "保存しました" });
    } catch (error) {
      toast({
        title: "保存に失敗しました",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [tasks, deletedTaskIds, wbsId, calculateCriticalPath]);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

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
    <TooltipProvider delayDuration={200}>
      <div className="h-screen bg-background flex flex-col">
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
                onAddTask={() => setIsTaskModalOpen(true)}
                onDeleteTasks={() => handleTaskDelete(Array.from(selectedTasks))}
                onDuplicateTasks={() =>
                  handleTaskDuplicate(Array.from(selectedTasks))
                }
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                colorMode={colorMode}
                onColorModeChange={setColorMode}
                isEditMode={isEditMode}
                onToggleEditMode={handleToggleEditMode}
                onSave={handleSave}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
              />

              {currentView === "gantt" && (
                <div className="flex items-center gap-1 border-l pl-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleExpandAllCategories}
                      >
                        <ChevronsUpDown className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>全て展開</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCollapseAllCategories}
                      >
                        <ChevronsDownUp className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>全て閉じる</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 min-w-0 overflow-hidden">
            {currentView === "gantt" ? (
              <GanttChart
                tasks={tasks}
                categories={categories}
                timelineScale={timelineScale}
                style={ganttStyle}
                expandedCategories={expandedCategories}
                zoomLevel={zoomLevel}
                groupBy={groupBy}
                colorMode={colorMode}
                isEditMode={isEditMode}
                onTaskUpdate={handleTaskUpdate}
                onCategoryToggle={handleCategoryToggle}
                onZoomChange={setZoomLevel}
                onTaskClick={setSelectedTaskDetail}
                onDeleteTask={handleDeleteTask}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Table view is temporarily unavailable</p>
              </div>
            )}
          </div>

          {selectedTaskDetail && (
            <TaskDetailSidebar
              task={selectedTaskDetail}
              onClose={() => setSelectedTaskDetail(null)}
            />
          )}
        </div>
      </div>

      {/* タスク追加モーダル */}
      <TaskFormModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        categories={categories}
        assignees={assignees}
        onSubmit={handleAddTaskFromModal}
      />
    </TooltipProvider>
  );
}
