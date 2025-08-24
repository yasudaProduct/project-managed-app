"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Task,
  TimelineScale,
  GanttStyle,
  Category,
  ProjectHeader,
  ViewSwitcher,
  QuickActions,
  GanttChart,
} from "../../../../components/ganttv3";
import {
  sampleTasks,
  sampleCategories,
  defaultGanttStyle,
} from "../../../../data/sampleData";

export default function App() {
  // Use sample data for demonstration
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);

  const [categories, setCategories] = useState<Category[]>(sampleCategories);

  const [currentView, setCurrentView] = useState<"gantt" | "table">("gantt");
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("month");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.name))
  );

  // Add zoom level state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const [ganttStyle, setGanttStyle] = useState<GanttStyle>(defaultGanttStyle);

  // Calculate project statistics
  const projectStats = useMemo(() => {
    const projectName = "ソフトウェア開発プロジェクト";
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.progress === 100).length;
    const milestones = tasks.filter((t) => t.isMilestone).length;
    const criticalTasks = tasks.filter((t) => t.isOnCriticalPath).length;
    const avgProgress =
      totalTasks > 0
        ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks)
        : 0;

    return {
      projectName,
      totalTasks,
      completedTasks,
      milestones,
      criticalTasks,
      avgProgress,
    };
  }, [tasks]);

  // Critical path calculation
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

  // Event handlers
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

  const handleTaskIndent = useCallback(
    (taskId: string) => {
      const updatedTasks = tasks.map((task) =>
        task.id === taskId
          ? { ...task, level: Math.min(task.level + 1, 3) }
          : task
      );
      setTasks(calculateCriticalPath(updatedTasks));
    },
    [tasks, calculateCriticalPath]
  );

  const handleTaskOutdent = useCallback(
    (taskId: string) => {
      const updatedTasks = tasks.map((task) =>
        task.id === taskId
          ? { ...task, level: Math.max(task.level - 1, 0) }
          : task
      );
      setTasks(calculateCriticalPath(updatedTasks));
    },
    [tasks, calculateCriticalPath]
  );

  const handleCategoryUpdate = useCallback((updatedCategory: Category) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat))
    );
  }, []);

  const handleCategoryAdd = useCallback((newCategory: Omit<Category, "id">) => {
    const category: Category = {
      ...newCategory,
      id: Date.now().toString(),
    };
    setCategories((prev) => [...prev, category]);
    // Expand new categories by default
    setExpandedCategories((prev) => new Set([...prev, category.name]));
  }, []);

  // Category removal handler
  const handleCategoryDelete = useCallback(
    (categoryToDelete: Category) => {
      // Find a default category to move tasks to (first available category)
      const remainingCategories = categories.filter(
        (cat) => cat.id !== categoryToDelete.id
      );
      const defaultCategory =
        remainingCategories.length > 0
          ? remainingCategories[0].name
          : "Uncategorized";

      // Move all tasks from deleted category to default category
      const updatedTasks = tasks.map((task) =>
        task.category === categoryToDelete.name
          ? { ...task, category: defaultCategory }
          : task
      );

      // Remove category from list
      setCategories(remainingCategories);

      // Remove from expanded categories
      setExpandedCategories((prev) => {
        const newExpanded = new Set(prev);
        newExpanded.delete(categoryToDelete.name);
        return newExpanded;
      });

      // Update tasks
      setTasks(calculateCriticalPath(updatedTasks));
    },
    [categories, tasks, calculateCriticalPath]
  );

  const handleTaskMove = useCallback(
    (taskId: string, newCategory: string) => {
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, category: newCategory } : task
      );
      setTasks(calculateCriticalPath(updatedTasks));
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
    <div className="h-screen bg-background flex flex-col">
      {/* Project Header */}
      <ProjectHeader
        projectStats={projectStats}
        onExport={() => console.log("Export")}
        onImport={() => console.log("Import")}
      />

      {/* Main Navigation */}
      <div className="border-b bg-card px-6 py-3">
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
                  category: "R&D and Preparation",
                  description: "",
                  resources: [],
                };
                handleTaskAdd(newTask);
              }}
              onDeleteTasks={() => handleTaskDelete(Array.from(selectedTasks))}
              onDuplicateTasks={() =>
                handleTaskDuplicate(Array.from(selectedTasks))
              }
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

      {/* Status Bar */}
      <div className="border-t bg-muted/30 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            <span>{projectStats.totalTasks} tasks</span>
            <span>{projectStats.completedTasks} completed</span>
            <span>{projectStats.milestones} milestones</span>
            <span>{projectStats.criticalTasks} critical</span>
            <span>{projectStats.avgProgress}% average progress</span>
          </div>
          <span>Auto-saved • Ready for export</span>
        </div>
      </div>
    </div>
  );
}
