"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type {
  ISchedulingApplicationService,
  ScheduleCalculationParams,
  ScheduleCalculationResult,
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
