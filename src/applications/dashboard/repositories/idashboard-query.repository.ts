export interface ProjectStatistics {
    total: number;
    active: number;
    totalWbs: number;
    byStatus: Array<{ status: string; count: number }>;
}

export interface TaskStatistics {
    totalTasks: number;
    completedTasks: number;
    byStatus: Array<{ status: string; count: number }>;
}

export interface ActiveProjectInfo {
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
}

export interface DeadlineInfo {
    projectId: string;
    projectName: string;
    endDate: Date;
    daysRemaining: number;
}

export interface OverdueInfo {
    projectId: string;
    projectName: string;
    endDate: Date;
    daysOverdue: number;
}

export interface IDashboardQueryRepository {
    // プロジェクト統計
    getProjectStatistics(dateRange?: { from: Date; to: Date }): Promise<ProjectStatistics>;
    
    // タスク統計
    getTaskStatistics(dateRange?: { from: Date; to: Date }): Promise<TaskStatistics>;
    
    // アクティブプロジェクト一覧（進捗率付き）
    getActiveProjects(limit: number): Promise<ActiveProjectInfo[]>;
    
    // 期限が近いプロジェクト
    getUpcomingDeadlines(daysAhead: number): Promise<DeadlineInfo[]>;
    
    // 期限超過プロジェクト
    getOverdueProjects(): Promise<OverdueInfo[]>;
    
    // 最近のアクティビティ（オプション）
    getRecentActivities?(limit: number): Promise<Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: Date;
    }>>
}