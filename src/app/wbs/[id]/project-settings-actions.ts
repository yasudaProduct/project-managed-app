"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IProjectSettingsApplicationService } from "@/applications/project-settings/project-settings-application-service";
import type { ProjectSettingsData } from "@/types/project-settings";
import type { ActionResult } from "@/types/action-result";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import type { ForecastCalculationMethod } from "@/types/forecast-calculation-method";
import type { EvmForecastMethod } from "@/types/evm-forecast-method";
import type { SchedulingSettings } from "@/types/scheduling-settings";

function getProjectSettingsApplicationService(): IProjectSettingsApplicationService {
    return container.get<IProjectSettingsApplicationService>(
        SYMBOL.IProjectSettingsApplicationService
    );
}

export async function getProjectSettings(projectId: string): Promise<ProjectSettingsData> {
    return getProjectSettingsApplicationService().getProjectSettings(projectId);
}

const updateProjectSettingsSchema = z.object({
    projectId: z.string().min(1),
    roundToQuarter: z.boolean(),
    progressMeasurementMethod: z
        .enum(["ZERO_HUNDRED", "FIFTY_FIFTY", "SELF_REPORTED"])
        .optional(),
    forecastCalculationMethod: z
        .enum(["CONSERVATIVE", "REALISTIC", "OPTIMISTIC", "PLANNED_OR_ACTUAL"])
        .optional(),
    evmForecastMethod: z.enum(["CPI_ONLY", "CPI_SPI", "PLANNED"]).optional(),
});

export async function updateProjectSettings(
    projectId: string,
    roundToQuarter: boolean,
    progressMeasurementMethod?: ProgressMeasurementMethod,
    forecastCalculationMethod?: ForecastCalculationMethod,
    evmForecastMethod?: EvmForecastMethod
): Promise<ActionResult<void>> {
    const parsed = updateProjectSettingsSchema.safeParse({
        projectId,
        roundToQuarter,
        progressMeasurementMethod,
        forecastCalculationMethod,
        evmForecastMethod,
    });
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    return getProjectSettingsApplicationService().updateProjectSettings(
        parsed.data.projectId,
        parsed.data.roundToQuarter,
        parsed.data.progressMeasurementMethod,
        parsed.data.forecastCalculationMethod,
        parsed.data.evmForecastMethod
    );
}

const updateDashboardSettingsSchema = z.object({
    projectId: z.string().min(1),
    deadlineAlertDays: z.number().int().min(0),
    costOverrunThresholdPct: z.number().int().min(0),
});

export async function updateDashboardSettings(
    projectId: string,
    deadlineAlertDays: number,
    costOverrunThresholdPct: number
): Promise<ActionResult<void>> {
    const parsed = updateDashboardSettingsSchema.safeParse({
        projectId,
        deadlineAlertDays,
        costOverrunThresholdPct,
    });
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    return getProjectSettingsApplicationService().updateDashboardSettings(
        parsed.data.projectId,
        parsed.data.deadlineAlertDays,
        parsed.data.costOverrunThresholdPct
    );
}

const updateEvmSettingsSchema = z.object({
    projectId: z.string().min(1),
    evmBufferCostMethod: z.enum(["AVERAGE_RATE", "DEFAULT_RATE", "EXCLUDE"]).optional(),
    evmPvDistribution: z.enum(["CALENDAR", "BUSINESS_DAYS"]).optional(),
    evmHealthyThresholdPct: z.number().int().min(0).max(200).optional(),
    evmWarningThresholdPct: z.number().int().min(0).max(200).optional(),
});

export async function updateEvmSettings(
    projectId: string,
    settings: {
        evmBufferCostMethod?: import("@/types/evm-buffer-cost-method").EvmBufferCostMethod;
        evmPvDistribution?: import("@/types/evm-pv-distribution").EvmPvDistribution;
        evmHealthyThresholdPct?: number;
        evmWarningThresholdPct?: number;
    }
): Promise<ActionResult<void>> {
    const parsed = updateEvmSettingsSchema.safeParse({ projectId, ...settings });
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const { projectId: pid, ...rest } = parsed.data;
    return getProjectSettingsApplicationService().updateEvmSettings(pid, rest);
}

export async function getSchedulingSettings(
    projectId: string,
): Promise<SchedulingSettings> {
    return getProjectSettingsApplicationService().getSchedulingSettings(projectId);
}

const schedulingSettingsSchema = z.object({
    steadyTaskKeywords: z.array(z.string()),
    fixedDateTaskKeywords: z.array(z.string()),
    consumeSteadyTaskCapacity: z.boolean(),
    steadyDailyHoursMode: z.enum(["PRORATE", "FIXED"]),
    steadyFixedHoursByKeyword: z.record(z.number()).optional(),
    steadyTaskForecastMode: z.enum(["PLANNED", "ACTUAL_PACE", "PLANNED_PACE"]),
});

const updateSchedulingSettingsSchema = z.object({
    projectId: z.string().min(1),
    schedulingSettings: schedulingSettingsSchema,
});

export async function updateSchedulingSettings(
    projectId: string,
    schedulingSettings: SchedulingSettings,
): Promise<ActionResult<void>> {
    const parsed = updateSchedulingSettingsSchema.safeParse({
        projectId,
        schedulingSettings,
    });
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    return getProjectSettingsApplicationService().updateSchedulingSettings(
        parsed.data.projectId,
        parsed.data.schedulingSettings
    );
}
