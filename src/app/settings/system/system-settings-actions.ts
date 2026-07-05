"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { ISystemSettingsApplicationService } from "@/applications/system-settings/system-settings-application-service";
import type { ActionResult } from "@/types/action-result";

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

const updateSystemSettingsSchema = z.object({
  standardWorkingHours: z
    .number()
    .positive("基本稼働時間は正の数値を入力してください。"),
  defaultUserCostPerHour: z
    .number()
    .min(0, "デフォルト人員原価は0以上の数値を入力してください。")
    .nullable(),
});

export async function updateSystemSettings(
  standardWorkingHours: number,
  defaultUserCostPerHour: number | null
): Promise<ActionResult<void>> {
  const parsed = updateSystemSettingsSchema.safeParse({
    standardWorkingHours,
    defaultUserCostPerHour,
  });
  if (!parsed.success) {
    return { success: false, error: "入力値が不正です。" };
  }

  const service = container.get<ISystemSettingsApplicationService>(
    SYMBOL.ISystemSettingsApplicationService
  );

  await service.updateSystemSettings(
    parsed.data.standardWorkingHours,
    parsed.data.defaultUserCostPerHour
  );

  return { success: true, data: undefined };
}
