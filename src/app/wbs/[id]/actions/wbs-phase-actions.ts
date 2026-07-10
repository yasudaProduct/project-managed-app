"use server"

import { z } from "zod"
import { container } from "@/lib/inversify.config"
import { SYMBOL } from "@/types/symbol"
import type { IPhaseApplicationService, WbsPhaseType } from "@/applications/phase/phase-application-service"
import type { ActionResult } from "@/types/action-result"

function getPhaseApplicationService(): IPhaseApplicationService {
    return container.get<IPhaseApplicationService>(SYMBOL.IPhaseApplicationService)
}

const updateWbsPhaseSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    seq: z.number().optional(),
})

/**
 * WBSに紐づくフェーズ一覧を取得する
 */
export async function getWbsPhases(wbsId: number): Promise<WbsPhaseType[]> {
    return getPhaseApplicationService().getPhasesByWbsId(Number(wbsId))
}

/**
 * WBSフェーズを更新する
 */
export async function updateWbsPhase(
    id: number,
    wbsId: number,
    phaseData: { name?: string; code?: string; seq?: number }
): Promise<ActionResult<{ id: number }>> {
    const parsed = updateWbsPhaseSchema.safeParse(phaseData)
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" }
    }

    const result = await getPhaseApplicationService().updateWbsPhase({
        id,
        wbsId,
        ...parsed.data,
    })
    if (!result.success || !result.phase) {
        return { success: false, error: result.error ?? "フェーズの更新に失敗しました。" }
    }

    return { success: true, data: { id: result.phase.id } }
}

/**
 * WBSフェーズを削除する
 */
export async function deleteWbsPhase(id: number): Promise<ActionResult<void>> {
    //TODO フェーズが担当しているタスクはフェーズIDをnullにする
    const result = await getPhaseApplicationService().deleteWbsPhase(id)
    if (!result.success) {
        return { success: false, error: result.error ?? "フェーズの削除に失敗しました。" }
    }

    return { success: true, data: undefined }
}
