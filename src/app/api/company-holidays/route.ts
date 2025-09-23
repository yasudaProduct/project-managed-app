import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/prisma";
import { z } from "zod";

// GET: 会社休日一覧取得
export async function GET() {
  try {
    const holidays = await prisma.companyHoliday.findMany({
      orderBy: {
        date: "asc",
      },
    });

    // 日付をISO文字列として返す
    const formattedHolidays = holidays.map((holiday) => ({
      ...holiday,
      date: holiday.date.toISOString().split("T")[0],
      createdAt: holiday.createdAt.toISOString(),
      updatedAt: holiday.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedHolidays);
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
    const existingHoliday = await prisma.companyHoliday.findUnique({
      where: {
        date: new Date(validatedData.date),
      },
    });

    if (existingHoliday) {
      return NextResponse.json(
        { message: "指定された日付には既に休日が登録されています" },
        { status: 409 }
      );
    }

    // 会社休日を作成
    const holiday = await prisma.companyHoliday.create({
      data: {
        date: new Date(validatedData.date),
        name: validatedData.name,
        type: validatedData.type,
      },
    });

    // レスポンス用のフォーマット
    const formattedHoliday = {
      ...holiday,
      date: holiday.date.toISOString().split("T")[0],
      createdAt: holiday.createdAt.toISOString(),
      updatedAt: holiday.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedHoliday, { status: 201 });
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