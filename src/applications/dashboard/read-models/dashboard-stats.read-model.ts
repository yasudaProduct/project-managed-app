// ダッシュボード用の読み取り専用モデル
// これらのモデルはUI表示に最適化されており、ドメインモデルとは独立しています

export class DashboardOverviewReadModel {
    constructor(
        public readonly totalProjects: number,
        public readonly activeProjects: number,
        public readonly totalTasks: number,
        public readonly completedTasks: number,
        public readonly completionRate: number,
        public readonly overdueCount: number
    ) {}

    static create(data: {
        totalProjects: number;
        activeProjects: number;
        totalTasks: number;
        completedTasks: number;
        overdueCount: number;
    }): DashboardOverviewReadModel {
        const completionRate = data.totalTasks > 0 
            ? Math.round((data.completedTasks / data.totalTasks) * 100) 
            : 0;

        return new DashboardOverviewReadModel(
            data.totalProjects,
            data.activeProjects,
            data.totalTasks,
            data.completedTasks,
            completionRate,
            data.overdueCount
        );
    }
}

export class ProjectSummaryReadModel {
    constructor(
        public readonly projectId: string,
        public readonly projectName: string,
        public readonly status: string,
        public readonly startDate: Date,
        public readonly endDate: Date,
        public readonly progress: number,
        public readonly daysRemaining: number | null,
        public readonly isOverdue: boolean,
        public readonly taskCount: number,
        public readonly completedTaskCount: number
    ) {}

    static fromActiveProject(data: {
        projectId: string;
        projectName: string;
        startDate: Date;
        endDate: Date;
        progress: number;
        taskStats: { total: number; completed: number; inProgress: number };
    }): ProjectSummaryReadModel {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const endDate = new Date(data.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return new ProjectSummaryReadModel(
            data.projectId,
            data.projectName,
            'ACTIVE',
            data.startDate,
            data.endDate,
            data.progress,
            daysRemaining >= 0 ? daysRemaining : null,
            daysRemaining < 0,
            data.taskStats.total,
            data.taskStats.completed
        );
    }
}

export class ChartDataReadModel {
    constructor(
        public readonly label: string,
        public readonly value: number,
        public readonly percentage: number,
        public readonly color?: string
    ) {}
}