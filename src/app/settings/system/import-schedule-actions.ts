"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IImportScheduleApplicationService } from "@/applications/import-schedule/import-schedule-application-service";
import type { ImportScheduleSettingsDto, WbsImportScheduleListItemDto } from "@/types/import-schedule";
import type { ActionResult } from "@/types/action-result";

function getImportScheduleService(): IImportScheduleApplicationService {
  return container.get<IImportScheduleApplicationService>(
    SYMBOL.IImportScheduleApplicationService
  );
}

/** 定期インポートの全体設定と、WBSごとの設定一覧 */
export async function getImportScheduleOverview(): Promise<{
  settings: ImportScheduleSettingsDto;
  schedules: WbsImportScheduleListItemDto[];
}> {
  const service = getImportScheduleService();
  const [settings, schedules] = await Promise.all([
    service.getImportScheduleSettings(),
    service.listWbsImportSchedules(),
  ]);
  return { settings, schedules };
}

export async function updateImportScheduleEnabled(
  isEnabled: boolean
): Promise<ActionResult<void>> {
  const parsed = z.boolean().safeParse(isEnabled);
  if (!parsed.success) {
    return { success: false, error: "入力値が不正です。" };
  }

  await getImportScheduleService().updateImportScheduleSettings(parsed.data);

  revalidatePath("/settings/system");
  return { success: true, data: undefined };
}
