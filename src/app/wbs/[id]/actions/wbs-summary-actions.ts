"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IQueryBus } from "@/applications/shared/cqrs/base-classes";
import { GetWbsSummaryQuery } from "@/applications/wbs/query/get-wbs-summary-query";
import { GetWbsTaskSummaryQuery } from "@/applications/wbs/query/get-wbs-task-summary-query";
import { AllocationCalculationMode } from "@/applications/wbs/query/allocation-calculation-mode";
import { WbsSummaryResult } from "@/applications/wbs/query/wbs-summary-result";
import type { WbsTaskSummaryResult } from "@/applications/wbs/query/wbs-task-summary-result";

export async function getWbsSummary(
  projectId: string,
  wbsId: number,
  calculationMode: AllocationCalculationMode = AllocationCalculationMode.BUSINESS_DAY_ALLOCATION
): Promise<WbsSummaryResult> {
  try {
    const queryBus = container.get<IQueryBus>(SYMBOL.IQueryBus);
    const query = new GetWbsSummaryQuery(projectId, wbsId, calculationMode);
    const result = await queryBus.execute<WbsSummaryResult>(query);

    return result;
  } catch (error) {
    console.error("WBS集計データの取得に失敗:", error);
    throw new Error("WBS集計データの取得に失敗しました");
  }
}

/**
 * ヘッダー表示用のWBSタスクサマリー（工数合計・進捗状況）を取得する
 */
export async function getWbsTaskSummary(
  wbsId: number
): Promise<WbsTaskSummaryResult> {
  try {
    const queryBus = container.get<IQueryBus>(SYMBOL.IQueryBus);
    const query = new GetWbsTaskSummaryQuery(wbsId);
    const result = await queryBus.execute<WbsTaskSummaryResult>(query);

    return result;
  } catch (error) {
    console.error("WBSタスクサマリーの取得に失敗:", error);
    throw new Error("WBSタスクサマリーの取得に失敗しました");
  }
}