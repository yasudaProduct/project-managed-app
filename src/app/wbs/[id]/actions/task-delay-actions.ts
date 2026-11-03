"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type {
  ITaskDelayApplicationService,
  TaskDelayDto,
} from "@/applications/task-delay/task-delay-application-service";

const listTaskDelaysSchema = z.object({
  wbsId: z.number().int().positive(),
  dueSoonDays: z.number().int().min(0),
  /** 前回の確認日（ISO 8601・UTC）。渡すと前回以降に遅れ始めたタスクに印を付ける */
  previousReviewDate: z.string().datetime().optional(),
});

/**
 * 遅れ（終了遅れ・開始遅れ）と期限間近のタスクを重い順に返す。
 * 入力が不正な場合は空配列を返す。
 */
export async function listTaskDelays(
  wbsId: number,
  dueSoonDays: number,
  previousReviewDate?: string
): Promise<TaskDelayDto[]> {
  const parsed = listTaskDelaysSchema.safeParse({ wbsId, dueSoonDays, previousReviewDate });
  if (!parsed.success) return [];

  const service = container.get<ITaskDelayApplicationService>(
    SYMBOL.ITaskDelayApplicationService
  );
  return service.listTaskDelays(parsed.data.wbsId, {
    dueSoonDays: parsed.data.dueSoonDays,
    previousReviewDate: parsed.data.previousReviewDate
      ? new Date(parsed.data.previousReviewDate)
      : undefined,
  });
}
