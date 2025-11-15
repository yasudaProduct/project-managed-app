"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { ISystemSettingsApplicationService } from "@/applications/system-settings/system-settings-application-service";

export async function getSystemSettings(): Promise<{
  standardWorkingHours: number;
  defaultUserCostPerHour: number;
}> {
  const service = container.get<ISystemSettingsApplicationService>(
    SYMBOL.ISystemSettingsApplicationService
  );
  const settings = await service.getSystemSettings();

  return {
    standardWorkingHours: settings.standardWorkingHours,
    defaultUserCostPerHour: settings.defaultUserCostPerHour || 0,
  };
}

export async function updateSystemSettings(
  standardWorkingHours: number,
  defaultUserCostPerHour: number | null
) {
  const service = container.get<ISystemSettingsApplicationService>(
    SYMBOL.ISystemSettingsApplicationService
  );

  await service.updateSystemSettings(standardWorkingHours, defaultUserCostPerHour);
}
