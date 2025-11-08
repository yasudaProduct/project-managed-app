"use server"

import { WbsPhase } from '@/types/wbs'
import prisma from '@/lib/prisma/prisma'

export async function getWbsPhases(wbsId: number) {
    const phases = await prisma.wbsPhase.findMany({
        where: {
            wbsId: Number(wbsId),
        },
        select: {
            id: true,
            name: true,
            code: true,
            seq: true,
            wbsId: true,
        },
        orderBy: {
            seq: "asc",
        },
    })

    return phases
}

export async function createWbsPhase(wbsId: number, phaseData: { name: string; code: string; seq: number }): Promise<{ success: boolean; phase?: WbsPhase; error?: string }> {

    const cheackPhase = await prisma.wbsPhase.findFirst({ where: { name: phaseData.name } });
    if (cheackPhase) {
        return { success: false, error: "同じ工程がすでに存在します。" };
    }

    const newPhase = await prisma.wbsPhase.create({
        data: {
            wbsId,
            name: phaseData.name,
            code: phaseData.code,
            seq: phaseData.seq,
        },
    })
    return { success: true, phase: newPhase }
}

export async function updateWbsPhase(id: number, phaseData: { name?: string; code?: string; seq?: number }): Promise<{ success: boolean; phase?: WbsPhase; error?: string }> {
    const updatedPhase = await prisma.wbsPhase.update({
        where: { id },
        data: phaseData,
    })
    return { success: true, phase: updatedPhase }
}

export async function deleteWbsPhase(id: number): Promise<{ success: boolean; error?: string }> {
    //TODO フェーズが担当しているタスクはフェーズIDをnullにする
    await prisma.wbsPhase.delete({ where: { id } });
    return { success: true }
}