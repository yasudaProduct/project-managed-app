"use server";

import prisma from "@/lib/prisma/prisma";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import type { ForecastCalculationMethod } from "@/types/forecast-calculation-method";

export async function getProjectSettings(projectId: string) {
    const settings = await prisma.projectSettings.findUnique({ where: { projectId } });
    return settings ?? {
        projectId,
        roundToQuarter: false,
        progressMeasurementMethod: 'SELF_REPORTED' as ProgressMeasurementMethod,
        forecastCalculationMethod: 'REALISTIC' as ForecastCalculationMethod,
        deadlineAlertDays: 1,
        costOverrunThresholdPct: 100,
    };
}

export async function updateProjectSettings(
    projectId: string,
    roundToQuarter: boolean,
    progressMeasurementMethod?: ProgressMeasurementMethod,
    forecastCalculationMethod?: ForecastCalculationMethod
) {
    await prisma.projectSettings.upsert({
        where: { projectId },
        create: {
            projectId,
            roundToQuarter,
            progressMeasurementMethod: progressMeasurementMethod || 'SELF_REPORTED',
            forecastCalculationMethod: forecastCalculationMethod || 'REALISTIC'
        },
        update: {
            roundToQuarter,
            ...(progressMeasurementMethod && { progressMeasurementMethod }),
            ...(forecastCalculationMethod && { forecastCalculationMethod })
        },
    });
}

export async function updateDashboardSettings(
    projectId: string,
    deadlineAlertDays: number,
    costOverrunThresholdPct: number,
) {
    await prisma.projectSettings.upsert({
        where: { projectId },
        create: {
            projectId,
            deadlineAlertDays,
            costOverrunThresholdPct,
        },
        update: {
            deadlineAlertDays,
            costOverrunThresholdPct,
        },
    });
}


