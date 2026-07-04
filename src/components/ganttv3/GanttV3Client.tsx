"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  TimelineScale,
  GanttStyle,
  GroupBy,
  TaskSortBy,
} from "@/components/ganttv3/gantt";
import { ViewSwitcher } from "@/components/ganttv3/ViewSwitcher";
import { QuickActions } from "@/components/ganttv3/QuickActions";
import { GanttChart } from "@/components/ganttv3/GanttChart";
import { TaskTable, TaskTableColumn } from "@/components/ganttv3/TaskTable";
import { DependencyEditModal } from "@/components/ganttv3/DependencyEditModal";
import { TaskModal } from "@/components/wbs/task-modal";
import { HoursUnit, HOURS_UNIT_LABELS } from "@/utils/hours-converter";
import { getGanttTasksTsv } from "@/app/wbs/[id]/ganttv3/export-actions";
import { groupTasksByType } from "@/components/ganttv3/utils/groupTasks";
import { useGanttData } from "@/components/ganttv3/hooks/useGanttData";
import { useGanttMutations } from "@/components/ganttv3/hooks/useGanttMutations";
import { useGanttDraftEditing } from "@/components/ganttv3/hooks/useGanttDraftEditing";
import { toWbsTask } from "@/components/ganttv3/utils/taskMapper";
import { createTaskColumns } from "@/components/ganttv3/taskTableColumns";
import { tsvBlob, downloadBlob } from "@/components/ganttv3/utils/downloadBlob";
import { toErrorMessage } from "@/components/ganttv3/utils/toErrorMessage";
import { toast } from "@/hooks/use-toast";

const defaultGanttStyle: GanttStyle = {
  theme: "modern",
  showGrid: true,
  showProgress: true,
  showActual: false,
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
  const { tasks, setTasks, categories, assignees, refetchTasks, isLoading } =
    useGanttData(wbsId);

  const [currentView, setCurrentView] = useState<"gantt" | "table">("gantt");
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("month");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Add zoom level state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const [ganttStyle, setGanttStyle] = useState<GanttStyle>(defaultGanttStyle);

  // Add groupBy state
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");

  // グループ内のタスクの並び順
  const [sortBy, setSortBy] = useState<TaskSortBy>("taskNo");

  // モーダル制御（編集対象はIDで保持し、最新の tasks から都度引き直す）
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null);

  // テーブルの工数表示単位（時間 / 人日）
  const [kosuUnit, setKosuUnit] = useState<HoursUnit>("hours");

  // チャート編集モード（ドラフト方式）。確定タスクへの即時反映は useGanttMutations 側。
  const {
    editMode,
    isSavingEdit,
    chartTasks,
    handleEnterEditMode,
    handleCancelEdit,
    handleDraftTaskUpdate,
    handleDraftDependencyAdd,
    handleDraftDependencyRemove,
    handleDraftDependencyUpdate,
    handleSaveEdit,
  } = useGanttDraftEditing({
    tasks,
    wbsId,
    refetchTasks,
    onExitEditMode: () => setDependencyTaskId(null),
  });

  // 現在のグルーピングにおける実グループ名。チャートは chartTasks を描画するため、
  // 編集モード中のドラフトで増減したグループも展開対象に含める。
  const groupNames = useMemo(
    () => groupTasksByType(chartTasks, groupBy, categories).map((g) => g.name),
    [chartTasks, groupBy, categories],
  );
  // グループ名の集合（順不同で同一性を判定するためのキー）
  const groupNamesKey = useMemo(
    () => [...groupNames].sort().join("\u001f"),
    [groupNames],
  );

  // グルーピングの切替やデータ初回ロードでグループ名の集合が変わったら、全グループを展開状態にする
  useEffect(() => {
    setExpandedCategories(new Set(groupNames));
    // groupNames は groupNamesKey が変わった時のみ実質変化するため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupNamesKey]);

  // 確定タスク/依存関係のサーバー反映（楽観的更新＋ロールバック）
  const {
    handleTaskUpdate,
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDuplicate,
    handleDependencyAdd,
    handleDependencyRemove,
    handleDependencyUpdate,
  } = useGanttMutations({
    wbsId,
    tasks,
    setTasks,
    categories,
    refetchTasks,
    onAfterDelete: () => setSelectedTasks(new Set()),
  });

  const handleTimelineScaleChange = useCallback((scale: TimelineScale) => {
    setTimelineScale(scale);
  }, []);

  // タスク一覧をTSVで出力（基準/予定/実績/進捗率/依存関係を含む）
  const handleExportTsv = useCallback(async () => {
    try {
      const tsv = await getGanttTasksTsv(wbsId);
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(tsvBlob(tsv), `wbs-tasks-${date}.tsv`);
    } catch (error) {
      toast({
        title: "TSVの出力に失敗しました",
        description: toErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [wbsId]);

  // 編集モードで依存関係編集モーダルを開く
  const handleEditDependencies = useCallback((taskId: string) => {
    setDependencyTaskId(taskId);
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
    setExpandedCategories(new Set(groupNames));
  }, [groupNames]);

  const handleCollapseAllCategories = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  // 編集・依存モーダルの対象タスク（最新stateから引く）
  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) ?? null,
    [tasks, editingTaskId],
  );
  const dependencyTask = useMemo(
    () => chartTasks.find((t) => t.id === dependencyTaskId) ?? null,
    [chartTasks, dependencyTaskId],
  );

  // 先行タスク名の引き当て用（O(1) ルックアップ）
  const taskById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks],
  );

  // テーブルの列定義（組み立ては taskTableColumns ファクトリへ委譲）
  const columns = useMemo<TaskTableColumn[]>(
    () =>
      createTaskColumns({
        taskById,
        kosuUnit,
        onEditTask: setEditingTaskId,
        onEditDependencies: setDependencyTaskId,
        onDuplicate: handleTaskDuplicate,
        onDelete: handleTaskDelete,
      }),
    [taskById, kosuUnit, handleTaskDuplicate, handleTaskDelete],
  );

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Main Navigation */}
      <div className="border-b bg-card px-2 py-2">
        <div className="flex items-center justify-between">
          <ViewSwitcher
            currentView={currentView}
            onViewChange={setCurrentView}
            disabled={editMode}
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
              sortBy={sortBy}
              onSortByChange={setSortBy}
              onExportTsv={handleExportTsv}
              taskOpsDisabled={editMode}
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

            {currentView === "table" && (
              <div className="flex items-center gap-2 border-l pl-4">
                <span className="text-xs text-muted-foreground">工数単位</span>
                <div className="flex rounded-md border overflow-hidden">
                  {(["hours", "days"] as const).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setKosuUnit(unit)}
                      className={`px-3 py-1 text-xs transition-colors ${
                        kosuUnit === unit
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {HOURS_UNIT_LABELS[unit]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === "gantt" ? (
          <GanttChart
            tasks={chartTasks}
            categories={categories}
            timelineScale={timelineScale}
            style={ganttStyle}
            expandedCategories={expandedCategories}
            zoomLevel={zoomLevel}
            groupBy={groupBy}
            sortBy={sortBy}
            assignees={assignees}
            onTaskUpdate={editMode ? handleDraftTaskUpdate : handleTaskUpdate}
            onCategoryToggle={handleCategoryToggle}
            onZoomChange={setZoomLevel}
            editMode={editMode}
            onEnterEditMode={handleEnterEditMode}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onEditDependencies={handleEditDependencies}
            isSaving={isSavingEdit}
            isDataLoading={isLoading}
          />
        ) : (
          <TaskTable
            tasks={tasks}
            columns={columns}
            rowHeight={48}
            headerHeight={44}
            selectable
            selectedTaskIds={selectedTasks}
            onSelectionChange={setSelectedTasks}
            onRowActivate={(task) => {
              if (!task.isMilestone) setEditingTaskId(task.id);
            }}
            getRowClassName={(task) =>
              task.isOnCriticalPath ? "border-l-4 border-l-red-500" : ""
            }
          />
        )}
      </div>

      {/* タスク編集モーダル（マイルストーンは対象外） */}
      {editingTask && !editingTask.isMilestone && (
        <TaskModal
          wbsId={wbsId}
          task={toWbsTask(editingTask)}
          isOpen={true}
          onClose={() => {
            setEditingTaskId(null);
            // モーダル内で更新された場合に備えて再取得。ただし編集モード中は
            // ドラフトが陳腐化する（保存時に古い値で上書きされる）ため抑止する。
            if (!editMode) refetchTasks();
          }}
        />
      )}

      {/* 依存関係編集モーダル */}
      <DependencyEditModal
        open={dependencyTask !== null}
        onOpenChange={(open) => {
          if (!open) setDependencyTaskId(null);
        }}
        task={dependencyTask}
        candidateTasks={chartTasks.filter(
          (t) => !t.isMilestone && t.id !== dependencyTaskId,
        )}
        onAdd={editMode ? handleDraftDependencyAdd : handleDependencyAdd}
        onRemove={editMode ? handleDraftDependencyRemove : handleDependencyRemove}
        onUpdate={editMode ? handleDraftDependencyUpdate : handleDependencyUpdate}
      />
    </div>
  );
}

export default GanttV3Client;
