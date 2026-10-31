"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { PROGRESS_REVIEW_CYCLES, type ProgressReviewCycle } from "@/types/progress-review-cycle";
import type { IProgressReviewApplicationService } from "@/applications/progress-review/progress-review-application-service";

/**
 * 前回の確認日（ISO 8601・UTC深夜0時）を返す。進捗確認サイクルから決まる。
 * 入力が不正な場合は null を返す。
 */
export async function getPreviousReviewDate(
  progressReviewCycle: ProgressReviewCycle
): Promise<string | null> {
  const parsed = z.enum(PROGRESS_REVIEW_CYCLES).safeParse(progressReviewCycle);
  if (!parsed.success) return null;

  const service = container.get<IProgressReviewApplicationService>(
    SYMBOL.IProgressReviewApplicationService
  );
  const date = await service.getPreviousReviewDate(parsed.data);
  return date.toISOString();
}
