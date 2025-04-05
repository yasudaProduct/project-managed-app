"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getWbsByProjectId(projectId: string) {
    const wbs = await prisma.wbs.findMany({
        where: {
            projectId: projectId,
        },
    })
    return wbs
}

export async function getWbsById(id: number) {
    const wbs = await prisma.wbs.findUnique({
        where: {
            id: id,
        },
    })
    return wbs
}

export async function createWbs(projectId: string, wbsData: { name: string }) {

    const newWbs = await prisma.wbs.create({
        data: {
            projectId,
            ...wbsData,
        },
    })
    revalidatePath(`/projects/${projectId}/wbs`)
    return { success: true, wbs: newWbs }
}


export async function updateWbs(id: number, wbsData: { name: string }) {

    const cheack = await prisma.wbs.findFirst({
        where: {
            id: {
                not: id,
            },
            name: wbsData.name,
        },
    })
    if (cheack) {
        return { success: false, error: "同じ名前のWBSが存在します" }
    }

    const wbs = await prisma.wbs.update({
        where: {
            id: id,
        },
        data: {
            ...wbsData,
        },
    })
    revalidatePath(`/projects/${wbs.projectId}/wbs`)
    return { success: true, wbs: wbs }
}

