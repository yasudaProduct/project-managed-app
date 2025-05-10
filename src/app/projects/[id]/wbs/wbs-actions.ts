"use server"

import { revalidatePath } from "next/cache"
import { container } from "@/lib/inversify.config"
import { SYMBOL } from "@/types/symbol"
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service"

const wbsApplicationService = container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService)

export async function getWbsByProjectId(projectId: string) {
    const wbs = await wbsApplicationService.getWbsAll(projectId)
    return wbs
}

export async function getWbsById(id: number) {
    const wbs = await wbsApplicationService.getWbsById(id)
    return wbs
}

export async function createWbs(projectId: string, wbsData: { name: string }) {

    const newWbs = await wbsApplicationService.createWbs({
        name: wbsData.name,
        projectId: projectId,
    })

    revalidatePath(`/projects/${projectId}/wbs`)
    return { success: true, wbs: newWbs }
}


export async function updateWbs(id: number, wbsData: { name: string }) {

    const { id: updatedId } = await wbsApplicationService.updateWbs({
        id: id,
        name: wbsData.name,
    })

    const wbs = await wbsApplicationService.getWbsById(updatedId!);

    revalidatePath(`/projects/${wbs?.projectId}/wbs`)
    return { success: true, wbs: wbs }
}

