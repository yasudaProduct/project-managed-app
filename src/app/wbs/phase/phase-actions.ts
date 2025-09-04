"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IPhaseApplicationService } from "@/applications/phase/phase-application-service";

import prisma from "@/lib/prisma";

const phaseApplicationService = container.get<IPhaseApplicationService>(SYMBOL.IPhaseApplicationService);

export const getPhaseTemplates = async () => {
    return await phaseApplicationService.getAllPhaseTemplates() ?? [];
};

// TODO: サービス呼び出し
export const getPhaseById = async (id: number) => {

    return await prisma.phaseTemplate.findUnique({
        where: {
            id: Number(id),
        },
    });
};

export const createPhaseTemplate = async (phase: { name: string, code: string, seq: number }) => {

    const result = await phaseApplicationService.createPhaseTemplate(phase);
    if (!result.success) {
        return { success: false, error: "工程テンプレートの作成に失敗しました。" };
    }
    return { success: true, phase: result.phase };
};

// TODO: サービス呼び出し
export const updatePhase = async (id: number, phase: { name: string, code: string, seq: number }) => {
    const cheackPhase = await prisma.phaseTemplate.findFirst({ where: { name: phase.name, id: { not: id } } });
    if (cheackPhase) {
        return { success: false, error: "同じ工程がすでに存在します。" };
    }

    const updatedPhase = await prisma.phaseTemplate.update({ where: { id }, data: phase });
    return { success: true, phase: updatedPhase };
};

// TODO: サービス呼び出し
export const deletePhase = async (id: number) => {
    return await prisma.phaseTemplate.delete({ where: { id } });
};