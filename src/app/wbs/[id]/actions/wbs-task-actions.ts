"use server"

import { revalidatePath } from "next/cache"
import { KosuType, PeriodType, TaskStatus, WbsTask } from "@/types/wbs"
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config"
import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { TaskStatus as TaskStatusDomain } from "@/domains/task/value-object/project-status";
import { ITaskFactory } from "@/domains/task/interfaces/task-factory";
import { IPhaseApplicationService } from "@/applications/phase/phase-application-service";

const taskApplicationService = container.get<ITaskApplicationService>(SYMBOL.ITaskApplicationService);
const taskFactory = container.get<ITaskFactory>(SYMBOL.ITaskFactory);
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
        // フェーズ情報を取得
        const phase = await phaseApplicationService.getPhaseById(taskData.phaseId!);

        if (!phase) {
            return { success: false, error: "工程が見つかりません" };
        }

        // タスクIDを生成
        const taskId = await taskFactory.createTaskId(wbsId, phase.id);

        const result = await taskApplicationService.createTask({
            id: taskId.getValue(),
            name: taskData.name,
            wbsId: wbsId,
            assigneeId: taskData.assigneeId ? Number(taskData.assigneeId) : undefined,
            phaseId: taskData.phaseId!,
            status: new TaskStatusDomain({ status: taskData.status }),
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
        // WBSIDを取得するために、タスクが削除される前にWBSIDを取得する必要があります
        // ここでは簡略化のため、キャッシュクリアのパスを汎用的にしています
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