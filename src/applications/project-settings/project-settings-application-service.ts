import { inject, injectable } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type { ActionResult } from "@/types/action-result";
import type { ProjectSettingsData } from "@/types/project-settings";
import { withProjectSettingsDefaults } from "@/types/project-settings";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import type { ForecastCalculationMethod } from "@/types/forecast-calculation-method";
import type { EvmForecastMethod } from "@/types/evm-forecast-method";
import type { SchedulingSettings } from "@/types/scheduling-settings";
import type {
  IProjectSettingsRepository,
  UpsertEvmSettingsInput,
} from "./iproject-settings-repository";

export interface IProjectSettingsApplicationService {
  getProjectSettings(projectId: string): Promise<ProjectSettingsData>;
  updateProjectSettings(
    projectId: string,
    roundToQuarter: boolean,
    progressMeasurementMethod?: ProgressMeasurementMethod,
    forecastCalculationMethod?: ForecastCalculationMethod,
    evmForecastMethod?: EvmForecastMethod
  ): Promise<ActionResult<void>>;
  updateDashboardSettings(
    projectId: string,
    deadlineAlertDays: number,
    costOverrunThresholdPct: number
  ): Promise<ActionResult<void>>;
  updateEvmSettings(
    projectId: string,
    settings: UpsertEvmSettingsInput
  ): Promise<ActionResult<void>>;
  getSchedulingSettings(projectId: string): Promise<SchedulingSettings>;
  updateSchedulingSettings(
    projectId: string,
    settings: SchedulingSettings
  ): Promise<ActionResult<void>>;
  getProgressMeasurementMethod(projectId: string): Promise<ProgressMeasurementMethod>;
}

@injectable()
export class ProjectSettingsApplicationService
  implements IProjectSettingsApplicationService
{
  constructor(
    @inject(SYMBOL.IProjectSettingsRepository)
    private readonly projectSettingsRepository: IProjectSettingsRepository
  ) {}

  public async getProjectSettings(projectId: string): Promise<ProjectSettingsData> {
    const settings = await this.projectSettingsRepository.findByProjectId(projectId);
    return settings ?? withProjectSettingsDefaults(projectId, null);
  }

  public async updateProjectSettings(
    projectId: string,
    roundToQuarter: boolean,
    progressMeasurementMethod?: ProgressMeasurementMethod,
    forecastCalculationMethod?: ForecastCalculationMethod,
    evmForecastMethod?: EvmForecastMethod
  ): Promise<ActionResult<void>> {
    if (!projectId) {
      return { success: false, error: "projectIdは必須です。" };
    }

    await this.projectSettingsRepository.upsertProjectSettings(projectId, {
      roundToQuarter,
      progressMeasurementMethod,
      forecastCalculationMethod,
      evmForecastMethod,
    });
    return { success: true, data: undefined };
  }

  public async updateDashboardSettings(
    projectId: string,
    deadlineAlertDays: number,
    costOverrunThresholdPct: number
  ): Promise<ActionResult<void>> {
    if (!projectId) {
      return { success: false, error: "projectIdは必須です。" };
    }

    await this.projectSettingsRepository.upsertDashboardSettings(projectId, {
      deadlineAlertDays,
      costOverrunThresholdPct,
    });
    return { success: true, data: undefined };
  }

  public async updateEvmSettings(
    projectId: string,
    settings: UpsertEvmSettingsInput
  ): Promise<ActionResult<void>> {
    if (!projectId) {
      return { success: false, error: "projectIdは必須です。" };
    }
    if (
      settings.evmHealthyThresholdPct !== undefined &&
      settings.evmWarningThresholdPct !== undefined &&
      settings.evmWarningThresholdPct > settings.evmHealthyThresholdPct
    ) {
      return {
        success: false,
        error: "warningしきい値はhealthyしきい値以下にしてください。",
      };
    }

    await this.projectSettingsRepository.upsertEvmSettings(projectId, settings);
    return { success: true, data: undefined };
  }

  public async getSchedulingSettings(projectId: string): Promise<SchedulingSettings> {
    return this.projectSettingsRepository.findSchedulingSettings(projectId);
  }

  public async updateSchedulingSettings(
    projectId: string,
    settings: SchedulingSettings
  ): Promise<ActionResult<void>> {
    if (!projectId) {
      return { success: false, error: "projectIdは必須です。" };
    }

    await this.projectSettingsRepository.upsertSchedulingSettings(projectId, settings);
    return { success: true, data: undefined };
  }

  public async getProgressMeasurementMethod(
    projectId: string
  ): Promise<ProgressMeasurementMethod> {
    const settings = await this.projectSettingsRepository.findByProjectId(projectId);
    return settings?.progressMeasurementMethod ?? "SELF_REPORTED";
  }
}
