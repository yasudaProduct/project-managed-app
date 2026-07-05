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

export async function GET() {
  try {
    const holidays = await companyHolidayRepository.findAll();
    return createApiResponse(holidays.map(formatHoliday));
  } catch (error) {
    console.error("会社休日取得エラー:", error);
    return createApiError("会社休日の取得に失敗しました", 500);
  }
}

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  name: z.string().min(1, "休日名を入力してください").max(100, "休日名は100文字以内で入力してください"),
  type: z.enum(["NATIONAL", "COMPANY", "SPECIAL"], {
    errorMap: () => ({ message: "有効な休日タイプを選択してください" }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createSchema.parse(body);

    const existingHoliday = await companyHolidayRepository.findByDate(
      new Date(validatedData.date)
    );

    if (existingHoliday) {
      return createApiError("指定された日付には既に休日が登録されています", 409);
    }

    const holiday = await companyHolidayRepository.save({
      date: new Date(validatedData.date),
      name: validatedData.name,
      type: validatedData.type,
    });

    return createApiResponse(formatHoliday(holiday), "会社休日を作成しました", 201);
  } catch (error) {
    console.error("会社休日作成エラー:", error);

    if (error instanceof z.ZodError) {
      return createApiError("入力データが正しくありません", 400, error.errors);
    }

    return createApiError("会社休日の作成に失敗しました", 500);
  }
}
