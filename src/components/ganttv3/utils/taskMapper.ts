import type { Task } from "../gantt";
import type { WbsTask } from "@/types/wbs";

/**
 * gantt の `Task` を `TaskModal` が要求する `WbsTask` 形へ変換する。
 * UI表示用の `Task` から DB寄りの `WbsTask` へのマッピングのみを行う純粋関数。
 */
export function toWbsTask(task: Task): WbsTask {
  return {
    id: Number(task.dbId ?? task.id),
    taskNo: task.taskNo,
    name: task.name,
    status: task.status ?? "NOT_STARTED",
    assigneeId: task.assigneeId,
    assignee: task.assigneeId
      ? {
          id: task.assigneeId,
          name: task.assignee ?? "",
          displayName: task.assignee ?? "",
        }
      : undefined,
    phaseId: task.phaseId,
    phase: task.phaseId
      ? { id: task.phaseId, name: task.category ?? "", seq: 0 }
      : undefined,
    yoteiStart: task.startDate,
    yoteiEnd: task.endDate,
    yoteiKosu: task.duration,
  };
}
