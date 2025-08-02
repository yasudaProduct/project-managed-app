import { injectable } from "inversify";
import type { 
    IDashboardQueryRepository,
    ProjectStatistics,
    TaskStatistics,
    ActiveProjectInfo,
    DeadlineInfo,
    OverdueInfo
} from "@/applications/dashboard/repositories/idashboard-query.repository";

@injectable()
export class DashboardQueryRepository implements IDashboardQueryRepository {
    async getProjectStatistics(): Promise<ProjectStatistics> {
        // TODO: 実際の実装では、Prismaを使用してデータベースから統計情報を取得
        return {
            total: 10,
            active: 5,
            totalWbs: 25,
            byStatus: [
                { status: "PLANNED", count: 2 },
                { status: "ACTIVE", count: 5 },
                { status: "COMPLETED", count: 3 }
            ]
        };
    }

    async getTaskStatistics(): Promise<TaskStatistics> {
        // TODO: 実際の実装では、Prismaを使用してデータベースから統計情報を取得
        return {
            totalTasks: 100,
            completedTasks: 45,
            byStatus: [
                { status: "NOT_STARTED", count: 30 },
                { status: "IN_PROGRESS", count: 25 },
                { status: "COMPLETED", count: 45 }
            ]
        };
    }

    async getActiveProjects(limit: number): Promise<ActiveProjectInfo[]> {
        // TODO: 実際の実装では、Prismaを使用してアクティブプロジェクトを取得
        const mockProjects: ActiveProjectInfo[] = [
            {
                projectId: "1",
                projectName: "Webアプリケーション開発",
                startDate: new Date("2024-01-01"),
                endDate: new Date("2024-06-30"),
                progress: 65,
                taskStats: {
                    total: 20,
                    completed: 13,
                    inProgress: 5
                }
            },
            {
                projectId: "2",
                projectName: "モバイルアプリ開発",
                startDate: new Date("2024-02-01"),
                endDate: new Date("2024-07-31"),
                progress: 40,
                taskStats: {
                    total: 30,
                    completed: 12,
                    inProgress: 8
                }
            }
        ];
        
        return mockProjects.slice(0, limit);
    }

    async getUpcomingDeadlines(daysAhead: number): Promise<DeadlineInfo[]> {
        // TODO: 実際の実装では、Prismaを使用して期限が近いプロジェクトを取得
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);
        
        return [
            {
                projectId: "3",
                projectName: "API統合プロジェクト",
                endDate: new Date("2024-03-15"),
                daysRemaining: 3
            },
            {
                projectId: "4",
                projectName: "データベース移行",
                endDate: new Date("2024-03-18"),
                daysRemaining: 6
            }
        ];
    }

    async getOverdueProjects(): Promise<OverdueInfo[]> {
        // TODO: 実際の実装では、Prismaを使用して期限超過プロジェクトを取得
        return [
            {
                projectId: "5",
                projectName: "レガシーシステム更新",
                endDate: new Date("2024-02-28"),
                daysOverdue: 10
            }
        ];
    }

    async getRecentActivities?(limit: number): Promise<Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: Date;
    }>> {
        // TODO: 実際の実装では、Prismaを使用して最近のアクティビティを取得
        return [
            {
                id: "1",
                type: "task_completed",
                title: "タスク完了",
                description: "ユーザー認証機能の実装が完了しました",
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
                id: "2",
                type: "project_created",
                title: "プロジェクト作成",
                description: "新規プロジェクト「社内ポータル」が作成されました",
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        ].slice(0, limit);
    }
}