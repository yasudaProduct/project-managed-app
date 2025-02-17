"use server";

import prisma from "@/lib/prisma";

export const getPhases = async () => {
    return await prisma.phaseTemplate.findMany({
        orderBy: {
            seq: "asc",
        },
    });
};

export const getPhaseById = async (id: number) => {

    return await prisma.phaseTemplate.findUnique({
        where: {
            id: Number(id),
        },
    });
};

export const createPhase = async (phase: { name: string, code: string, seq: number }) => {

    const cheackPhase = await prisma.phaseTemplate.findFirst({ where: { name: phase.name } });
    if (cheackPhase) {
        return { success: false, error: "同じ工程がすでに存在します。" };
    }

    const newPhase = await prisma.phaseTemplate.create({ data: phase });
    return { success: true, phase: newPhase };
};

export const updatePhase = async (id: number, phase: { name: string, code: string, seq: number }) => {
    const cheackPhase = await prisma.phaseTemplate.findFirst({ where: { name: phase.name, id: { not: id } } });
    if (cheackPhase) {
        return { success: false, error: "同じ工程がすでに存在します。" };
    }

    const updatedPhase = await prisma.phaseTemplate.update({ where: { id }, data: phase });
    return { success: true, phase: updatedPhase };
};

export const deletePhase = async (id: number) => {
    return await prisma.phaseTemplate.delete({ where: { id } });
};