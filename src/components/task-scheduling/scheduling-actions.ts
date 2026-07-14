"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type {
  ISchedulingApplicationService,
  ScheduleCalculationParams,
  ScheduleCalculationResult,
  SchedulePreviewRecalcParams,
  SchedulePreviewRecalcResult,
} from "@/applications/task-scheduling/ischeduling-application-service";

const wbsIdSchema = z.number().int().positive();

const calculateScheduleParamsSchema = z.object({
  baselineMode: z.enum(["PROJECT_START", "TODAY", "CUSTOM"]),
  baselineDateIso: z.string().datetime().optional(),
  considerOtherWbsLoad: z.boolean().optional(),
});

const recalcParamsSchema = z.object({
  baselineDateIso: z.string().datetime(),
  considerOtherWbsLoad: z.boolean().optional(),
  // 画面編集済みDTO。詳細な形はアプリ層の型に委ね、最低限の識別子のみ検証する
  scheduledTasks: z.array(
    z.object({ taskId: z.number(), taskNo: z.string() }).passthrough()
  ),
});

/**
 * WBSのタスクスケジュールを計算する。
 * 結果は画面プレビュー＋TSV出力用のプレーンDTO（DBへは書き戻さない）。
 */
export async function calculateSchedule(
  wbsId: number,
  params: ScheduleCalculationParams
): Promise<ScheduleCalculationResult> {
  if (
    !wbsIdSchema.safeParse(wbsId).success ||
    !calculateScheduleParamsSchema.safeParse(params).success
  ) {
    throw new Error("スケジュール計算の入力値が不正です");
  }
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
  if (
    !wbsIdSchema.safeParse(wbsId).success ||
    !recalcParamsSchema.safeParse(params).success
  ) {
    throw new Error("再計算の入力値が不正です");
  }
  const service = container.get<ISchedulingApplicationService>(
    SYMBOL.ISchedulingApplicationService
  );
  return service.recalculatePreview(wbsId, params);
}
