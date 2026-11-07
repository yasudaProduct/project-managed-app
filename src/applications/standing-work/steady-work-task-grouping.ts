import type { SteadyWorkPlanWithTask } from "./isteady-work-plan-repository";
import type { SteadyWorkTaskInput } from "@/domains/standing-work/steady-work-allocation-service";
import type { WbsAssignee } from "@/domains/wbs/wbs-assignee";

/**
 * 定常枠の読み取りモデルから、担当者（WBS担当者行）に属する定常タスクの入力を組み立てる。
 * タスクの照合は WbsTask.assigneeId = WbsAssignee.id（join行PK）で行う。
 */
export function groupSteadyWorkTasksForAssignee(
    plans: ReadonlyArray<SteadyWorkPlanWithTask>,
    assignee: WbsAssignee
): SteadyWorkTaskInput[] {
    if (assignee.id == null) return [];
    const byTaskId = new Map<number, SteadyWorkTaskInput>();
    for (const entry of plans) {
        if (entry.task.wbsId !== assignee.wbsId || entry.task.assigneeId !== assignee.id) continue;
        const existing = byTaskId.get(entry.task.id);
        if (existing) {
            existing.plans.push(entry.plan);
        } else {
            byTaskId.set(entry.task.id, {
                taskId: entry.task.id,
                taskName: entry.task.name,
                plans: [entry.plan],
            });
        }
    }
    return [...byTaskId.values()];
}
