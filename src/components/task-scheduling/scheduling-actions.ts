"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type {
  ISchedulingApplicationService,
  ScheduleCalculationParams,
  ScheduleCalculationResult,
  SchedulePreviewRecalcParams,
  SchedulePreviewRecalcResult,
} from "@/applications/task-scheduling/ischeduling-application-service";

/**
 * WBSのタスクスケジュールを計算する。
 * 結果は画面プレビュー＋TSV出力用のプレーンDTO（DBへは書き戻さない）。
 */
export async function calculateSchedule(
  wbsId: number,
  params: ScheduleCalculationParams
): Promise<ScheduleCalculationResult> {
  const service = container.get<ISchedulingApplicationService>(
    SYMBOL.ISchedulingApplicationService
  );
  return service.calculateSchedule(wbsId, params);
}

/**
 * 手動調整後のスケジュールから担当者別負荷・TSV・終了日超過警告を再計算する。
 * タスクの再スケジュールは行わず、DBへの書き込みも一切行わない（読み取り専用）。
 */
export async function recalculateSchedulePreview(
  wbsId: number,
  params: SchedulePreviewRecalcParams
): Promise<SchedulePreviewRecalcResult> {
  const service = container.get<ISchedulingApplicationService>(
    SYMBOL.ISchedulingApplicationService
  );
  return service.recalculatePreview(wbsId, params);
}
