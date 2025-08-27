"use server";

import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { GanttPhase, Task as GanttTask } from "@/components/ganttv3/gantt";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config";
import { WbsPhase, WbsTask } from "@/types/wbs";
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";

export async function getTasks(wbsId: number): Promise<GanttTask[]> {

    const taskService = container.get<ITaskApplicationService>(
        SYMBOL.ITaskApplicationService
    );

    const tasks = await taskService.getTaskAll(wbsId);

    return tasks.map(convertTask).filter((task): task is GanttTask => task !== undefined);
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
        color : "#"+Math.floor(Math.random()*16777215).toString(16),
        startDate: phase.startDate,
        endDate: phase.endDate,
    }));
}

function convertTask(task: WbsTask): GanttTask | undefined {

    let color = "red";
    switch (task.status) {
        case "COMPLETED":
            color = "green";
            break;
        case "IN_PROGRESS":
            color = "blue";
            break;
        case "NOT_STARTED":
            color = "gray";
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
        };
    }

    return undefined;
}