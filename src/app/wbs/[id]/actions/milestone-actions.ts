"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type {
  IMilestoneApplicationService,
  MilestoneForecastDto,
} from "@/applications/milestone/milestone-application-service";
import type { ActionResult } from "@/types/action-result";

function getMilestoneApplicationService(): IMilestoneApplicationService {
    return container.get<IMilestoneApplicationService>(SYMBOL.IMilestoneApplicationService);
}

// マイルストーンの作成・編集用のスキーマ
const milestoneTargetSchema = z.discriminatedUnion("targetType", [
  z.object({ targetType: z.literal("EVENT") }),
  z.object({ targetType: z.literal("PHASE"), phaseId: z.number().int().positive() }),
  z.object({
    targetType: z.literal("TASKS"),
    taskIds: z.array(z.number().int().positive()).min(1, "対象タスクを1件以上選択してください"),
  }),
]);

const milestoneSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "マイルストーン名は必須です"),
  date: z.date(),
  wbsId: z.number(),
  /** 達成の対象（省略時は変更しない。作成時はイベント型） */
  target: milestoneTargetSchema.optional(),
  /** 達成日（null で記録を消す。省略時は変更しない） */
  achievedAt: z.date().nullable().optional(),
});

export type MilestoneFormData = z.infer<typeof milestoneSchema>;

/**
 * マイルストーンを作成する
 */
export async function createMilestone(
  data: Omit<MilestoneFormData, "id">
): Promise<ActionResult<{ id: number }>> {
  const parsed = milestoneSchema.omit({ id: true }).safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map(e => e.message).join(", ") };
  }

  const result = await getMilestoneApplicationService().createMilestone({
    wbsId: parsed.data.wbsId,
    name: parsed.data.name,
    date: parsed.data.date,
    target: parsed.data.target,
    achievedAt: parsed.data.achievedAt,
  });
  if (!result.success || result.id === undefined) {
    return { success: false, error: result.error ?? "マイルストーンの作成に失敗しました" };
  }

  revalidatePath(`/wbs/${data.wbsId}`);

  return { success: true, data: { id: result.id } };
}

/**
 * マイルストーンを更新する
 */
export async function updateMilestone(
  data: MilestoneFormData
): Promise<ActionResult<{ id: number }>> {
  const parsed = milestoneSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map(e => e.message).join(", ") };
  }

  if (!parsed.data.id) {
    return { success: false, error: "マイルストーンIDが必要です" };
  }

  const result = await getMilestoneApplicationService().updateMilestone({
    id: parsed.data.id,
    name: parsed.data.name,
    date: parsed.data.date,
    target: parsed.data.target,
    achievedAt: parsed.data.achievedAt,
  });
  if (!result.success || result.id === undefined) {
    return { success: false, error: result.error ?? "マイルストーンの更新に失敗しました" };
  }

  revalidatePath(`/wbs/${data.wbsId}`);

  return { success: true, data: { id: result.id } };
}

/**
 * マイルストーンを削除する
 */
export async function deleteMilestone(
  id: number,
  wbsId: number
): Promise<ActionResult<void>> {
  const result = await getMilestoneApplicationService().deleteMilestone(id);
  if (!result.success) {
    return { success: false, error: result.error ?? "マイルストーンの削除に失敗しました" };
  }

  revalidatePath(`/wbs/${wbsId}`);

  return { success: true, data: undefined };
}

/**
 * WBSのマイルストーン一覧を取得する
 */
export async function getMilestones(wbsId: number) {
  try {
    return await getMilestoneApplicationService().getMilestones(wbsId);
  } catch (error) {
    console.error("Failed to fetch milestones:", error);
    return [];
  }
}

/**
 * WBSのマイルストーンと達成見込みを予定日の早い順に返す
 */
export async function listMilestoneForecasts(wbsId: number): Promise<MilestoneForecastDto[]> {
  const parsed = z.number().int().positive().safeParse(wbsId);
  if (!parsed.success) return [];
  try {
    return await getMilestoneApplicationService().listMilestoneForecasts(parsed.data);
  } catch (error) {
    console.error("Failed to fetch milestone forecasts:", error);
    return [];
  }
}
