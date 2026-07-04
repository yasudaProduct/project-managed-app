"use server"

import { container } from "@/lib/inversify.config"
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service"
import { SYMBOL } from "@/types/symbol"
import { WbsAssignee } from '../assignee/columns'

const wbsApplicationService = container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService);

export async function getWbsAssignees(wbsId: number): Promise<WbsAssignee[]> {
    const assignees = await wbsApplicationService.getAssignees(wbsId);

    return (assignees ?? [])
        .filter((a) => a.assignee !== null)
        .map((a) => ({
            id: a.assignee!.id,
            assignee: {
                id: a.assignee!.userId,
                name: a.assignee!.name,
                rate: a.assignee!.rate,
                seq: a.assignee!.seq,
            },
            wbsId: a.wbsId,
        }));
}

export async function deleteWbsAssignee(id: number): Promise<{ success: boolean, error?: string }> {
    const result = await wbsApplicationService.deleteAssignee(id);
    if (!result.success) {
        return { success: false, error: result.error };
    }
    return { success: true };
}