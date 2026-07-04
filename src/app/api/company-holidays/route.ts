import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/inversify.config";
import { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import { SYMBOL } from "@/types/symbol";
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

// GET: 会社休日一覧取得
export async function GET() {
  try {
    const holidays = await companyHolidayRepository.findAll();

    return NextResponse.json(holidays.map(formatHoliday));
  } catch (error) {
    console.error("会社休日取得エラー:", error);
    return NextResponse.json(
      { message: "会社休日の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 会社休日作成
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

    // 日付の重複チェック
    const existingHoliday = await companyHolidayRepository.findByDate(
      new Date(validatedData.date)
    );

    if (existingHoliday) {
      return NextResponse.json(
        { message: "指定された日付には既に休日が登録されています" },
        { status: 409 }
      );
    }

    // 会社休日を作成
    const holiday = await companyHolidayRepository.save({
      date: new Date(validatedData.date),
      name: validatedData.name,
      type: validatedData.type,
    });

    return NextResponse.json(formatHoliday(holiday), { status: 201 });
  } catch (error) {
    console.error("会社休日作成エラー:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "入力データが正しくありません", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "会社休日の作成に失敗しました" },
      { status: 500 }
    );
  }
}
