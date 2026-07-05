import { useState, useCallback, useEffect } from "react";
import type { Task, GanttPhase } from "../gantt";
import {
  getGanttTasks,
  getPhases,
  getAssigneeOptions,
} from "@/app/wbs/[id]/ganttv3/actions";
import { calculateCriticalPath } from "../utils/criticalPath";

export type AssigneeOption = { id: number; name: string };

/**
 * ガントのデータ層（タスク・フェーズ・担当者の取得と保持）を担う hook。
 *
 * - 初期マウント時に tasks/phases/assignees を取得
 * - タスクは取得時に常にクリティカルパスを反映
 * - `setTasks` を公開し、呼び出し側の楽観的更新を許容する
 *   （`GanttPhase` は index.ts で `Category` として再エクスポートされる型と同一）
 */
export function useGanttData(wbsId: number) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<GanttPhase[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  // 初回（および wbsId 切替時）のタスク取得が完了するまで true。
  // ロード前は tasks が空のため、この間に編集モードへ入ると空ドラフトになる。
  const [isLoading, setIsLoading] = useState(true);

  // サーバーから最新タスクを取得してStateへ反映
  const refetchTasks = useCallback(async () => {
    const fresh = await getGanttTasks(wbsId);
    setTasks(calculateCriticalPath(fresh));
  }, [wbsId]);

  // 初期ロード
  useEffect(() => {
    setIsLoading(true);
    refetchTasks().finally(() => setIsLoading(false));
    const fetchPhases = async () => {
      const phases = await getPhases(wbsId);
      setCategories(phases);
    };
    fetchPhases();
    const fetchAssignees = async () => {
      const options = await getAssigneeOptions(wbsId);
      setAssignees(options);
    };
    fetchAssignees();
  }, [wbsId, refetchTasks]);

  return { tasks, setTasks, categories, assignees, refetchTasks, isLoading };
}
