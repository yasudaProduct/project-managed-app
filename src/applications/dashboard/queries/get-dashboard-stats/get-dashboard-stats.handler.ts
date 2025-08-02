import { inject, injectable } from "inversify";
import type { IQueryHandler } from "@/applications/shared/cqrs/base-classes";
import { GetDashboardStatsQuery } from "./get-dashboard-stats.query";
import { GetDashboardStatsResult } from "./get-dashboard-stats.result";
import type { IDashboardQueryRepository } from "../../repositories/idashboard-query.repository";
import { SYMBOL } from "@/types/symbol";

@injectable()
export class GetDashboardStatsHandler implements IQueryHandler<GetDashboardStatsQuery, GetDashboardStatsResult> {
    constructor(
        @inject(SYMBOL.IDashboardQueryRepository) 
        private readonly dashboardQueryRepository: IDashboardQueryRepository
    ) {}

    async execute(query: GetDashboardStatsQuery): Promise<GetDashboardStatsResult> {
        // 基本統計情報の取得
        const [
            projectStats,
            taskStats,
            activeProjects,
            upcomingDeadlines,
            overdueProjects
        ] = await Promise.all([
            this.dashboardQueryRepository.getProjectStatistics(query.dateRange),
            this.dashboardQueryRepository.getTaskStatistics(query.dateRange),
            this.dashboardQueryRepository.getActiveProjects(5), // 上位5件
            this.dashboardQueryRepository.getUpcomingDeadlines(7), // 7日以内
            this.dashboardQueryRepository.getOverdueProjects()
        ]);

        // 完了率の計算
        const completionRate = taskStats.totalTasks > 0 
            ? Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100) 
            : 0;

        // プロジェクトステータス別の割合計算
        const projectsByStatus = this.calculatePercentages(projectStats.byStatus);
        
        // タスクステータス別の割合計算
        const tasksByStatus = this.calculatePercentages(taskStats.byStatus);

        return {
            overview: {
                totalProjects: projectStats.total,
                activeProjects: projectStats.active,
                totalTasks: taskStats.totalTasks,
                completedTasks: taskStats.completedTasks,
                totalWbs: projectStats.totalWbs,
                completionRate,
                overdueCount: overdueProjects.length
            },
            projectsByStatus,
            tasksByStatus,
            timeline: {
                upcomingDeadlines,
                overdueProjects
            },
            activeProjects
        };
    }

    private calculatePercentages(
        statusCounts: Array<{ status: string; count: number }>
    ): Array<{ status: string; count: number; percentage: number }> {
        const total = statusCounts.reduce((sum, item) => sum + item.count, 0);
        
        return statusCounts.map(item => ({
            ...item,
            percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
        }));
    }
}