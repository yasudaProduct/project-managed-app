import { useState, useCallback, useRef } from "react";
import type { Task, DependencyType } from "../gantt";
import { updateTask } from "@/app/wbs/[id]/actions/wbs-task-actions";
import { updateMilestone } from "@/app/wbs/[id]/actions/milestone-actions";
import {
  createGanttDependency,
  deleteGanttDependency,
} from "@/app/wbs/[id]/ganttv3/dependency-actions";
import { calculateCriticalPath } from "../utils/criticalPath";
import { diffDependencies } from "../utils/diffDependencies";
import { parseDbId } from "../utils/taskId";
import { toErrorMessage } from "../utils/toErrorMessage";
import { toast } from "@/hooks/use-toast";

export type UseGanttDraftEditingParams = {
  tasks: Task[];
  wbsId: number;
  refetchTasks: () => Promise<void>;
  /** 編集モードを抜けた際に呼ばれる（依存編集モーダルのクリア等のUI副作用） */
  onExitEditMode?: () => void;
};

/**
 * チャート編集モード（保存するまでDBへ反映しないドラフト方式）を担う hook。
 *
 * 現在のタスクをドラフトへ複製し、ドラッグ/インライン編集/依存編集をドラフトに蓄積、
 * 保存時にまとめてサーバーへ反映する。確定タスクへの即時反映は useGanttMutations 側。
 */
export function useGanttDraftEditing({
  tasks,
  wbsId,
  refetchTasks,
  onExitEditMode,
}: UseGanttDraftEditingParams) {
  const [editMode, setEditMode] = useState(false);
  const [draftTasks, setDraftTasks] = useState<Task[] | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // ドラフトで新規追加した依存関係に振る一時ID（負値）
  const tempDepIdRef = useRef(-1);

  // チャートで表示・編集するタスク（編集中はドラフト、それ以外は確定タスク）
  const chartTasks = editMode && draftTasks ? draftTasks : tasks;

  // 編集モードに入る（現在のタスクをドラフトへ複製）
  const handleEnterEditMode = useCallback(() => {
    setDraftTasks(
      tasks.map((t) => ({
        ...t,
        predecessors: t.predecessors.map((p) => ({ ...p })),
      })),
    );
    setEditMode(true);
  }, [tasks]);

  // 編集を破棄して編集モードを抜ける
  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    setDraftTasks(null);
    onExitEditMode?.();
  }, [onExitEditMode]);

  // ドラフトのタスクを更新（ドラッグ／インライン編集／依存関係編集の共通反映）
  const handleDraftTaskUpdate = useCallback((updatedTask: Task) => {
    setDraftTasks((prev) =>
      prev
        ? calculateCriticalPath(
            prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
          )
        : prev,
    );
  }, []);

  // ドラフトへの依存関係の追加（一時IDを付与）
  const handleDraftDependencyAdd = useCallback(
    (
      successorTaskId: string,
      predecessorTaskId: string,
      type: DependencyType,
      lag: number,
    ) => {
      const tempId = tempDepIdRef.current;
      tempDepIdRef.current -= 1;
      setDraftTasks((prev) =>
        prev
          ? calculateCriticalPath(
              prev.map((t) =>
                t.id === successorTaskId
                  ? {
                      ...t,
                      predecessors: [
                        ...t.predecessors,
                        { taskId: predecessorTaskId, type, lag, dbId: tempId },
                      ],
                    }
                  : t,
              ),
            )
          : prev,
      );
    },
    [],
  );

  // ドラフトの依存関係を削除
  const handleDraftDependencyRemove = useCallback((dependencyDbId: number) => {
    setDraftTasks((prev) =>
      prev
        ? calculateCriticalPath(
            prev.map((t) => ({
              ...t,
              predecessors: t.predecessors.filter(
                (p) => p.dbId !== dependencyDbId,
              ),
            })),
          )
        : prev,
    );
  }, []);

  // ドラフトの依存関係を更新
  const handleDraftDependencyUpdate = useCallback(
    (
      dependencyDbId: number,
      successorTaskId: string,
      predecessorTaskId: string,
      type: DependencyType,
      lag: number,
    ) => {
      setDraftTasks((prev) =>
        prev
          ? calculateCriticalPath(
              prev.map((t) => ({
                ...t,
                predecessors: t.predecessors.map((p) =>
                  p.dbId === dependencyDbId
                    ? {
                        taskId: predecessorTaskId,
                        type,
                        lag,
                        dbId: dependencyDbId,
                      }
                    : p,
                ),
              })),
            )
          : prev,
      );
    },
    [],
  );

  // 編集内容をまとめて保存（日付・工数 → タスク更新、依存関係 → 差分で作成/削除）
  const handleSaveEdit = useCallback(async () => {
    if (!draftTasks) {
      setEditMode(false);
      return;
    }
    setIsSavingEdit(true);
    try {
      const origById = new Map(tasks.map((t) => [t.id, t]));

      // 1) 予定開始日・終了日・工数（マイルストーンは日付）の変更を保存
      for (const dt of draftTasks) {
        const orig = origById.get(dt.id);
        if (!orig) continue;
        const dateChanged =
          dt.startDate.getTime() !== orig.startDate.getTime() ||
          dt.endDate.getTime() !== orig.endDate.getTime();
        const kosuChanged = dt.duration !== orig.duration;
        const assigneeChanged = dt.assigneeId !== orig.assigneeId;
        const progressChanged = dt.progressRate !== orig.progressRate;
        if (!dateChanged && !kosuChanged && !assigneeChanged && !progressChanged)
          continue;

        const dbId = dt.dbId ?? parseDbId(dt.id);
        if (dt.isMilestone) {
          const res = await updateMilestone({
            id: dbId,
            name: dt.name,
            date: dt.startDate,
            wbsId,
          });
          if (!res.success) {
            throw new Error(res.error ?? `「${dt.name}」の保存に失敗しました`);
          }
        } else {
          const res = await updateTask(wbsId, {
            id: dbId,
            taskNo: dt.taskNo,
            name: dt.name,
            yoteiStart: dt.startDate,
            yoteiEnd: dt.endDate,
            yoteiKosu: dt.duration,
            status: dt.status ?? "NOT_STARTED",
            assigneeId: dt.assigneeId,
            phaseId: dt.phaseId,
            progressRate: dt.progressRate,
          });
          if (!res.success) {
            throw new Error(res.error ?? `「${dt.name}」の保存に失敗しました`);
          }
        }
      }

      // 2) 依存関係の差分を保存
      const { deletes, creates } = diffDependencies(tasks, draftTasks);
      for (const dbId of deletes) {
        const res = await deleteGanttDependency(wbsId, dbId);
        if (!res.success) {
          throw new Error(res.error ?? "依存関係の削除に失敗しました");
        }
      }
      for (const input of creates) {
        const res = await createGanttDependency(wbsId, input);
        if (!res.success) {
          throw new Error(res.error ?? "依存関係の作成に失敗しました");
        }
      }

      // 全て成功したときのみ編集モードを終了しドラフトを破棄する
      toast({ title: "編集内容を保存しました" });
      setEditMode(false);
      setDraftTasks(null);
      onExitEditMode?.();
      await refetchTasks();
    } catch (error) {
      // 失敗時はドラフト・編集モードを保持し、ユーザーが修正して再試行できるようにする
      toast({
        title: "保存に失敗しました",
        description: toErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  }, [draftTasks, tasks, wbsId, refetchTasks, onExitEditMode]);

  return {
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
  };
}
