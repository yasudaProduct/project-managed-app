"use server";

import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { Task as GanttTask } from "@/components/ganttv3/gantt";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config";
import { WbsTask } from "@/types/wbs";

export async function getTasks(wbsId: number): Promise<GanttTask[]> {

    const taskService = container.get<ITaskApplicationService>(
        SYMBOL.ITaskApplicationService
    );

    const tasks = await taskService.getTaskAll(wbsId);

    return tasks.map(convertTask).filter((task): task is GanttTask => task !== undefined);
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