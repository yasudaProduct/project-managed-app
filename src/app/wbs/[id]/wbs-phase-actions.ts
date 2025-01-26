"use server"

import { revalidatePath } from 'next/cache'
import { WbsPhase, WbsTask } from '@/types/wbs'

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

const wbsTasks: WbsTask[] = [
    {
        id: "1",
        wbsId: 1,
        phaseId: 1,
        name: "要件定義",
        assigneeId: "1",
        assignee: { id: "1", name: "山田太郎" },
        kijunStartDate: "2023-06-01",
        kijunEndDate: "2023-06-07",
        kijunKosu: 40,
        yoteiStartDate: "2023-06-01",
        yoteiEndDate: "2023-06-07",
        yoteiKosu: 40,
        jissekiStartDate: null,
        jissekiEndDate: null,
        jissekiKosu: null,
        status: "NOT_STARTED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

export async function getWbsPhases(wbsId: number): Promise<WbsPhase[]> {
    const phases = wbsPhases.filter(phase => phase.wbsId === wbsId)
    return phases.map(phase => ({
        ...phase,
        tasks: wbsTasks.filter(task => task.phaseId === phase.id),
    }))
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
