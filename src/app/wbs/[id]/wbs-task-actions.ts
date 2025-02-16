"use server"

import { revalidatePath } from "next/cache"
import { KosuType, PeriodType, TaskStatus, WbsTask } from "@/types/wbs"
import prisma from "@/lib/prisma";
import { TaskKosu as TaskKosuPrisma, TaskPeriod as TaskPeriodPrisma, Users as UserPrisma, WbsTask as WbsTaskPrisma, WbsPhase as WbsPhasePrisma } from "@prisma/client";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config"
import { ITaskApplicationService } from "@/applications/task/task-application-service";

const taskApplicationService = container.get<ITaskApplicationService>(SYMBOL.ITaskApplicationService);

export async function getTaskAll(wbsId: number) {

    const tasks = await taskApplicationService.getTaskAll(wbsId);
    return tasks;

}

export async function createTask(
    wbsId: number,
    taskData: {
        id: string;
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

    const newTask = await prisma.wbsTask.create({
        data: {
            id: taskData.id,
            wbsId: wbsId,
            name: taskData.name,
            assigneeId: taskData.assigneeId,
            status: taskData.status,
            phaseId: taskData.phaseId,
        }
    })

    // 期間を作成
    if (taskData.periods) {
        for (const period of taskData.periods) {
            if (period.startDate && period.endDate) {
                const newTaskPeriod = await prisma.taskPeriod.create({
                    data: {
                        taskId: newTask.id,
                        startDate: new Date(period.startDate).toISOString(),
                        endDate: new Date(period.endDate).toISOString(),
                        type: period.type,
                    }
                })

                // 工数を作成
                if (period.kosus) {
                    for (const kosu of period.kosus) {
                        await prisma.taskKosu.create({
                            data: {
                                kosu: kosu.kosu,
                                wbsId: wbsId,
                                periodId: newTaskPeriod.id,
                                type: kosu.type,
                            }
                        })
                    }
                }
            }
        }
    }

    revalidatePath(`/wbs/${wbsId}`)
    return { success: true, task: formatTask(newTask) }
}

export async function updateTask(
    wbsId: number,
    taskId: string,
    taskData: {
        id: string;
        name: string;
        kijunStart?: string;
        kijunEnd?: string;
        kijunKosu?: number;
        yoteiStart?: string;
        yoteiEnd?: string;
        yoteiKosu?: number;
        jissekiStart?: string;
        jissekiEnd?: string;
        jissekiKosu?: number;
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
            kijunStart: taskData.kijunStart ? new Date(taskData.kijunStart) : undefined,
            kijunEnd: taskData.kijunEnd ? new Date(taskData.kijunEnd) : undefined,
            yoteiStart: taskData.yoteiStart ? new Date(taskData.yoteiStart) : undefined,
            yoteiEnd: taskData.yoteiEnd ? new Date(taskData.yoteiEnd) : undefined,
            jissekiStart: taskData.jissekiStart ? new Date(taskData.jissekiStart) : undefined,
            jissekiEnd: taskData.jissekiEnd ? new Date(taskData.jissekiEnd) : undefined,
        }
    });
    console.log(result);

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

function formatTask(task: WbsTaskPrisma & { phase?: WbsPhasePrisma | null } & { assignee?: UserPrisma | null } & { periods?: (TaskPeriodPrisma & { kosus: TaskKosuPrisma[] })[] }): WbsTask {
    return {
        ...task,
        assigneeId: task.assignee?.id ?? undefined,
        assignee: task.assignee ? {
            id: task.assignee.id,
            name: task.assignee.name,
            displayName: task.assignee.displayName,
        } : undefined,
        phaseId: task.phaseId ?? undefined,
        phase: task.phase ? {
            id: task.phase.id,
            name: task.phase.name,
            seq: task.phase.seq,
        } : undefined,
        kijunStart: task.periods?.findLast(p => p.type === 'KIJUN')?.startDate,
        kijunEnd: task.periods?.findLast(p => p.type === 'KIJUN')?.endDate,
        kijunKosu: task.periods?.findLast(p => p.type === 'KIJUN')?.kosus.find(k => k.type === 'NORMAL')?.kosu,
        yoteiStart: task.periods?.findLast(p => p.type === 'YOTEI')?.startDate,
        yoteiEnd: task.periods?.findLast(p => p.type === 'YOTEI')?.endDate,
        yoteiKosu: task.periods?.findLast(p => p.type === 'YOTEI')?.kosus.find(k => k.type === 'NORMAL')?.kosu,
        jissekiStart: task.periods?.findLast(p => p.type === 'JISSEKI')?.startDate,
        jissekiEnd: task.periods?.findLast(p => p.type === 'JISSEKI')?.endDate,
        jissekiKosu: task.periods?.findLast(p => p.type === 'JISSEKI')?.kosus.find(k => k.type === 'NORMAL')?.kosu,
    }
}