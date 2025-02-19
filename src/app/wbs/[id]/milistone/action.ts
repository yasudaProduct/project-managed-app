import prisma from "@/lib/prisma";

export const getMilestones = async (wbsId: number) => {
    const milestones = await prisma.milestone.findMany({
        where: { wbsId },
    });
    return milestones;
};

export const createMilestone = async (wbsId: number, name: string, date: Date) => {
    const milestone = await prisma.milestone.create({
        data: { wbsId, name, date },
    });
    return milestone;
};