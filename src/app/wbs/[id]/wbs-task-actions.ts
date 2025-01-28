"use server"

import { revalidatePath } from "next/cache"
import { type WbsTask } from "@/types/wbs"
import prisma from "@/lib/prisma";

const tasks: WbsTask[] = []

export async function createTask(
    wbsId: number,
    taskData: { 
        id: string; 
        name: string; 
        kijunStartDate: string;
        kijunEndDate: string;
        kijunKosu: number;
    },
): Promise<{ success: boolean; task?: WbsTask; error?: string }> {

    const newTask = await prisma.wbsTask.create({
        data: {
            id: taskData.id,
            wbsId: wbsId,
            name: taskData.name,
            status: "NOT_STARTED",
            assigneeId: null,
            kijunStartDate: new Date(taskData.kijunStartDate).toISOString(),
            kijunEndDate: new Date(taskData.kijunEndDate).toISOString(),
            kijunKosu: taskData.kijunKosu,
            yoteiStartDate: null,
            yoteiEndDate: null,
            yoteiKosu: null,
            jissekiStartDate: null,
            jissekiEndDate: null,
            jissekiKosu: null,
        }
    })

    revalidatePath(`/wbs/${wbsId}`)
    return { success: true, task: newTask }
}

export async function updateTask(
    taskId: string,
    taskData: Partial<WbsTask>,
): Promise<{ success: boolean; task?: WbsTask }> {
    const taskIndex = tasks.findIndex((task) => task.id === taskId)
    if (taskIndex !== -1) {
        tasks[taskIndex] = { ...tasks[taskIndex], ...taskData, updatedAt: new Date() }
        revalidatePath(`/wbs/${tasks[taskIndex].wbsId}`)
        return { success: true, task: tasks[taskIndex] }
    }
    return { success: false }
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
    }else{
        return { success: false, error: "タスクが存在しません" }
    }
}

