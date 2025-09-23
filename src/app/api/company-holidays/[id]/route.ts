import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/prisma";
import { z } from "zod";

// PUT: 会社休日更新
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
      return NextResponse.json(
        { message: "不正なIDです" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // 更新対象の休日が存在するかチェック
    const existingHoliday = await prisma.companyHoliday.findUnique({
      where: { id: holidayId },
    });

    if (!existingHoliday) {
      return NextResponse.json(
        { message: "指定された休日が見つかりません" },
        { status: 404 }
      );
    }

    // 日付の重複チェック（自分以外で同じ日付がないかチェック）
    const dateConflict = await prisma.companyHoliday.findFirst({
      where: {
        date: new Date(validatedData.date),
        id: { not: holidayId },
      },
    });

    if (dateConflict) {
      return NextResponse.json(
        { message: "指定された日付には既に他の休日が登録されています" },
        { status: 409 }
      );
    }

    // 会社休日を更新
    const updatedHoliday = await prisma.companyHoliday.update({
      where: { id: holidayId },
      data: {
        date: new Date(validatedData.date),
        name: validatedData.name,
        type: validatedData.type,
      },
    });

    // レスポンス用のフォーマット
    const formattedHoliday = {
      ...updatedHoliday,
      date: updatedHoliday.date.toISOString().split("T")[0],
      createdAt: updatedHoliday.createdAt.toISOString(),
      updatedAt: updatedHoliday.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedHoliday);
  } catch (error) {
    console.error("会社休日更新エラー:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "入力データが正しくありません", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "会社休日の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: 会社休日削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id);
    if (isNaN(holidayId)) {
      return NextResponse.json(
        { message: "不正なIDです" },
        { status: 400 }
      );
    }

    // 削除対象の休日が存在するかチェック
    const existingHoliday = await prisma.companyHoliday.findUnique({
      where: { id: holidayId },
    });

    if (!existingHoliday) {
      return NextResponse.json(
        { message: "指定された休日が見つかりません" },
        { status: 404 }
      );
    }

    // 会社休日を削除
    await prisma.companyHoliday.delete({
      where: { id: holidayId },
    });

    return NextResponse.json(
      { message: "会社休日を削除しました" },
      { status: 200 }
    );
  } catch (error) {
    console.error("会社休日削除エラー:", error);
    return NextResponse.json(
      { message: "会社休日の削除に失敗しました" },
      { status: 500 }
    );
  }
}

// GET: 個別の会社休日取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id);
    if (isNaN(holidayId)) {
      return NextResponse.json(
        { message: "不正なIDです" },
        { status: 400 }
      );
    }

    const holiday = await prisma.companyHoliday.findUnique({
      where: { id: holidayId },
    });

    if (!holiday) {
      return NextResponse.json(
        { message: "指定された休日が見つかりません" },
        { status: 404 }
      );
    }

    // レスポンス用のフォーマット
    const formattedHoliday = {
      ...holiday,
      date: holiday.date.toISOString().split("T")[0],
      createdAt: holiday.createdAt.toISOString(),
      updatedAt: holiday.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedHoliday);
  } catch (error) {
    console.error("会社休日取得エラー:", error);
    return NextResponse.json(
      { message: "会社休日の取得に失敗しました" },
      { status: 500 }
    );
  }
}