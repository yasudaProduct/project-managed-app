import { WorkloadCalculationService } from "@/domains/assignee-workload/workload-calculation-service";
import { SteadyWorkAllocationService } from "@/domains/standing-work/steady-work-allocation-service";
import type { DailyWorkAllocation } from "@/domains/assignee-workload/daily-work-allocation";
import type { Task } from "@/domains/task/task";
import type { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import type { UserSchedule } from "@/domains/calendar/assignee-working-calendar";
import type { CompanyCalendar } from "@/domains/calendar/company-calendar";
import type { SteadyWorkPlanWithTask } from "@/applications/standing-work/isteady-work-plan-repository";
import { groupSteadyWorkTasksForAssignee } from "@/applications/standing-work/steady-work-task-grouping";

export interface AssigneeDailyAllocationInput {
    /** 候補タスク（担当者行に属さないものは無視する） */
    tasks: ReadonlyArray<Task>;
    /** 定常枠（担当者行に属さないものは無視する） */
    steadyPlans: ReadonlyArray<SteadyWorkPlanWithTask>;
    assignee: WbsAssignee;
    userSchedules: UserSchedule[];
    companyCalendar: CompanyCalendar;
    startDate: Date;
    endDate: Date;
}

/**
 * WBS担当者行の日別配分を計算する（担当者ガント・横断負荷の共通部品）。
 * - 通常タスクは YOTEI 期間・工数を稼働可能時間比で按分する（既存ロジック）
 * - 定常枠を持つタスクは枠で配分し、YOTEI 按分の対象から外す（二重計上しない）
 */
export class AssigneeDailyAllocationCalculator {
    private readonly workloadCalculationService = new WorkloadCalculationService();
    private readonly steadyWorkAllocationService = new SteadyWorkAllocationService();

    calculate(input: AssigneeDailyAllocationInput): DailyWorkAllocation[] {
        const { assignee } = input;
        const steadyTasks = groupSteadyWorkTasksForAssignee(input.steadyPlans, assignee);
        const steadyTaskIds = new Set(steadyTasks.map((task) => task.taskId));
        const normalTasks = input.tasks.filter(
            (task) =>
                task.wbsId === assignee.wbsId &&
                task.assigneeId === assignee.id &&
                !(task.id !== undefined && steadyTaskIds.has(task.id))
        );

        const daily = this.workloadCalculationService.calculateDailyAllocations(
            normalTasks,
            assignee,
            input.userSchedules,
            input.companyCalendar,
            input.startDate,
            input.endDate
        );
        if (steadyTasks.length === 0) return daily;

        const steadyDaily = this.steadyWorkAllocationService.calculateDailyAllocations(
            steadyTasks,
            assignee,
            input.userSchedules,
            input.companyCalendar,
            input.startDate,
            input.endDate
        );
        return this.steadyWorkAllocationService.mergeDailyAllocations(daily, steadyDaily);
    }

    /** 担当者行に通常タスクか定常枠のどちらかがあるか */
    hasWork(input: Pick<AssigneeDailyAllocationInput, "tasks" | "steadyPlans" | "assignee">): boolean {
        const { assignee } = input;
        return (
            input.tasks.some((task) => task.wbsId === assignee.wbsId && task.assigneeId === assignee.id) ||
            groupSteadyWorkTasksForAssignee(input.steadyPlans, assignee).length > 0
        );
    }
}
