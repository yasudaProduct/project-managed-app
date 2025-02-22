"use server"

import { revalidatePath } from "next/cache"
import { KosuType, PeriodType, TaskStatus, WbsTask } from "@/types/wbs"
import prisma from "@/lib/prisma";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config"
import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { TaskStatus as TaskStatusDomain } from "@/domains/task/project-status";

const taskApplicationService = container.get<ITaskApplicationService>(SYMBOL.ITaskApplicationService);

export async function getTaskAll(wbsId: number): Promise<WbsTask[]> {

    const tasks = await taskApplicationService.getTaskAll(wbsId);
    return tasks;

}

export async function createTask(
    wbsId: number,
    taskData: {
        // id: string;
        name: string;
        periods?: {
            startDate?: string;
            endDate?: string;
            type: PeriodType;
            kosus: {
                kosu: number;
                type: KosuType;
            }[];
        }[];
        status: TaskStatus;
        assigneeId?: string;
        phaseId?: number;
    },
): Promise<{ success: boolean; task?: WbsTask; error?: string }> {

    const result = await taskApplicationService.createTask({
        name: taskData.name,
        wbsId: wbsId,
        assigneeId: taskData.assigneeId,
        phaseId: taskData.phaseId!,
        status: new TaskStatusDomain({ status: taskData.status }),
        yoteiStartDate: new Date(taskData.periods![0].startDate!),
        yoteiEndDate: new Date(taskData.periods![0].endDate!),
        yoteiKosu: taskData.periods?.[0].kosus.find(k => k.type === 'NORMAL')?.kosu ?? 0,
    });

    if (result.success) {
        const task = await taskApplicationService.getTaskById(wbsId, result.id!);
        return { success: true, task: task ?? undefined }
    } else {
        return { success: false, error: result.error }
    }
    // const newTask = await prisma.wbsTask.create({
    //     data: {
    //         // id: taskData.id,
    //         wbsId: wbsId,
    //         name: taskData.name,
    //         assigneeId: taskData.assigneeId,
    //         status: taskData.status,
    //         phaseId: taskData.phaseId,
    //     }
    // })

    // // 期間を作成
    // if (taskData.periods) {
    //     for (const period of taskData.periods) {
    //         if (period.startDate && period.endDate) {
    //             const newTaskPeriod = await prisma.taskPeriod.create({
    //                 data: {
    //                     taskId: newTask.id,
    //                     startDate: new Date(period.startDate).toISOString(),
    //                     endDate: new Date(period.endDate).toISOString(),
    //                     type: period.type,
    //                 }
    //             })

    //             // 工数を作成
    //             if (period.kosus) {
    //                 for (const kosu of period.kosus) {
    //                     await prisma.taskKosu.create({
    //                         data: {
    //                             kosu: kosu.kosu,
    //                             wbsId: wbsId,
    //                             periodId: newTaskPeriod.id,
    //                             type: kosu.type,
    //                         }
    //                     })
    //                 }
    //             }
    //         }
    //     }
    // }

    // revalidatePath(`/wbs/${wbsId}`)
    // return { success: true, task: formatTask(newTask) }
}

export async function updateTask(
    wbsId: number,
    taskId: string,
    taskData: {
        // id: string;
        name: string;
        yoteiStart?: string;
        yoteiEnd?: string;
        yoteiKosu?: number;
        status: TaskStatus;
        assigneeId?: string;
        phaseId?: number;
    },
): Promise<{ success: boolean; task?: WbsTask, error?: string }> {
    console.log("updateTask");

    const result = await taskApplicationService.updateTask({
        wbsId: wbsId,
        id: taskId,
        updateTask: {
            ...taskData,
            yoteiStart: taskData.yoteiStart ? new Date(taskData.yoteiStart) : undefined,
            yoteiEnd: taskData.yoteiEnd ? new Date(taskData.yoteiEnd) : undefined,
        }
    });

    if (result.success) {
        const task = await taskApplicationService.getTaskById(wbsId, taskId);
        revalidatePath(`/wbs/${wbsId}/gannt`);
        return { success: true, task: task ?? undefined }
    } else {
        return { success: false, error: result.error }
    }
}

export async function deleteTask(taskId: string): Promise<{ success: boolean, error?: string }> {

    const task = await prisma.wbsTask.findUnique({
        where: { id: taskId }
    })

    if (task) {
        await prisma.wbsTask.delete({
            where: { id: taskId }
        })
        revalidatePath(`/wbs/${task.wbsId}`)
        return { success: true }
    } else {
        return { success: false, error: "タスクが存在しません" }
    }
}

export async function getTaskStatusCount(wbsId: number) {

    const statusCount = {
        todo: 0,
        inProgress: 0,
        completed: 0,
    }

    statusCount.todo = await prisma.wbsTask.count({
        where: {
            wbsId: wbsId,
            status: 'IN_PROGRESS',
        }
    })

    statusCount.inProgress = await prisma.wbsTask.count({
        where: {
            wbsId: wbsId,
            status: 'IN_PROGRESS',
        }
    })

    statusCount.completed = await prisma.wbsTask.count({
        where: {
            wbsId: wbsId,
            status: 'COMPLETED',
        }
    })

    return statusCount;
}

// function formatTask(task: WbsTaskPrisma & { phase?: WbsPhasePrisma | null } & { assignee?: UserPrisma | null } & { periods?: (TaskPeriodPrisma & { kosus: TaskKosuPrisma[] })[] }): WbsTask {
// function formatTask(task: Task): WbsTask {
//     return {
//         id: task.id!.value(),
//         name: task.name,
//         status: task.status.getStatus(),
//         assigneeId: task.assigneeId ?? undefined,
//         assignee: task.assignee ? {
//             id: task.assignee.id!,
//             name: task.assignee.name,
//             displayName: task.assignee.displayName,
//         } : undefined,
//         phaseId: task.phaseId ?? undefined,
//         phase: task.phase ? {
//             id: task.phase.id!,
//             name: task.phase.name,
//             seq: task.phase.seq,
//         } : undefined,
//         createdAt: task.createdAt,
//         updatedAt: task.updatedAt,
//     }
// }