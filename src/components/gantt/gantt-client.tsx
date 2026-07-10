"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  TimelineScale,
  GanttStyle,
  GroupBy,
  TaskSortBy,
} from "@/components/gantt/gantt";
import { ViewSwitcher } from "@/components/gantt/view-switcher";
import { QuickActions } from "@/components/gantt/quick-actions";
import { GanttChart } from "@/components/gantt/gantt-chart";
import { TaskTable, TaskTableColumn } from "@/components/gantt/task-table";
import { DependencyEditModal } from "@/components/gantt/dependency-edit-modal";
import { TaskFilterControl } from "@/components/gantt/task-filter-control";
import { TaskDetailSidebar } from "@/components/gantt/task-detail-sidebar";
import {
  type TaskFilter,
  EMPTY_TASK_FILTER,
  filterTasks,
} from "@/components/gantt/utils/taskFilter";
import { TaskModal, type TaskFormValues } from "@/components/wbs/task-modal";
import { HoursUnit, HOURS_UNIT_LABELS } from "@/utils/hours-converter";
import { getGanttTasksTsv } from "@/app/wbs/[id]/gantt/export-actions";
import { groupTasksByType } from "@/components/gantt/utils/groupTasks";
import { useGanttData } from "@/components/gantt/hooks/useGanttData";
import { useGanttMutations } from "@/components/gantt/hooks/useGanttMutations";
import { useGanttDraftEditing } from "@/components/gantt/hooks/useGanttDraftEditing";
import { toWbsTask } from "@/components/gantt/utils/taskMapper";
import { fromDateInputValue } from "@/components/gantt/utils/dateInput";
import { createTaskColumns } from "@/components/gantt/taskTableColumns";
import { tsvBlob, downloadBlob } from "@/components/gantt/utils/downloadBlob";
import { toErrorMessage } from "@/components/gantt/utils/toErrorMessage";
import { toast } from "@/hooks/use-toast";

const defaultGanttStyle: GanttStyle = {
  theme: "modern",
  showGrid: true,
  showProgress: true,
  showActual: false,
  showForecast: false,
  colorMode: "phase",
  showDependencies: true,
  showCriticalPath: true,
  showWeekends: true,
  showTodayLine: true,
  showProgressLine: false,
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
    progressLine: "#DB2777",
  },
};

interface GanttClientProps {
  wbsId: number;
}

export function GanttClient({ wbsId }: GanttClientProps) {
  const { tasks, setTasks, categories, assignees, refetchTasks, isLoading } =
    useGanttData(wbsId); // タスクデータ

  const [currentView, setCurrentView] = useState<"gantt" | "table">("gantt"); // チャート/テーブル表示
  const [timelineScale, setTimelineScale] = useState<TimelineScale>("day"); // タイムラインのスケール
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set()); // 選択されたタスク
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  ); // 展開されたカテゴリ
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // ズームレベル
  const [ganttStyle, setGanttStyle] = useState<GanttStyle>(defaultGanttStyle); // グラントチャートのスタイル
  const [groupBy, setGroupBy] = useState<GroupBy>("phase"); // グループ化の基準
  const [sortBy, setSortBy] = useState<TaskSortBy>("taskNo"); // グループ内のタスクの並び順
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_TASK_FILTER); // タスク絞り込み条件

  // モーダル制御（編集対象はIDで保持し、最新の tasks から都度引き直す）
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null);
  // バークリックで開くタスク詳細サイドバーの対象ID
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  // タスク追加モーダル（編集モード中のみ開ける。追加内容はドラフトへ反映し、保存でDBへ反映）
  const [isAddingTask, setIsAddingTask] = useState(false);

  // テーブルの工数表示単位（時間 / 人日）
  const [kosuUnit, setKosuUnit] = useState<HoursUnit>("hours"); // 工数表示単位

  // チャート編集モード（ドラフト方式）。確定タスクへの即時反映は useGanttMutations 側。
  const {
    editMode,
    isSavingEdit,
    chartTasks,
    handleEnterEditMode,
    handleCancelEdit,
    handleDraftTaskUpdate,
    handleDraftTaskAdd,
    handleDraftTaskDelete,
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

  // タスク追加モーダルの「作成」→ サーバーへは送らずドラフトへ追加する（保存時にDB反映）
  const handleCreateDraftTask = useCallback(
    (values: TaskFormValues) => {
      const phase = categories.find((c) => c.id === String(values.phaseId));
      const assigneeId = Number(values.assigneeId);
      // フォームの日付は "YYYY/MM/DD"（タイムゾーン情報なし）のため、
      // ブラウザのローカルTZ解釈に依存しないよう UTC 0時の Date へ正規化する
      const startDate = fromDateInputValue(
        values.yoteiStartDate.replace(/\//g, "-"),
      );
      const endDate = fromDateInputValue(values.yoteiEndDate.replace(/\//g, "-"));
      if (!startDate || !endDate) return;
      handleDraftTaskAdd({
        name: values.name,
        startDate,
        endDate,
        duration: values.yoteiKosu,
        color: phase?.color ?? "#3B82F6",
        isMilestone: false,
        progress: values.progressRate ?? 0,
        progressRate: values.progressRate,
        predecessors: [],
        level: 0,
        isManuallyScheduled: true,
        category: phase?.name,
        assignee: assignees.find((a) => a.id === assigneeId)?.name,
        status: values.status,
        assigneeId,
        phaseId: values.phaseId,
      });
      setIsAddingTask(false);
    },
    [categories, assignees, handleDraftTaskAdd],
  );

  // カテゴリの展開/折りたたみ
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

  // 全てのカテゴリを展開
  const handleExpandAllCategories = useCallback(() => {
    setExpandedCategories(new Set(groupNames));
  }, [groupNames]);

  // 全てのカテゴリを折りたたみ
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
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // 絞り込み後のタスク（チャートは編集ドラフト chartTasks、テーブルは確定 tasks を対象）
  const filteredChartTasks = useMemo(
    () => filterTasks(chartTasks, filter),
    [chartTasks, filter],
  );
  const filteredTableTasks = useMemo(
    () => filterTasks(tasks, filter),
    [tasks, filter],
  );

  // 詳細サイドバーの対象タスク（最新 tasks から引く）
  const detailTask = useMemo(
    () => tasks.find((t) => t.id === detailTaskId) ?? null,
    [tasks, detailTaskId],
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
          {/* チャート/テーブル表示の切替 */}
          <ViewSwitcher
            currentView={currentView}
            onViewChange={setCurrentView}
            disabled={editMode}
          />

          <div className="flex items-center gap-4">
            {/* タスク絞り込み */}
            <TaskFilterControl
              filter={filter}
              onChange={setFilter}
              assignees={assignees}
            />

            {/* クイックアクション */}
            <QuickActions
              timelineScale={timelineScale}
              onTimelineScaleChange={handleTimelineScaleChange}
              style={ganttStyle}
              onStyleChange={setGanttStyle}
              selectedTasks={selectedTasks}
              onAddTask={() => setIsAddingTask(true)}
              onDeleteTasks={() => {
                if (editMode) {
                  handleDraftTaskDelete(Array.from(selectedTasks));
                  setSelectedTasks(new Set());
                } else {
                  handleTaskDelete(Array.from(selectedTasks));
                }
              }}
              onDuplicateTasks={() =>
                handleTaskDuplicate(Array.from(selectedTasks))
              }
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              onExportTsv={handleExportTsv}
              addDisabled={!editMode || isSavingEdit || isLoading}
              duplicateDisabled={editMode}
              deleteDisabled={isSavingEdit}
            />

            {/* カテゴリの展開/折りたたみ */}
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

            {/* 工数単位の切替 */}
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

      {/* チャート/テーブル表示の内容 */}
      <div className="flex-1 overflow-hidden">
        {currentView === "gantt" ? (
          <GanttChart
            tasks={filteredChartTasks}
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
            onTaskSelect={setDetailTaskId}
            editMode={editMode}
            onEnterEditMode={handleEnterEditMode}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onEditDependencies={handleEditDependencies}
            onDeleteTask={editMode ? (id) => handleDraftTaskDelete([id]) : undefined}
            onDependencyCreate={
              editMode ? handleDraftDependencyAdd : handleDependencyAdd
            }
            isSaving={isSavingEdit}
            isDataLoading={isLoading}
          />
        ) : (
          <TaskTable
            tasks={filteredTableTasks}
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

      {/* タスク追加モーダル（編集モードのみ開ける。追加はドラフトへ反映し、保存でDBへ反映） */}
      {isAddingTask && (
        <TaskModal
          wbsId={wbsId}
          isOpen={true}
          onClose={() => setIsAddingTask(false)}
          onCreateDraft={handleCreateDraftTask}
        />
      )}

      {/* タスク詳細サイドバー（バークリックで表示） */}
      <TaskDetailSidebar
        task={detailTask}
        open={detailTask !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTaskId(null);
        }}
      />

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
        onRemove={
          editMode ? handleDraftDependencyRemove : handleDependencyRemove
        }
        onUpdate={
          editMode ? handleDraftDependencyUpdate : handleDependencyUpdate
        }
      />
    </div>
  );
}

export default GanttClient;
