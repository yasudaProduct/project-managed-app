"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IPhaseApplicationService } from "@/applications/phase/phase-application-service";
import type { ActionResult } from "@/types/action-result";

function getPhaseApplicationService(): IPhaseApplicationService {
    return container.get<IPhaseApplicationService>(SYMBOL.IPhaseApplicationService);
}

const phaseTemplateSchema = z.object({
    name: z.string().min(1, "工程名は必須です。"),
    code: z.string().min(1, "コードは必須です。").regex(/^[a-zA-Z0-9]+$/, "コードは英数字で入力してください。"),
    seq: z.number(),
});

export const getPhaseTemplates = async () => {
    return await getPhaseApplicationService().getAllPhaseTemplates() ?? [];
};

export const getPhaseById = async (id: number) => {
    return await getPhaseApplicationService().getPhaseTemplateById(Number(id));
};

export const createPhaseTemplate = async (phase: { name: string, code: string, seq: number }) => {
    const parsed = phaseTemplateSchema.safeParse(phase);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await getPhaseApplicationService().createPhaseTemplate(parsed.data);
    if (!result.success) {
        return { success: false, error: "工程テンプレートの作成に失敗しました。" };
    }
    return { success: true, phase: result.phase };
};

export const updatePhase = async (id: number, phase: { name: string, code: string, seq: number }) => {
    const parsed = phaseTemplateSchema.safeParse(phase);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await getPhaseApplicationService().updatePhaseTemplate({ id, ...parsed.data });
    if (!result.success) {
        return { success: false, error: "同じ工程がすでに存在します。" };
    }
    return { success: true, phase: result.phase };
};

export const deletePhase = async (id: number): Promise<ActionResult<void>> => {
    const result = await getPhaseApplicationService().deletePhaseTemplate(id);
    if (!result.success) {
        return { success: false, error: result.error ?? "工程テンプレートの削除に失敗しました。" };
    }
    return { success: true, data: undefined };
};
