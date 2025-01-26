"use server"

import { revalidatePath } from "next/cache"
import { type WbsTask } from "@/types/wbs"

const tasks: WbsTask[] = []

export async function createTask(
    wbsId: number,
    taskData: { name: string; phaseId: number },
): Promise<{ success: boolean; task?: WbsTask }> {
    const newTask: WbsTask = {
        id: `task_${tasks.length + 1}`,
        wbsId,
        ...taskData,
        status: "NOT_STARTED",
        assigneeId: null,
        kijunStartDate: null,
        kijunEndDate: null,
        kijunKosu: null,
        yoteiStartDate: null,
        yoteiEndDate: null,
        yoteiKosu: null,
        jissekiStartDate: null,
        jissekiEndDate: null,
        jissekiKosu: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
    tasks.push(newTask)

    revalidatePath(`/wbs/${wbsId}`)
    return { success: true, task: newTask }
}

export async function updateTask(
    taskId: string,
    taskData: Partial<WbsTask>,
): Promise<{ success: boolean; task?: WbsTask }> {
    const taskIndex = tasks.findIndex((task) => task.id === taskId)
    if (taskIndex !== -1) {
        tasks[taskIndex] = { ...tasks[taskIndex], ...taskData, updatedAt: new Date().toISOString() }
        revalidatePath(`/wbs/${tasks[taskIndex].wbsId}`)
        return { success: true, task: tasks[taskIndex] }
    }
    return { success: false }
}

export async function deleteTask(taskId: string): Promise<{ success: boolean }> {
    const taskIndex = tasks.findIndex((task) => task.id === taskId)
    if (taskIndex !== -1) {
        const deletedTask = tasks.splice(taskIndex, 1)[0]
        revalidatePath(`/wbs/${deletedTask.wbsId}`)
        return { success: true }
    }
    return { success: false }
}

