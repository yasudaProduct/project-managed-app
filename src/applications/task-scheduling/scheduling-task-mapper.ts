import type { Task } from "@/domains/task/task";
import type { SchedulingTask } from "@/domains/task-scheduling/scheduling-task";

/**
 * ドメイン Task 集約をスケジューリング入力 SchedulingTask に変換する。
 * 実績日程・工数は WorkRecord から導出される getJisseki* を用いる。
 */
export function toSchedulingTask(task: Task): SchedulingTask {
  return {
    taskId: task.id!,
    taskNo: task.taskNo.getValue(),
    taskName: task.name,
    phaseId: task.phaseId,
    phaseName: task.phase?.name,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee?.displayName ?? task.assignee?.name,
    status: task.getStatus(),
    progressRate: task.progressRate,
    yoteiStartDate: task.getYoteiStart() ?? undefined,
    yoteiEndDate: task.getYoteiEnd() ?? undefined,
    yoteiKosu: task.getYoteiKosus(),
    jissekiStartDate: task.getJissekiStart() ?? undefined,
    jissekiEndDate: task.getJissekiEnd() ?? undefined,
    jissekiKosu: task.getJissekiKosus(),
  };
}
