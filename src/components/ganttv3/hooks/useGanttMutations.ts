import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { Task, GanttPhase, DependencyType } from "../gantt";
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
} from "@/app/wbs/[id]/ganttv3/dependency-actions";
import { calculateCriticalPath } from "../utils/criticalPath";
import { toast } from "@/hooks/use-toast";

export type UseGanttMutationsParams = {
  wbsId: number;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  categories: GanttPhase[];
  refetchTasks: () => Promise<void>;
  /** 楽観的削除の直後に呼ばれる（選択状態のクリア等のUI副作用に使う） */
  onAfterDelete?: () => void;
};

/**
 * ガントの確定タスク／依存関係に対するサーバー反映（楽観的更新＋ロールバック）を担う hook。
 * ドラフト編集（編集モード）系は対象外。
 */
export function useGanttMutations({
  wbsId,
  tasks,
  setTasks,
  categories,
  refetchTasks,
  onAfterDelete,
}: UseGanttMutationsParams) {
  // タスク/マイルストーンの更新（楽観的更新 → サーバー保存 → 失敗時ロールバック）
  const handleTaskUpdate = useCallback(
    async (updatedTask: Task) => {
      const prevTasks = tasks;
      const newTasks = tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
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
    [tasks, setTasks, wbsId],
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
          assigneeId: newTask.assigneeId
            ? String(newTask.assigneeId)
            : undefined,
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
    [wbsId, categories, refetchTasks],
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
              (pred) => !taskIds.includes(pred.taskId),
            ),
          })),
        ),
      );
      onAfterDelete?.();

      try {
        const results = await Promise.all(
          targets.map((task) => {
            const dbId = Number(task.dbId ?? task.id);
            return task.isMilestone
              ? deleteMilestone(dbId, wbsId)
              : deleteTask(dbId);
          }),
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
    [tasks, setTasks, wbsId, refetchTasks, onAfterDelete],
  );

  // タスク複製（サーバーに新規作成 → 再取得）。マイルストーンは対象外。
  const handleTaskDuplicate = useCallback(
    async (taskIds: string[]) => {
      const targets = tasks.filter(
        (task) => taskIds.includes(task.id) && !task.isMilestone,
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
    [tasks, wbsId, categories, refetchTasks],
  );

  // 依存関係を追加（サーバーに作成 → 再取得）
  const handleDependencyAdd = useCallback(
    async (
      successorTaskId: string,
      predecessorTaskId: string,
      type: DependencyType,
      lag: number,
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
    [wbsId, refetchTasks],
  );

  // 依存関係を削除（楽観的更新 → サーバー削除）
  const handleDependencyRemove = useCallback(
    async (dependencyDbId: number) => {
      const prevTasks = tasks;
      const newTasks = tasks.map((task) => ({
        ...task,
        predecessors: task.predecessors.filter(
          (pred) => pred.dbId !== dependencyDbId,
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
    [tasks, setTasks, wbsId],
  );

  // 依存関係を編集（更新APIが無いため 旧依存を削除 → 新依存を作成 → 再取得）
  const handleDependencyUpdate = useCallback(
    async (
      dependencyDbId: number,
      successorTaskId: string,
      predecessorTaskId: string,
      type: DependencyType,
      lag: number,
    ) => {
      try {
        const deleted = await deleteGanttDependency(wbsId, dependencyDbId);
        if (!deleted.success) {
          toast({
            title: "依存関係の更新に失敗しました",
            description: deleted.error,
            variant: "destructive",
          });
          return;
        }

        const created = await createGanttDependency(wbsId, {
          successorTaskId: Number(successorTaskId),
          predecessorTaskId: Number(predecessorTaskId),
          type,
          lag,
        });
        if (!created.success) {
          toast({
            title: "依存関係の更新に失敗しました",
            description: created.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "依存関係の更新に失敗しました",
          description: error instanceof Error ? error.message : "不明なエラー",
          variant: "destructive",
        });
      } finally {
        await refetchTasks();
      }
    },
    [wbsId, refetchTasks],
  );

  return {
    handleTaskUpdate,
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDuplicate,
    handleDependencyAdd,
    handleDependencyRemove,
    handleDependencyUpdate,
  };
}
