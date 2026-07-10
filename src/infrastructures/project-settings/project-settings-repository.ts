import type { Prisma, PrismaClient } from "@prisma/client";
import { inject, injectable } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type {
  IProjectSettingsRepository,
  UpsertDashboardSettingsInput,
  UpsertEvmSettingsInput,
  UpsertProjectSettingsInput,
} from "@/applications/project-settings/iproject-settings-repository";
import type { ProjectSettingsData } from "@/types/project-settings";
import {
  parseSchedulingSettings,
  type SchedulingSettings,
} from "@/types/scheduling-settings";

@injectable()
export class ProjectSettingsRepository implements IProjectSettingsRepository {
  constructor(
    @inject(SYMBOL.PrismaClient) private readonly prisma: PrismaClient
  ) {}

  async findByProjectId(projectId: string): Promise<ProjectSettingsData | null> {
    const settings = await this.prisma.projectSettings.findUnique({
      where: { projectId },
    });
    if (!settings) return null;

    return {
      projectId: settings.projectId,
      roundToQuarter: settings.roundToQuarter,
      progressMeasurementMethod: settings.progressMeasurementMethod,
      forecastCalculationMethod: settings.forecastCalculationMethod,
      evmForecastMethod: settings.evmForecastMethod,
      evmBufferCostMethod: settings.evmBufferCostMethod,
      evmPvDistribution: settings.evmPvDistribution,
      evmHealthyThresholdPct: settings.evmHealthyThresholdPct,
      evmWarningThresholdPct: settings.evmWarningThresholdPct,
      deadlineAlertDays: settings.deadlineAlertDays,
      costOverrunThresholdPct: settings.costOverrunThresholdPct,
    };
  }

  async upsertProjectSettings(
    projectId: string,
    data: UpsertProjectSettingsInput
  ): Promise<void> {
    await this.prisma.projectSettings.upsert({
      where: { projectId },
      create: {
        projectId,
        roundToQuarter: data.roundToQuarter,
        progressMeasurementMethod: data.progressMeasurementMethod || "SELF_REPORTED",
        forecastCalculationMethod: data.forecastCalculationMethod || "REALISTIC",
        evmForecastMethod: data.evmForecastMethod || "CPI_ONLY",
      },
      update: {
        roundToQuarter: data.roundToQuarter,
        ...(data.progressMeasurementMethod && {
          progressMeasurementMethod: data.progressMeasurementMethod,
        }),
        ...(data.forecastCalculationMethod && {
          forecastCalculationMethod: data.forecastCalculationMethod,
        }),
        ...(data.evmForecastMethod && { evmForecastMethod: data.evmForecastMethod }),
      },
    });
  }

  async upsertDashboardSettings(
    projectId: string,
    data: UpsertDashboardSettingsInput
  ): Promise<void> {
    await this.prisma.projectSettings.upsert({
      where: { projectId },
      create: {
        projectId,
        deadlineAlertDays: data.deadlineAlertDays,
        costOverrunThresholdPct: data.costOverrunThresholdPct,
      },
      update: {
        deadlineAlertDays: data.deadlineAlertDays,
        costOverrunThresholdPct: data.costOverrunThresholdPct,
      },
    });
  }

  async upsertEvmSettings(
    projectId: string,
    data: UpsertEvmSettingsInput
  ): Promise<void> {
    await this.prisma.projectSettings.upsert({
      where: { projectId },
      create: {
        projectId,
        ...(data.evmBufferCostMethod && { evmBufferCostMethod: data.evmBufferCostMethod }),
        ...(data.evmPvDistribution && { evmPvDistribution: data.evmPvDistribution }),
        ...(data.evmHealthyThresholdPct !== undefined && {
          evmHealthyThresholdPct: data.evmHealthyThresholdPct,
        }),
        ...(data.evmWarningThresholdPct !== undefined && {
          evmWarningThresholdPct: data.evmWarningThresholdPct,
        }),
      },
      update: {
        ...(data.evmBufferCostMethod && { evmBufferCostMethod: data.evmBufferCostMethod }),
        ...(data.evmPvDistribution && { evmPvDistribution: data.evmPvDistribution }),
        ...(data.evmHealthyThresholdPct !== undefined && {
          evmHealthyThresholdPct: data.evmHealthyThresholdPct,
        }),
        ...(data.evmWarningThresholdPct !== undefined && {
          evmWarningThresholdPct: data.evmWarningThresholdPct,
        }),
      },
    });
  }

  async findSchedulingSettings(projectId: string): Promise<SchedulingSettings> {
    const settings = await this.prisma.projectSettings.findUnique({
      where: { projectId },
    });
    return parseSchedulingSettings(settings?.schedulingSettings);
  }

  async upsertSchedulingSettings(
    projectId: string,
    settings: SchedulingSettings
  ): Promise<void> {
    const value = settings as unknown as Prisma.InputJsonValue;
    await this.prisma.projectSettings.upsert({
      where: { projectId },
      create: { projectId, schedulingSettings: value },
      update: { schedulingSettings: value },
    });
  }
}
