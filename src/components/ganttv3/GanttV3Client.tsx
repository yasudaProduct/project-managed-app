"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  TimelineScale,
  GanttStyle,
  ViewSwitcher,
  QuickActions,
  GanttChart,
  GroupBy,
  TaskSortBy,
} from "@/components/ganttv3";
import { TaskTable, TaskTableColumn } from "@/components/ganttv3/TaskTable";
import { DependencyEditModal } from "@/components/ganttv3/DependencyEditModal";
import { TaskModal } from "@/components/wbs/task-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/date-util";
import { getTaskStatusName } from "@/utils/utils";
import {
  HoursUnit,
  HOURS_UNIT_LABELS,
  formatHoursWithUnit,
} from "@/utils/hours-converter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Flag,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { getGanttTasksTsv } from "@/app/wbs/[id]/ganttv3/export-actions";
import { groupTasksByType } from "@/components/ganttv3/utils/groupTasks";
import { useGanttData } from "@/components/ganttv3/hooks/useGanttData";
import { useGanttMutations } from "@/components/ganttv3/hooks/useGanttMutations";
import { useGanttDraftEditing } from "@/components/ganttv3/hooks/useGanttDraftEditing";
import { toWbsTask } from "@/components/ganttv3/utils/taskMapper";
import { tsvBlob, downloadBlob } from "@/components/ganttv3/utils/downloadBlob";
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
  const { tasks, setTasks, categories, assignees, refetchTasks } =
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

  // 現在のグルーピングにおける実グループ名（GanttChart の groupTasksByType と同一ロジック）
  const groupNames = useMemo(
    () => groupTasksByType(tasks, groupBy, categories).map((g) => g.name),
    [tasks, groupBy, categories],
  );
  // グループ名の集合（順不同で同一性を判定するためのキー）
  const groupNamesKey = useMemo(
    () => [...groupNames].sort().join("\u001f"),
    [groupNames],
  );

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
        description: error instanceof Error ? error.message : "不明なエラー",
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

  // テーブルの列定義（ヘッダー名・幅・表示データを全てここで組み立てて渡す）
  const columns = useMemo<TaskTableColumn[]>(
    () => [
      {
        key: "name",
        header: "タスク名",
        width: 260,
        renderCell: (task) => (
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${task.level * 16}px` }}
          >
            {task.isMilestone && (
              <Flag className="w-3 h-3 shrink-0 text-muted-foreground" />
            )}
            <span className="font-medium truncate">{task.name}</span>
          </div>
        ),
      },
      {
        key: "assignee",
        header: "担当者",
        width: 120,
        renderCell: (task) => (
          <span className="text-sm">{task.assignee ?? "-"}</span>
        ),
      },
      {
        key: "phase",
        header: "フェーズ",
        width: 130,
        renderCell: (task) => (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: task.color }}
            />
            <span className="text-sm truncate">{task.category ?? "-"}</span>
          </div>
        ),
      },
      {
        key: "startDate",
        header: "開始日",
        width: 110,
        renderCell: (task) => (
          <span className="text-sm">
            {formatDate(task.startDate, "YYYY/MM/DD")}
          </span>
        ),
      },
      {
        key: "endDate",
        header: "終了日",
        width: 110,
        renderCell: (task) =>
          task.isMilestone ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            <span className="text-sm">
              {formatDate(task.endDate, "YYYY/MM/DD")}
            </span>
          ),
      },
      {
        key: "kosu",
        header: "工数",
        width: 90,
        align: "right",
        renderCell: (task) =>
          task.isMilestone ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            <span className="text-sm">
              {formatHoursWithUnit(task.duration, kosuUnit)}
            </span>
          ),
      },
      {
        key: "progress",
        header: "進捗",
        width: 70,
        align: "right",
        renderCell: (task) => <span className="text-sm">{task.progress}%</span>,
      },
      {
        key: "status",
        header: "ステータス",
        width: 110,
        renderCell: (task) =>
          task.isMilestone ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            <Badge variant="outline">
              {getTaskStatusName(task.status ?? "NOT_STARTED")}
            </Badge>
          ),
      },
      {
        key: "dependencies",
        header: "依存関係",
        width: 220,
        interactive: true,
        renderCell: (task) => (
          <div className="flex items-center gap-1 flex-wrap">
            {task.predecessors.length === 0 ? (
              <span className="text-xs text-muted-foreground">なし</span>
            ) : (
              task.predecessors.map((dep, i) => {
                const pred = tasks.find((t) => t.id === dep.taskId);
                return (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {pred?.name ?? "不明"} ({dep.type}
                    {dep.lag !== 0
                      ? `${dep.lag > 0 ? "+" : ""}${dep.lag}d`
                      : ""}
                    )
                  </Badge>
                );
              })
            )}
            {!task.isMilestone && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setDependencyTaskId(task.id)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>
        ),
      },
      {
        key: "actions",
        header: "操作",
        width: 70,
        align: "center",
        interactive: true,
        renderCell: (task) => (
          <div className="flex items-center justify-center">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">メニューを開く</span>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!task.isMilestone && (
                  <DropdownMenuItem onClick={() => setEditingTaskId(task.id)}>
                    <Pencil className="w-4 h-4" />
                    編集
                  </DropdownMenuItem>
                )}
                {!task.isMilestone && (
                  <DropdownMenuItem
                    onClick={() => setDependencyTaskId(task.id)}
                  >
                    <Link2 className="w-4 h-4" />
                    依存関係を編集
                  </DropdownMenuItem>
                )}
                {!task.isMilestone && (
                  <DropdownMenuItem
                    onClick={() => handleTaskDuplicate([task.id])}
                  >
                    <Copy className="w-4 h-4" />
                    複製
                  </DropdownMenuItem>
                )}
                {!task.isMilestone && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleTaskDelete([task.id])}
                >
                  <Trash2 className="w-4 h-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [tasks, handleTaskDuplicate, handleTaskDelete, kosuUnit],
  );

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
              sortBy={sortBy}
              onSortByChange={setSortBy}
              onExportTsv={handleExportTsv}
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
            // モーダル内で更新された場合に備えて再取得
            refetchTasks();
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
