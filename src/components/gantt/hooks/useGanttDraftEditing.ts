import { useState, useCallback, useRef } from "react";
import type { Task, DependencyType } from "../gantt";
import {
  createTask,
  updateTask,
  deleteTask,
} from "@/app/wbs/[id]/actions/wbs-task-actions";
import {
  updateMilestone,
  deleteMilestone,
} from "@/app/wbs/[id]/actions/milestone-actions";
import {
  createGanttDependency,
  deleteGanttDependency,
} from "@/app/wbs/[id]/gantt/dependency-actions";
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
  // ドラフトで新規追加したタスクに振る一時ID（dbId未設定＝未保存タスクの目印）
  const tempTaskIdRef = useRef(1);

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

  // ドラフトへタスクを新規追加する（タスクモーダルの「追加」から呼ばれる）。
  // dbId は付与しない（未保存の目印）。DBへの反映は保存時（handleSaveEdit）にまとめて行う。
  const handleDraftTaskAdd = useCallback((newTask: Omit<Task, "id">) => {
    const tempId = `new-task-${tempTaskIdRef.current}`;
    tempTaskIdRef.current += 1;
    setDraftTasks((prev) =>
      prev
        ? calculateCriticalPath([
            ...prev,
            {
              ...newTask,
              id: tempId,
              predecessors: newTask.predecessors.map((p) => ({ ...p })),
            },
          ])
        : prev,
    );
  }, []);

  // ドラフトからタスクを削除する（DBへの反映は保存時にまとめて行う）。
  // 削除対象を指す依存（predecessors）が他タスクに残らないよう併せて取り除く。
  const handleDraftTaskDelete = useCallback((taskIds: string[]) => {
    setDraftTasks((prev) =>
      prev
        ? calculateCriticalPath(
            prev
              .filter((t) => !taskIds.includes(t.id))
              .map((t) => ({
                ...t,
                predecessors: t.predecessors.filter(
                  (p) => !taskIds.includes(p.taskId),
                ),
              })),
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
      const draftIds = new Set(draftTasks.map((t) => t.id));

      // 1) ドラフトで新規追加したタスクを作成する（dbId未設定＝未保存の目印）
      const newDraftTasks = draftTasks.filter((dt) => dt.dbId === undefined);
      for (const dt of newDraftTasks) {
        if (dt.isMilestone || !dt.phaseId) {
          throw new Error(`「${dt.name}」の追加に失敗しました（フェーズが未設定です）`);
        }
        const res = await createTask(wbsId, {
          name: dt.name,
          periods: [
            {
              startDate: dt.startDate.toISOString(),
              endDate: dt.endDate.toISOString(),
              type: "YOTEI",
              kosus: [{ kosu: dt.duration ?? 0, type: "NORMAL" }],
            },
          ],
          status: dt.status ?? "NOT_STARTED",
          assigneeId:
            dt.assigneeId !== undefined ? String(dt.assigneeId) : undefined,
          phaseId: dt.phaseId,
        });
        if (!res.success) {
          throw new Error(res.error ?? `「${dt.name}」の追加に失敗しました`);
        }
      }

      // 2) ドラフトで削除したタスクをサーバーから削除する。
      // 紐づく実績データ（work_records）はDBのFK制約（ON DELETE SET NULL）により保持される。
      const deletedTasks = tasks.filter((t) => !draftIds.has(t.id));
      for (const t of deletedTasks) {
        const dbId = t.dbId ?? parseDbId(t.id);
        const res = t.isMilestone
          ? await deleteMilestone(dbId, wbsId)
          : await deleteTask(dbId);
        if (!res.success) {
          throw new Error(res.error ?? `「${t.name}」の削除に失敗しました`);
        }
      }

      // 3) 予定開始日・終了日・工数（マイルストーンは日付）の変更を保存
      // （新規追加タスクは dbId 未設定のため orig が見つからず自動的に対象外になる）
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

      // 4) 依存関係の差分を保存。
      // 削除済みタスクに関わる依存はタスク削除のカスケードで既に消えているため、
      // 元タスク側からも削除済みタスク・削除済みタスクへの参照を除いてから差分を取る
      // （残すと「既に無い依存行」への削除APIを再度呼んでしまう）。
      const survivingOriginalTasks = tasks
        .filter((t) => draftIds.has(t.id))
        .map((t) => ({
          ...t,
          predecessors: t.predecessors.filter((p) => draftIds.has(p.taskId)),
        }));
      const { deletes, creates } = diffDependencies(
        survivingOriginalTasks,
        draftTasks,
      );
      for (const dbId of deletes) {
        const res = await deleteGanttDependency(wbsId, dbId);
        if (!res.success) {
          throw new Error(res.error ?? "依存関係の削除に失敗しました");
        }
      }
      // 新規追加タスク（未保存＝数値dbIdを持たない）が絡む依存は今回保存できないため除外する
      const validCreates = creates.filter(
        (c) =>
          Number.isFinite(c.successorTaskId) &&
          Number.isFinite(c.predecessorTaskId),
      );
      if (validCreates.length !== creates.length) {
        toast({
          title: "一部の依存関係は保存されませんでした",
          description:
            "新規追加したタスクに対する依存関係は、保存後に改めて設定してください。",
        });
      }
      for (const input of validCreates) {
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
    handleDraftTaskAdd,
    handleDraftTaskDelete,
    handleDraftDependencyAdd,
    handleDraftDependencyRemove,
    handleDraftDependencyUpdate,
    handleSaveEdit,
  };
}
