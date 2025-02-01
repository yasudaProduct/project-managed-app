"use server"

import { revalidatePath } from "next/cache"
import { KosuType, PeriodType, TaskPeriod, TaskStatus, type WbsTask } from "@/types/wbs"
import prisma from "@/lib/prisma";
import { TaskKosu as TaskKosuPrisma, TaskPeriod as TaskPeriodPrisma, Users as UserPrisma, WbsTask as WbsTaskPrisma, WbsPhase as WbsPhasePrisma } from "@prisma/client";

export async function getTaskAll(wbsId: number) {
    const tasks = await prisma.wbsTask.findMany({
        where: {
            wbsId: wbsId,
        },
        include: {
            periods: {
                include: {
                    kosus: true,
                },
            },
            assignee: true,
            phase: true,
        },
        orderBy: {
            phaseId: 'asc'
        }
    })

    return tasks.map(
        (task) => formatTask(task)
    )

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
    taskId: string,
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
): Promise<{ success: boolean; task?: WbsTask, error?: string }> {

    const task = await prisma.wbsTask.findUnique({
        where: { id: taskId }
    })

    if (task) {
        if (taskId !== taskData.id) {
            // 重複確認
            const task = await prisma.wbsTask.findUnique({
                where: { id: taskData.id }
            })

            if (task) {
                return { success: false, error: "タスクIDが重複しています" }
            }
        }

        const updatedTask = await prisma.wbsTask.update({
            where: { id: taskId },
            data: {
                ...task,
                id: taskData.id,
                name: taskData.name,
                assigneeId: taskData.assigneeId,
                status: taskData.status,
                phaseId: taskData.phaseId,
            }
        })
        revalidatePath(`/wbs/${task.wbsId}`)
        return { success: true, task: formatTask(updatedTask) }
    } else {
        return { success: false, error: "タスクが存在しません" }
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
        periods: task.periods?.map((period) => ({
            id: period.id,
            taskId: period.taskId,
            startDate: period.startDate,
            endDate: period.endDate,
            type: period.type,
            kosus: period.kosus,
        })) as TaskPeriod[],
    }
}