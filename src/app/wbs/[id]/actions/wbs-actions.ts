"use server"

import { z } from "zod"
import { revalidatePath } from 'next/cache'
import { container } from "@/lib/inversify.config"
import { SYMBOL } from "@/types/symbol"
import type { IWbsApplicationService } from "@/applications/wbs/wbs-application-service"
import type { Assignee, Wbs, WbsBuffer } from '@/types/wbs'
import type { ActionResult } from "@/types/action-result"

function getWbsApplicationService(): IWbsApplicationService {
    return container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService);
}

export async function getWbsByProjectId(projectId: string): Promise<Wbs[]> {
    return (await getWbsApplicationService().getWbsAll(projectId)) ?? [];
}

export async function getLatestWbsByProjectId(projectId: string): Promise<Wbs | null> {
    return getWbsApplicationService().getLatestWbsByProjectId(projectId);
}

export async function getWbsById(id: number): Promise<Wbs | null> {
    return getWbsApplicationService().getWbsById(Number(id));
}

const wbsInputSchema = z.object({
    name: z.string().min(1, "WBS名は必須です。"),
});

export async function createWbs(projectId: string, wbsData: { name: string }): Promise<ActionResult<{ id: number }>> {
    const parsed = wbsInputSchema.safeParse(wbsData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await getWbsApplicationService().createWbs({ name: parsed.data.name, projectId });
    if (!result.success || result.id === undefined) {
        return { success: false, error: result.error ?? "WBSの作成に失敗しました。" };
    }

    revalidatePath(`/projects/${projectId}/wbs`)
    return { success: true, data: { id: result.id } };
}

export async function updateWbs(id: number, wbsData: { name: string }): Promise<ActionResult<{ id: number }>> {
    const parsed = wbsInputSchema.safeParse(wbsData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await getWbsApplicationService().updateWbs({ id: Number(id), name: parsed.data.name });
    if (!result.success || result.id === undefined) {
        return { success: false, error: result.error ?? "WBSの更新に失敗しました。" };
    }

    return { success: true, data: { id: result.id } };
}

const wbsPhaseInputSchema = z.object({
    name: z.string().min(1, "フェーズ名は必須です。"),
    code: z.string().min(1, "コードは必須です。"),
    seq: z.number(),
    templateId: z.string().optional(),
});

export async function createWbsPhase(wbsId: number, wbsPhaseData: { name: string; code: string; seq: number; templateId?: string; }): Promise<ActionResult<{ id: number }>> {
    const parsed = wbsPhaseInputSchema.safeParse(wbsPhaseData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await getWbsApplicationService().createWbsPhase({
        wbsId: Number(wbsId),
        name: parsed.data.name,
        code: parsed.data.code,
        seq: parsed.data.seq,
        templateId: parsed.data.templateId,
    });
    if (!result.success || result.id === undefined) {
        return { success: false, error: result.error ?? "フェーズの作成に失敗しました。" };
    }

    return { success: true, data: { id: result.id } };
}

const wbsAssigneeInputSchema = z.object({
    assigneeId: z.string().min(1, "担当者を選択してください。"),
    rate: z.number().min(0).max(100),
    costPerHour: z.number().min(0),
    seq: z.number().min(0),
});

export async function createWbsAssignee(wbsId: number, assigneeId: string, rate: number, costPerHour: number, seq: number): Promise<ActionResult<{ id: number }>> {
    const parsed = wbsAssigneeInputSchema.safeParse({ assigneeId, rate, costPerHour, seq });
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await getWbsApplicationService().createAssignee({
        wbsId: Number(wbsId),
        assigneeId: parsed.data.assigneeId,
        rate: parsed.data.rate / 100,
        costPerHour: parsed.data.costPerHour,
        seq: parsed.data.seq,
    });
    if (!result.success || result.id === undefined) {
        return { success: false, error: result.error ?? "担当者の追加に失敗しました。" };
    }

    return { success: true, data: { id: result.id } };
}

export async function updateWbsAssignee(id: number, assigneeId: string, rate: number, costPerHour: number, seq: number): Promise<ActionResult<{ id: number }>> {
    const parsed = wbsAssigneeInputSchema.safeParse({ assigneeId, rate, costPerHour, seq });
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await getWbsApplicationService().updateAssignee({
        id: Number(id),
        assigneeId: parsed.data.assigneeId,
        rate: parsed.data.rate / 100,
        costPerHour: parsed.data.costPerHour,
        seq: parsed.data.seq,
    });
    if (!result.success || result.id === undefined) {
        return { success: false, error: result.error ?? "担当者の更新に失敗しました。" };
    }

    return { success: true, data: { id: result.id } };
}

export async function getWbsBuffers(wbsId: number): Promise<WbsBuffer[]> {
    return getWbsApplicationService().getBuffers(Number(wbsId));
}

export async function getAssignees(wbsId: number): Promise<Assignee[]> {
    const assignees = await getWbsApplicationService().getAssignees(Number(wbsId));

    return (assignees ?? [])
        .filter((a): a is { assignee: Assignee; wbsId: number } => a.assignee !== null)
        .map((a) => a.assignee);
}
