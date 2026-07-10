import type { ProjectSettingsData } from "@/types/project-settings";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import type { ForecastCalculationMethod } from "@/types/forecast-calculation-method";
import type { EvmForecastMethod } from "@/types/evm-forecast-method";
import type { EvmBufferCostMethod } from "@/types/evm-buffer-cost-method";
import type { EvmPvDistribution } from "@/types/evm-pv-distribution";
import type { SchedulingSettings } from "@/types/scheduling-settings";

export interface UpsertProjectSettingsInput {
  roundToQuarter: boolean;
  progressMeasurementMethod?: ProgressMeasurementMethod;
  forecastCalculationMethod?: ForecastCalculationMethod;
  evmForecastMethod?: EvmForecastMethod;
}

export interface UpsertDashboardSettingsInput {
  deadlineAlertDays: number;
  costOverrunThresholdPct: number;
}

export interface UpsertEvmSettingsInput {
  evmBufferCostMethod?: EvmBufferCostMethod;
  evmPvDistribution?: EvmPvDistribution;
  evmHealthyThresholdPct?: number;
  evmWarningThresholdPct?: number;
}

/**
 * project_settings テーブルへのアクセスを担うリポジトリ（Application層のポート）。
 * schedulingSettings（Json列）は SchedulingSettings への正規化を含めてここで扱う。
 */
export interface IProjectSettingsRepository {
  findByProjectId(projectId: string): Promise<ProjectSettingsData | null>;
  upsertProjectSettings(
    projectId: string,
    data: UpsertProjectSettingsInput
  ): Promise<void>;
  upsertDashboardSettings(
    projectId: string,
    data: UpsertDashboardSettingsInput
  ): Promise<void>;
  upsertEvmSettings(
    projectId: string,
    data: UpsertEvmSettingsInput
  ): Promise<void>;
  findSchedulingSettings(projectId: string): Promise<SchedulingSettings>;
  upsertSchedulingSettings(
    projectId: string,
    settings: SchedulingSettings
  ): Promise<void>;
}
