"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IDashboardApplicationService } from "@/applications/dashboard/dashboard-application-service";

export async function getDashboardStats() {
    const dashboardService = container.get<IDashboardApplicationService>(SYMBOL.IDashboardApplicationService);
    return await dashboardService.getDashboardStats();
}