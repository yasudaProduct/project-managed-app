"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IImportScheduleApplicationService } from "@/applications/import-schedule/import-schedule-application-service";
import type { UpdateWbsImportScheduleInput, WbsImportScheduleDto } from "@/types/import-schedule";
import type { ActionResult } from "@/types/action-result";

function getImportScheduleService(): IImportScheduleApplicationService {
  return container.get<IImportScheduleApplicationService>(
    SYMBOL.IImportScheduleApplicationService
  );
}

export async function getWbsImportSchedule(wbsId: number): Promise<WbsImportScheduleDto> {
  return getImportScheduleService().getWbsImportSchedule(wbsId);
}

// cron 式そのものの妥当性はドメイン（ScheduleExpression）で検証する
const updateWbsImportScheduleSchema = z.object({
  wbsId: z.number().int().positive(),
  isEnabled: z.boolean(),
  cronExpression: z.string().trim().min(1),
  syncMode: z.enum(["diff", "replace"]),
  includeActuals: z.boolean(),
});

export async function updateWbsImportSchedule(
  input: UpdateWbsImportScheduleInput
): Promise<ActionResult<void>> {
  const parsed = updateWbsImportScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "入力値が不正です。" };
  }

  const result = await getImportScheduleService().updateWbsImportSchedule(parsed.data);
  if (!result.success) {
    return { success: false, error: result.error ?? "定期インポート設定の保存に失敗しました。" };
  }

  revalidatePath(`/wbs/${parsed.data.wbsId}`);
  revalidatePath("/settings/system");
  return { success: true, data: undefined };
}
