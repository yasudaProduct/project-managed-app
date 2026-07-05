import { NextRequest } from "next/server";
import { container } from "@/lib/inversify.config";
import { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import { SYMBOL } from "@/types/symbol";
import { createApiResponse, createApiError } from "@/lib/api-response";
import { z } from "zod";

const companyHolidayRepository = container.get<ICompanyHolidayRepository>(
  SYMBOL.ICompanyHolidayRepository
);

function formatHoliday(holiday: {
  id?: number;
  date: Date;
  name: string;
  type: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: holiday.id,
    date: holiday.date.toISOString().split("T")[0],
    name: holiday.name,
    type: holiday.type,
    createdAt: holiday.createdAt?.toISOString(),
    updatedAt: holiday.updatedAt?.toISOString(),
  };
}

const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  name: z.string().min(1, "休日名を入力してください").max(100, "休日名は100文字以内で入力してください"),
  type: z.enum(["NATIONAL", "COMPANY", "SPECIAL"], {
    errorMap: () => ({ message: "有効な休日タイプを選択してください" }),
  }),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id);
    if (isNaN(holidayId)) {
      return createApiError("不正なIDです", 400);
    }

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const existingHoliday = await companyHolidayRepository.findById(holidayId);

    if (!existingHoliday) {
      return createApiError("指定された休日が見つかりません", 404);
    }

    const dateConflict = await companyHolidayRepository.findByDateExcludingId(
      new Date(validatedData.date),
      holidayId
    );

    if (dateConflict) {
      return createApiError("指定された日付には既に他の休日が登録されています", 409);
    }

    const updatedHoliday = await companyHolidayRepository.update(holidayId, {
      date: new Date(validatedData.date),
      name: validatedData.name,
      type: validatedData.type,
    });

    return createApiResponse(formatHoliday(updatedHoliday), "会社休日を更新しました");
  } catch (error) {
    console.error("会社休日更新エラー:", error);

    if (error instanceof z.ZodError) {
      return createApiError("入力データが正しくありません", 400, error.errors);
    }

    return createApiError("会社休日の更新に失敗しました", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id);
    if (isNaN(holidayId)) {
      return createApiError("不正なIDです", 400);
    }

    const existingHoliday = await companyHolidayRepository.findById(holidayId);

    if (!existingHoliday) {
      return createApiError("指定された休日が見つかりません", 404);
    }

    await companyHolidayRepository.delete(holidayId);

    return createApiResponse(null, "会社休日を削除しました");
  } catch (error) {
    console.error("会社休日削除エラー:", error);
    return createApiError("会社休日の削除に失敗しました", 500);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id);
    if (isNaN(holidayId)) {
      return createApiError("不正なIDです", 400);
    }

    const holiday = await companyHolidayRepository.findById(holidayId);

    if (!holiday) {
      return createApiError("指定された休日が見つかりません", 404);
    }

    return createApiResponse(formatHoliday(holiday));
  } catch (error) {
    console.error("会社休日取得エラー:", error);
    return createApiError("会社休日の取得に失敗しました", 500);
  }
}
