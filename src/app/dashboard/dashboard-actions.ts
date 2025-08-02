"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IQueryBus } from "@/applications/shared/cqrs/base-classes";
import { GetDashboardStatsQuery } from "@/applications/dashboard/queries/get-dashboard-stats/get-dashboard-stats.query";
import { GetDashboardStatsResult } from "@/applications/dashboard/queries/get-dashboard-stats/get-dashboard-stats.result";

export async function getDashboardStats(): Promise<GetDashboardStatsResult> {
    // DIコンテナからQueryBusを取得
    const queryBus = container.get<IQueryBus>(SYMBOL.IQueryBus);
    
    // CQRSクエリを使用してダッシュボードデータを取得
    const query = new GetDashboardStatsQuery();
    return await queryBus.execute<GetDashboardStatsResult>(query);
}