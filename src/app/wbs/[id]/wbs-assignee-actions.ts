"use server"

import prisma from '@/lib/prisma'
import { WbsAssignee } from './assignee/columns'

export async function getWbsAssignees(wbsId: number): Promise<WbsAssignee[]> {
    const assignees = await prisma.wbsAssignee.findMany({
        where: { wbsId },
        include: { assignee: true },
    })
    return assignees
}

export async function deleteWbsAssignee(id: number): Promise<{ success: boolean, error?: string }> {
    //TODO 担当者が担当しているタスクは担当者IDをnullにする
    await prisma.wbsAssignee.delete({ where: { id } })
    return { success: true }
}