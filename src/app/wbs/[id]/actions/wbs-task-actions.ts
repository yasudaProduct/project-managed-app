"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { KosuType, PeriodType, TaskStatus, WbsTask } from "@/types/wbs"
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config"
import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { IPhaseApplicationService } from "@/applications/phase/phase-application-service";
import type { ActionResult } from "@/types/action-result"

const taskApplicationService = container.get<ITaskApplicationService>(SYMBOL.ITaskApplicationService);
const phaseApplicationService = container.get<IPhaseApplicationService>(SYMBOL.IPhaseApplicationService);

export async function getTaskAll(wbsId: number): Promise<WbsTask[]> {

    const tasks = await taskApplicationService.getTaskAll(wbsId);
    return tasks;

}

const createTaskSchema = z.object({
    name: z.string().min(1, "タスク名は必須です。"),
    periods: z
        .array(
            z.object({
                startDate: z.string(),
                endDate: z.string(),
                type: z.string(),
                kosus: z.array(z.object({ kosu: z.number(), type: z.string() })),
            })
        )
        .min(1, "期間は必須です。"),
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]),
    assigneeId: z.string().optional(),
    phaseId: z.number({ invalid_type_error: "工程は必須です。" }),
});

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
): Promise<ActionResult<void>> {
    const parsed = createTaskSchema.safeParse(taskData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    try {
        const phase = await phaseApplicationService.getPhaseById(parsed.data.phaseId);

        if (!phase) {
            return { success: false, error: "工程が見つかりません" };
        }

        const result = await taskApplicationService.createTask({
            name: parsed.data.name,
            wbsId: wbsId,
            assigneeId: parsed.data.assigneeId ? Number(parsed.data.assigneeId) : undefined,
            phaseId: parsed.data.phaseId,
            status: parsed.data.status,
            yoteiStartDate: new Date(parsed.data.periods[0].startDate),
            yoteiEndDate: new Date(parsed.data.periods[0].endDate),
            yoteiKosu: parsed.data.periods[0].kosus.find(k => k.type === 'NORMAL')?.kosu ?? 0,
        });

        if (!result.success) {
            return { success: false, error: result.error ?? "タスクの作成に失敗しました" };
        }
        return { success: true, data: undefined };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "タスクの作成に失敗しました" };
    }
}

const updateTaskSchema = z.object({
    id: z.number(),
    taskNo: z.string().optional(),
    name: z.string().min(1, "タスク名は必須です。"),
    yoteiStart: z.coerce.date().optional(),
    yoteiEnd: z.coerce.date().optional(),
    yoteiKosu: z.number().optional(),
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]),
    assigneeId: z.number().optional(),
    phaseId: z.number().optional(),
});

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
): Promise<ActionResult<void>> {
    const parsed = updateTaskSchema.safeParse(taskData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await taskApplicationService.updateTask({
        wbsId: wbsId,
        updateTask: {
            ...parsed.data,
        }
    });

    if (!result.success) {
        return { success: false, error: result.error ?? "タスクの更新に失敗しました" };
    }

    revalidatePath(`/wbs/${wbsId}/gannt`);
    return { success: true, data: undefined };
}

export async function deleteTask(taskId: number): Promise<ActionResult<void>> {
    const parsed = z.number().int().positive().safeParse(taskId);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await taskApplicationService.deleteTask(taskId);
    if (!result.success) {
        return { success: false, error: result.error ?? "タスクの削除に失敗しました" };
    }

    revalidatePath('/wbs');
    return { success: true, data: undefined };
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
