"use server";

import prisma from "@/lib/prisma/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// マイルストーンの作成・編集用のスキーマ
const milestoneSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "マイルストーン名は必須です"),
  date: z.date(),
  wbsId: z.number(),
});

export type MilestoneFormData = z.infer<typeof milestoneSchema>;

export interface ActionResult {
  success: boolean;
  error?: string;
  milestone?: {
    id: number;
    name: string;
    date: Date;
    wbsId: number;
  };
}

/**
 * マイルストーンを作成する
 */
export async function createMilestone(
  data: Omit<MilestoneFormData, "id">
): Promise<ActionResult> {
  try {
    const validatedData = milestoneSchema.omit({ id: true }).parse(data);

    const milestone = await prisma.milestone.create({
      data: {
        name: validatedData.name,
        date: validatedData.date,
        wbsId: validatedData.wbsId,
      },
    });

    revalidatePath(`/wbs/${data.wbsId}`);
    revalidatePath(`/wbs/${data.wbsId}/ganttv2`);

    return {
      success: true,
      milestone,
    };
  } catch (error) {
    console.error("Failed to create milestone:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(", "),
      };
    }

    return {
      success: false,
      error: "マイルストーンの作成に失敗しました",
    };
  }
}

/**
 * マイルストーンを更新する
 */
export async function updateMilestone(
  data: MilestoneFormData
): Promise<ActionResult> {
  try {
    const validatedData = milestoneSchema.parse(data);

    if (!validatedData.id) {
      return {
        success: false,
        error: "マイルストーンIDが必要です",
      };
    }

    const milestone = await prisma.milestone.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        date: validatedData.date,
      },
    });

    revalidatePath(`/wbs/${data.wbsId}`);
    revalidatePath(`/wbs/${data.wbsId}/ganttv2`);

    return {
      success: true,
      milestone,
    };
  } catch (error) {
    console.error("Failed to update milestone:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(", "),
      };
    }

    return {
      success: false,
      error: "マイルストーンの更新に失敗しました",
    };
  }
}

/**
 * マイルストーンを削除する
 */
export async function deleteMilestone(
  id: number,
  wbsId: number
): Promise<ActionResult> {
  try {
    await prisma.milestone.delete({
      where: { id },
    });

    revalidatePath(`/wbs/${wbsId}`);
    revalidatePath(`/wbs/${wbsId}/ganttv2`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to delete milestone:", error);

    return {
      success: false,
      error: "マイルストーンの削除に失敗しました",
    };
  }
}

/**
 * WBSのマイルストーン一覧を取得する
 */
export async function getMilestones(wbsId: number) {
  try {
    const milestones = await prisma.milestone.findMany({
      where: { wbsId },
      orderBy: { date: "asc" },
    });

    return milestones;
  } catch (error) {
    console.error("Failed to fetch milestones:", error);
    return [];
  }
}