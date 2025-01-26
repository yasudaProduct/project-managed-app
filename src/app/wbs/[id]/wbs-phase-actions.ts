"use server"

import { revalidatePath } from 'next/cache'
import { WbsPhase } from '@/types/wbs'
import prisma from '@/lib/prisma'

// モックデータ
const wbsPhases: WbsPhase[] = [
    {
        id: 1,
        wbsId: 1,
        seq: 1,
        name: "計画",
        tasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 2,
        wbsId: 1,
        seq: 2,
        name: "実行",
        tasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

export async function getWbsPhases(wbsId: number) {
    const phases = await prisma.wbsPhase.findMany({
        where: {
            wbsId: wbsId,
        },
        include: {
            tasks: true,
        },
    })
    return phases
}

export async function createWbsPhase(wbsId: number, phaseData: { name: string; seq: number }): Promise<{ success: boolean; phase: WbsPhase }> {
    const newPhase: WbsPhase = {
        id: wbsPhases.length + 1,
        wbsId,
        ...phaseData,
        tasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
    wbsPhases.push(newPhase)

    revalidatePath(`/wbs/${wbsId}`)
    return { success: true, phase: newPhase }
}

export async function updateWbsPhase(id: number, phaseData: { name?: string; seq?: number }): Promise<{ success: boolean; phase?: WbsPhase }> {
    const index = wbsPhases.findIndex(phase => phase.id === id)
    if (index !== -1) {
        wbsPhases[index] = { ...wbsPhases[index], ...phaseData, updatedAt: new Date().toISOString() }

        revalidatePath(`/wbs/${wbsPhases[index].wbsId}`)
        return { success: true, phase: wbsPhases[index] }
    }
    return { success: false }
}
