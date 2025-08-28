"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IQueryBus } from "@/applications/shared/cqrs/base-classes";
import { GetWbsSummaryQuery } from "@/applications/wbs/query/get-wbs-summary-query";
import { WbsSummaryResult } from "@/applications/wbs/query/wbs-summary-result";

export async function getWbsSummary(projectId: string, wbsId: number): Promise<WbsSummaryResult> {
  try {
    const queryBus = container.get<IQueryBus>(SYMBOL.IQueryBus);
    const query = new GetWbsSummaryQuery(projectId, wbsId);
    const result = await queryBus.execute<WbsSummaryResult>(query);

    return result;
  } catch (error) {
    console.error("WBS集計データの取得に失敗:", error);
    throw new Error("WBS集計データの取得に失敗しました");
  }
}