export interface GetDashboardStatsResult {
    overview: {
        totalProjects: number;
        activeProjects: number;
        totalTasks: number;
        completedTasks: number;
        totalWbs: number;
        completionRate: number;
        overdueCount: number;
    };
    projectsByStatus: Array<{
        status: string;
        count: number;
        percentage: number;
    }>;
    tasksByStatus: Array<{
        status: string;
        count: number;
        percentage: number;
    }>;
    timeline: {
        upcomingDeadlines: Array<{
            projectId: string;
            projectName: string;
            endDate: Date;
            daysRemaining: number;
        }>;
        overdueProjects: Array<{
            projectId: string;
            projectName: string;
            endDate: Date;
            daysOverdue: number;
        }>;
    };
    activeProjects: Array<{
        projectId: string;
        projectName: string;
        startDate: Date;
        endDate: Date;
        progress: number;
        taskStats: {
            total: number;
            completed: number;
            inProgress: number;
        };
    }>;
}