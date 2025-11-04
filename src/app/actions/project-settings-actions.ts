"use server";

import prisma from "@/lib/prisma/prisma";
import { ProjectSettingsUpdateInput } from "@/types/project-settings";
import { Decimal } from "@prisma/client/runtime/library";

export async function getProjectSettings(projectId: string) {
    const settings = await prisma.projectSettings.findUnique({ where: { projectId } });

    // デフォルト値を設定
    return settings ?? {
        projectId,
        roundToQuarter: false,
        standardWorkingHours: new Decimal(7.5),
        considerPersonalSchedule: true,
        scheduleIncludePatterns: ["休暇", "有給", "休み", "全休", "代休", "振休", "有給休暇"],
        scheduleExcludePatterns: [],
        scheduleMatchType: "CONTAINS" as const
    };
}

export async function updateProjectSettings(projectId: string, updateData: ProjectSettingsUpdateInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: any = {};

    if (updateData.roundToQuarter !== undefined) {
        updatePayload.roundToQuarter = updateData.roundToQuarter;
    }
    if (updateData.standardWorkingHours !== undefined) {
        updatePayload.standardWorkingHours = new Decimal(updateData.standardWorkingHours);
    }
    if (updateData.considerPersonalSchedule !== undefined) {
        updatePayload.considerPersonalSchedule = updateData.considerPersonalSchedule;
    }
    if (updateData.scheduleIncludePatterns !== undefined) {
        updatePayload.scheduleIncludePatterns = updateData.scheduleIncludePatterns;
    }
    if (updateData.scheduleExcludePatterns !== undefined) {
        updatePayload.scheduleExcludePatterns = updateData.scheduleExcludePatterns;
    }
    if (updateData.scheduleMatchType !== undefined) {
        updatePayload.scheduleMatchType = updateData.scheduleMatchType;
    }

    await prisma.projectSettings.upsert({
        where: { projectId },
        create: {
            projectId,
            roundToQuarter: updateData.roundToQuarter ?? false,
            standardWorkingHours: updateData.standardWorkingHours ? new Decimal(updateData.standardWorkingHours) : new Decimal(7.5),
            considerPersonalSchedule: updateData.considerPersonalSchedule ?? true,
            scheduleIncludePatterns: updateData.scheduleIncludePatterns ?? ["休暇", "有給", "休み", "全休", "代休", "振休", "有給休暇"],
            scheduleExcludePatterns: updateData.scheduleExcludePatterns ?? [],
            scheduleMatchType: updateData.scheduleMatchType ?? "CONTAINS"
        },
        update: updatePayload,
    });
}


