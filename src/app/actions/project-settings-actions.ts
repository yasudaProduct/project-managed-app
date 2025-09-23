"use server";

import prisma from "@/lib/prisma/prisma";

export async function getProjectSettings(projectId: string) {
    const settings = await prisma.projectSettings.findUnique({ where: { projectId } });
    return settings ?? { projectId, roundToQuarter: false };
}

export async function updateProjectSettings(projectId: string, roundToQuarter: boolean) {
    await prisma.projectSettings.upsert({
        where: { projectId },
        create: { projectId, roundToQuarter },
        update: { roundToQuarter },
    });
}


