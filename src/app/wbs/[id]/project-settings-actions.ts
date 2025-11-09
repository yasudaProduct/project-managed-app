"use server";

import prisma from "@/lib/prisma/prisma";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";

export async function getProjectSettings(projectId: string) {
    const settings = await prisma.projectSettings.findUnique({ where: { projectId } });
    return settings ?? {
        projectId,
        roundToQuarter: false,
        progressMeasurementMethod: 'SELF_REPORTED' as ProgressMeasurementMethod
    };
}

export async function updateProjectSettings(
    projectId: string,
    roundToQuarter: boolean,
    progressMeasurementMethod?: ProgressMeasurementMethod
) {
    await prisma.projectSettings.upsert({
        where: { projectId },
        create: {
            projectId,
            roundToQuarter,
            progressMeasurementMethod: progressMeasurementMethod || 'SELF_REPORTED'
        },
        update: {
            roundToQuarter,
            ...(progressMeasurementMethod && { progressMeasurementMethod })
        },
    });
}


