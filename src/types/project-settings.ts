/**
 * プロジェクト単位の設定（進捗測定方式・見通し算出方式・ダッシュボード表示設定）。
 * project_settings テーブルに保存される（schedulingSettings / evmExcludeSettings を除く）。
 */

import type { ProgressMeasurementMethod } from "./progress-measurement";
import type { ForecastCalculationMethod } from "./forecast-calculation-method";
import type { EvmForecastMethod } from "./evm-forecast-method";

export interface ProjectSettingsData {
  projectId: string;
  roundToQuarter: boolean;
  progressMeasurementMethod: ProgressMeasurementMethod;
  forecastCalculationMethod: ForecastCalculationMethod;
  evmForecastMethod: EvmForecastMethod;
  deadlineAlertDays: number;
  costOverrunThresholdPct: number;
}

export const DEFAULT_PROJECT_SETTINGS: Omit<ProjectSettingsData, "projectId"> = {
  roundToQuarter: false,
  progressMeasurementMethod: "SELF_REPORTED",
  forecastCalculationMethod: "REALISTIC",
  evmForecastMethod: "CPI_ONLY",
  deadlineAlertDays: 1,
  costOverrunThresholdPct: 100,
};

/**
 * 未設定（レコードなし）の場合にデフォルト値で補ったプロジェクト設定を返す。
 * Server Action / Application Service / Query Handler の複数箇所から利用するため共通化する。
 */
export function withProjectSettingsDefaults(
  projectId: string,
  settings: Partial<Omit<ProjectSettingsData, "projectId">> | null
): ProjectSettingsData {
  return {
    projectId,
    roundToQuarter: settings?.roundToQuarter ?? DEFAULT_PROJECT_SETTINGS.roundToQuarter,
    progressMeasurementMethod:
      settings?.progressMeasurementMethod ?? DEFAULT_PROJECT_SETTINGS.progressMeasurementMethod,
    forecastCalculationMethod:
      settings?.forecastCalculationMethod ?? DEFAULT_PROJECT_SETTINGS.forecastCalculationMethod,
    evmForecastMethod: settings?.evmForecastMethod ?? DEFAULT_PROJECT_SETTINGS.evmForecastMethod,
    deadlineAlertDays: settings?.deadlineAlertDays ?? DEFAULT_PROJECT_SETTINGS.deadlineAlertDays,
    costOverrunThresholdPct:
      settings?.costOverrunThresholdPct ?? DEFAULT_PROJECT_SETTINGS.costOverrunThresholdPct,
  };
}
