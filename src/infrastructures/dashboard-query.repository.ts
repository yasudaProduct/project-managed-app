import { injectable } from "inversify";
import type {
    IDashboardQueryRepository,
    ProjectStatistics,
    TaskStatistics,
    ActiveProjectInfo,
    DeadlineInfo,
    OverdueInfo
} from "@/applications/dashboard/repositories/idashboard-query.repository";
import prisma from "@/lib/prisma";

@injectable()
export class DashboardQueryRepository implements IDashboardQueryRepository {
    async getProjectStatistics(): Promise<ProjectStatistics> {
        const projects = await prisma.projects.findMany();
        return {
            total: projects.length,
            active: projects.filter(project => project.status === "ACTIVE").length,
            byStatus: [
                { status: "PLANNED", count: projects.filter(project => project.status === "INACTIVE").length },
                { status: "ACTIVE", count: projects.filter(project => project.status === "ACTIVE").length },
                { status: "COMPLETED", count: projects.filter(project => project.status === "DONE").length }
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
        const activeProjects = await prisma.projects.findMany({
            where: {
                status: "ACTIVE"
            },
            include: {
                wbs: true
            },
            take: limit
        });

        // プロジェクトの進捗率を計算
        const progress: { projectId: string; progress: number }[] = [];
        for (const project of activeProjects) {

            let totalTasks = 0;
            let completedTasks = 0;
            for (const wbs of project.wbs) {
                const tasks = await prisma.wbsTask.findMany({
                    where: {
                        wbsId: wbs.id
                    }
                });
                totalTasks += tasks.length;
                completedTasks += tasks.filter(task => task.status === "COMPLETED").length;
            }
            progress.push({
                projectId: project.id,
                progress: completedTasks / totalTasks
            });
        }

        const tasks = await prisma.wbsTask.findMany({
            where: {
                wbsId: {
                    in: activeProjects.flatMap(project => project.wbs.map(wbs => wbs.id))
                }
            }
        });
        const taskStats = {
            total: tasks.length,
            completed: tasks.filter(task => task.status === "COMPLETED").length,
            inProgress: tasks.filter(task => task.status === "IN_PROGRESS").length
        };

        return activeProjects.map(project => ({
            projectId: project.id,
            projectName: project.name,
            startDate: project.startDate,
            endDate: project.endDate,
            progress: progress.find(p => p.projectId === project.id)?.progress || 0,
            taskStats: {
                total: taskStats.total,
                completed: taskStats.completed,
                inProgress: taskStats.inProgress
            }
        }));
    }

    async getUpcomingDeadlines(daysAhead: number): Promise<DeadlineInfo[]> {
        const today = new Date();
        const futureDate = new Date().setDate(today.getDate() + daysAhead);

        const projects = await prisma.projects.findMany({
            where: {
                status: 'ACTIVE',
                endDate: {
                    gte: today,
                    lte: new Date(futureDate)
                }
            }
        });

        return projects.map(project => ({
            projectId: project.id,
            projectName: project.name,
            endDate: project.endDate,
            daysRemaining: Math.ceil((project.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }));
    }

    async getOverdueProjects(): Promise<OverdueInfo[]> {
        const today = new Date();
        const overdueProjects = await prisma.projects.findMany({
            where: {
                status: "ACTIVE",
                endDate: {
                    lt: today
                }
            }
        });

        return overdueProjects.map(project => ({
            projectId: project.id,
            projectName: project.name,
            endDate: project.endDate,
            daysOverdue: Math.ceil((today.getTime() - project.endDate.getTime()) / (1000 * 60 * 60 * 24))
        }));
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