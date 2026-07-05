"use server"

import { revalidatePath } from "next/cache"
import { KosuType, PeriodType, TaskStatus, WbsTask } from "@/types/wbs"
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config"
import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { IPhaseApplicationService } from "@/applications/phase/phase-application-service";

const taskApplicationService = container.get<ITaskApplicationService>(SYMBOL.ITaskApplicationService);
const phaseApplicationService = container.get<IPhaseApplicationService>(SYMBOL.IPhaseApplicationService);

export async function getTaskAll(wbsId: number): Promise<WbsTask[]> {

    const tasks = await taskApplicationService.getTaskAll(wbsId);
    return tasks;

}

export async function createTask(
    wbsId: number,
    taskData: {
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
    try {
        const phase = await phaseApplicationService.getPhaseById(taskData.phaseId!);

        if (!phase) {
            return { success: false, error: "工程が見つかりません" };
        }

        const result = await taskApplicationService.createTask({
            name: taskData.name,
            wbsId: wbsId,
            assigneeId: taskData.assigneeId ? Number(taskData.assigneeId) : undefined,
            phaseId: taskData.phaseId!,
            status: taskData.status,
            yoteiStartDate: new Date(taskData.periods![0].startDate!),
            yoteiEndDate: new Date(taskData.periods![0].endDate!),
            yoteiKosu: taskData.periods?.[0].kosus.find(k => k.type === 'NORMAL')?.kosu ?? 0,
        });

        if (result.success) {
            const task = await taskApplicationService.getTaskById(result.id!);
            return { success: true, task: task ?? undefined }
        } else {
            return { success: false, error: result.error }
        }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "タスクの作成に失敗しました" };
    }
}

export async function updateTask(
    wbsId: number,
    taskData: {
        id: number;
        taskNo?: string;
        name: string;
        yoteiStart?: Date;
        yoteiEnd?: Date;
        yoteiKosu?: number;
        status: TaskStatus;
        assigneeId?: number;
        phaseId?: number;
    },
): Promise<{ success: boolean; task?: WbsTask, error?: string }> {

    const result = await taskApplicationService.updateTask({
        wbsId: wbsId,
        updateTask: {
            ...taskData,
            yoteiStart: taskData.yoteiStart ? new Date(taskData.yoteiStart) : undefined,
            yoteiEnd: taskData.yoteiEnd ? new Date(taskData.yoteiEnd) : undefined,
        }
    });

    if (result.success) {
        const task = await taskApplicationService.getTaskById(taskData.id);
        revalidatePath(`/wbs/${wbsId}/gannt`);
        return { success: true, task: task ?? undefined }
    } else {
        return { success: false, error: result.error }
    }
}

export async function deleteTask(taskId: number): Promise<{ success: boolean, error?: string }> {
    const result = await taskApplicationService.deleteTask(taskId);

    if (result.success) {
        revalidatePath('/wbs');
    }

    return result;
}

export async function getTaskStatusCount(wbsId: number) {
    return await taskApplicationService.getTaskStatusCount(wbsId);
}

export async function getTaskProgressByPhase(wbsId: number) {
    return await taskApplicationService.getTaskProgressByPhase(wbsId);
}

export async function getKosuSummary(wbsId: number) {
    return await taskApplicationService.getKosuSummary(wbsId);
}
