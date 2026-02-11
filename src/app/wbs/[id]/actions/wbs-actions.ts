"use server"

import prisma from '@/lib/prisma/prisma'
import { Assignee } from '@/types/wbs'
import { revalidatePath } from 'next/cache'

export async function getWbsById(id: number) {
    const wbs = await prisma.wbs.findUnique({
        where: {
            id: Number(id),
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
    });

    revalidatePath(`/projects/${projectId}/wbs`)
    return { success: true, wbs: newWbs }
}

export async function updateWbs(id: number, wbsData: { name: string }) {
    const wbs = await prisma.wbs.update({
        where: {
            id: Number(id),
        },
        data: wbsData,
    });
    return { success: true, wbs: wbs }
}

export async function createWbsPhase(wbsId: number, wbsPhaseData: { name: string; code: string; seq: number; templateId?: string; }) {

    const cheack = await prisma.wbsPhase.findFirst({
        where: {
            wbsId: wbsId,
            name: wbsPhaseData.name,
        },
    });

    if (cheack) {
        return { success: false, message: "すでにフェーズが存在します。" };
    }

    const templateId = wbsPhaseData.templateId && wbsPhaseData.templateId !== "new"
        ? Number(wbsPhaseData.templateId)
        : null;

    const newWbsPhase = await prisma.wbsPhase.create({
        data: {
            wbsId,
            name: wbsPhaseData.name,
            code: wbsPhaseData.code,
            seq: wbsPhaseData.seq,
            templateId,
        },
    });
    return { success: true, wbsPhase: newWbsPhase };
}

export async function createWbsAssignee(wbsId: number, assigneeId: string, rate: number, costPerHour: number, seq: number) {
    const existingAssignee = await prisma.wbsAssignee.findFirst({
        where: {
            wbsId: Number(wbsId),
            assigneeId: assigneeId,
        },
    });

    if (existingAssignee) {
        return { success: false, message: "この担当者はすでに追加されています。" };
    }

    const newAssignee = await prisma.wbsAssignee.create({
        data: {
            wbsId: Number(wbsId),
            assigneeId: assigneeId,
            rate: rate / 100,
            costPerHour: costPerHour,
            seq: seq,
        },
    });

    return { success: true, assignee: newAssignee };
}

export async function updateWbsAssignee(id: number, assigneeId: string, rate: number, costPerHour: number, seq: number) {

    const existingAssignee = await prisma.wbsAssignee.findFirst({
        where: {
            id: Number(id),
        },
    });

    if (!existingAssignee) {
        return { success: false, message: "担当者が存在しません。" };
    }

    const assignee = await prisma.wbsAssignee.update({
        where: { id: Number(id) },
        data: {
            assigneeId: assigneeId,
            rate: rate / 100,
            costPerHour: costPerHour,
            seq: seq,
        },
    });
    return { success: true, assignee: assignee };
}

export async function getWbsBuffers(wbsId: number) {
    const buffers = await prisma.wbsBuffer.findMany({
        where: { wbsId: wbsId },
    });
    return buffers;
}

export async function getAssignees(wbsId: number): Promise<Assignee[]> {
    const assignees = await prisma.wbsAssignee.findMany({
        where: { wbsId: wbsId },
        include: {
            assignee: true,
        },
    });
    return assignees.map((assignee) => ({
        ...assignee.assignee,
        id: Number(assignee.assignee.id),
        userId: assignee.assignee.id,
        rate: assignee.rate,
        costPerHour: assignee.costPerHour,
        seq: assignee.seq,
    }));
}
