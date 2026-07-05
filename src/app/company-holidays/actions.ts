"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { ICompanyHolidayApplicationService } from "@/applications/calendar/company-holiday-application-service";
import type { CompanyHolidayDto } from "@/types/company-holiday";
import type { ActionResult } from "@/types/action-result";

function getService(): ICompanyHolidayApplicationService {
  return container.get<ICompanyHolidayApplicationService>(
    SYMBOL.ICompanyHolidayApplicationService
  );
}

export async function getCompanyHolidays(): Promise<CompanyHolidayDto[]> {
  return getService().getHolidays();
}

const holidayInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  name: z
    .string()
    .min(1, "休日名を入力してください")
    .max(100, "休日名は100文字以内で入力してください"),
  type: z.enum(["NATIONAL", "COMPANY", "SPECIAL"]),
});

export async function createCompanyHoliday(input: {
  date: string;
  name: string;
  type: string;
}): Promise<ActionResult<CompanyHolidayDto>> {
  const parsed = holidayInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "入力値が不正です。" };
  }

  const result = await getService().createHoliday(parsed.data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/company-holidays");
  return { success: true, data: result.holiday };
}

export async function updateCompanyHoliday(
  id: number,
  input: { date: string; name: string; type: string }
): Promise<ActionResult<CompanyHolidayDto>> {
  const parsed = holidayInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "入力値が不正です。" };
  }

  const result = await getService().updateHoliday(id, parsed.data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/company-holidays");
  return { success: true, data: result.holiday };
}

export async function deleteCompanyHoliday(
  id: number
): Promise<ActionResult<void>> {
  const result = await getService().deleteHoliday(id);
  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "会社休日の削除に失敗しました。",
    };
  }

  revalidatePath("/company-holidays");
  return { success: true, data: undefined };
}
