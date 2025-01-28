"use server"

import { revalidatePath } from "next/cache"
import { TaskStatus, type WbsTask } from "@/types/wbs"
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
        yoteiStartDate: string;
        yoteiEndDate: string;
        yoteiKosu: number;
        jissekiStartDate: string;
        jissekiEndDate: string;
        jissekiKosu: number;
        status: TaskStatus;
    },
): Promise<{ success: boolean; task?: WbsTask; error?: string }> {

    const newTask = await prisma.wbsTask.create({
        data: {
            id: taskData.id,
            wbsId: wbsId,
            name: taskData.name,
            assigneeId: null,
            kijunStartDate: new Date(taskData.kijunStartDate).toISOString(),
            kijunEndDate: new Date(taskData.kijunEndDate).toISOString(),
            kijunKosu: taskData.kijunKosu,
            yoteiStartDate: new Date(taskData.yoteiStartDate).toISOString(),
            yoteiEndDate: new Date(taskData.yoteiEndDate).toISOString(),
            yoteiKosu: taskData.yoteiKosu,
            jissekiStartDate: new Date(taskData.jissekiStartDate).toISOString(),
            jissekiEndDate: new Date(taskData.jissekiEndDate).toISOString(),
            jissekiKosu: taskData.jissekiKosu,
            status: taskData.status,
        }
    })

    revalidatePath(`/wbs/${wbsId}`)
    return { success: true, task: newTask }
}

export async function updateTask(
    taskId: string,
    taskData: {
        id: string; 
        name: string; 
        kijunStartDate: string;
        kijunEndDate: string;
        kijunKosu: number;
        yoteiStartDate: string;
        yoteiEndDate: string;
        yoteiKosu: number;
        jissekiStartDate: string;
        jissekiEndDate: string;
        jissekiKosu: number;
        status: TaskStatus;
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

            if(task){
                return { success: false, error: "タスクIDが重複しています" }
            }
        }

        const updatedTask = await prisma.wbsTask.update({
            where: { id: taskId },
            data: {
                ...task,
                id: taskData.id,
                name: taskData.name,
                kijunStartDate: taskData.kijunStartDate ? new Date(taskData.kijunStartDate).toISOString() : undefined,
                kijunEndDate: taskData.kijunEndDate ? new Date(taskData.kijunEndDate).toISOString() : undefined,
                kijunKosu: taskData.kijunKosu,
                yoteiStartDate: taskData.yoteiStartDate ? new Date(taskData.yoteiStartDate).toISOString() : undefined,
                yoteiEndDate: taskData.yoteiEndDate ? new Date(taskData.yoteiEndDate).toISOString() : undefined,
                yoteiKosu: taskData.yoteiKosu,
                jissekiStartDate: taskData.jissekiStartDate ? new Date(taskData.jissekiStartDate).toISOString() : undefined,
                jissekiEndDate: taskData.jissekiEndDate ? new Date(taskData.jissekiEndDate).toISOString() : undefined,
                jissekiKosu: taskData.jissekiKosu,
                status: taskData.status,
            }
        })
        revalidatePath(`/wbs/${task.wbsId}`)
        return { success: true, task: updatedTask }
    }else{
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
    }else{
        return { success: false, error: "タスクが存在しません" }
    }
}

