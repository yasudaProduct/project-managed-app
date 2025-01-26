"use server"

import prisma from '@/lib/prisma'
import { Wbs } from '@/types/wbs'
import { revalidatePath } from 'next/cache'

// モックデータ
const wbsList: Wbs[] = [
    { id: 1, name: "要件定義", projectId: "1" },
    { id: 2, name: "設計", projectId: "1" },
    { id: 3, name: "開発", projectId: "2" },
    { id: 4, name: "テスト", projectId: "2" },
]

export async function getWbsByProjectId(projectId: string): Promise<Wbs[]> {
    return wbsList.filter(wbs => wbs.projectId === projectId)
}

export async function getWbsById(id: number) {
    const wbs = await prisma.wbs.findUnique({
        where: {
            id: Number(id),
        },
    })
    return wbs
}

export async function createWbs(projectId: string, wbsData: { name: string }): Promise<{ success: boolean; wbs: Wbs }> {
    const newWbs: Wbs = {
        id: wbsList.length + 1,
        projectId,
        ...wbsData,
    }
    wbsList.push(newWbs)

    revalidatePath(`/projects/${projectId}/wbs`)
    return { success: true, wbs: newWbs }
}

export async function updateWbs(id: number, wbsData: { name: string }): Promise<{ success: boolean; wbs?: Wbs }> {
    const index = wbsList.findIndex(wbs => wbs.id === id)
    if (index !== -1) {
        wbsList[index] = { ...wbsList[index], ...wbsData }

        revalidatePath(`/projects/${wbsList[index].projectId}/wbs`)
        return { success: true, wbs: wbsList[index] }
    }
    return { success: false }
}

export async function createWbsPhase(wbsId: number, wbsPhaseData: { name: string; seq: number }) {

    const cheack = await prisma.wbsPhase.findFirst({
        where: {
            wbsId: wbsId,
            name: wbsPhaseData.name,
        },
    });

    if (cheack) {
        return { success: false, message: "すでにフェーズが存在します。" };
    }

    const newWbsPhase = await prisma.wbsPhase.create({
        data: {
            wbsId,
            ...wbsPhaseData,
        },
    });
    return { success: true, wbsPhase: newWbsPhase };
}
