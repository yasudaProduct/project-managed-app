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
import { getGanttTasks, getPhases } from "@/app/wbs/[id]/ganttv3/action";

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

  useEffect(() => {
    const fetchTasks = async () => {
      const tasks = await getGanttTasks(wbsId);
      setTasks(tasks);
    };
    const fetchPhases = async () => {
      const phases = await getPhases(wbsId);
      setCategories(phases);
    };
    fetchTasks();
    fetchPhases();
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

  const handleTaskAdd = useCallback(
    (newTask: Omit<Task, "id">) => {
      const task: Task = {
        ...newTask,
        id: Date.now().toString(),
        isOnCriticalPath: false,
      };
      setTasks((prev) => calculateCriticalPath([...prev, task]));
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
        id: Date.now().toString() + Math.random(),
        name: `${task.name} (Copy)`,
        predecessors: [],
        isOnCriticalPath: false,
      }));
      setTasks((prev) => calculateCriticalPath([...prev, ...clonedTasks]));
    },
    [tasks, calculateCriticalPath]
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
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Table view is temporarily unavailable</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GanttV3Client;
