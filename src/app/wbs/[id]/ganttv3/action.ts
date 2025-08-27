"use server";

import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { GanttPhase, Task as GanttTask, TaskStatus as GanntTaskStatus } from "@/components/ganttv3/gantt";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config";
import { Milestone, WbsTask } from "@/types/wbs";
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";
import { IMilestoneApplicationService } from "@/applications/milestone/milestone-application-service";

export async function getGanttTasks(wbsId: number): Promise<GanttTask[]> {

    const taskService = container.get<ITaskApplicationService>(
        SYMBOL.ITaskApplicationService
    );

    const milestoneService = container.get<IMilestoneApplicationService>(
        SYMBOL.IMilestoneApplicationService
    );

    const tasks = await taskService.getTaskAll(wbsId);
    const milestones = await milestoneService.getMilestones(wbsId);

    return [
        ...milestones.map(convertMilestone).filter((milestone): milestone is GanttTask => milestone !== undefined),
        ...tasks.map(convertTask).filter((task): task is GanttTask => task !== undefined)
    ];;
}

export async function getPhases(wbsId: number): Promise<GanttPhase[]> {

    const wbsService = container.get<IWbsApplicationService>(
        SYMBOL.IWbsApplicationService
    );

    const phases = await wbsService.getPhases(wbsId);
    return phases.map(phase => ({
        id: phase.id.toString(),
        seq: phase.seq,
        name: phase.name,
        code: phase.code,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        startDate: phase.startDate,
        endDate: phase.endDate,
    }));
}

function convertTask(task: WbsTask): GanttTask | undefined {

    let color = "red";
    let status: GanntTaskStatus
    switch (task.status) {
        case "COMPLETED":
            color = "green";
            status = "completed";
            break;
        case "IN_PROGRESS":
            color = "blue";
            status = "inProgress";
            break;
        case "NOT_STARTED":
            color = "gray";
            status = "notStarted";
            break;
    }

    if (task.yoteiStart && task.yoteiEnd && task.yoteiKosu) {

        return {
            id: task.id.toString(),
            name: task.name,
            startDate: task.yoteiStart,
            endDate: task.yoteiEnd,
            duration: task.yoteiKosu,
            color: color,
            isMilestone: false,
            progress: 0,
            predecessors: [],
            level: 0,
            isManuallyScheduled: false,
            category: task.phase?.name,
            assignee: task.assignee?.name,
            status: status,
        };
    }

    return undefined;
}

function convertMilestone(milestone: Milestone): GanttTask | undefined {

    return {
        id: milestone.id.toString(),
        name: milestone.name,
        startDate: milestone.date,
        endDate: milestone.date,
        duration: 0,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        isMilestone: true,
        progress: 0,
        predecessors: [],
        level: 0,
        isManuallyScheduled: false,
        category: milestone.name,
        assignee: undefined,
        status: "notStarted",
    };
}