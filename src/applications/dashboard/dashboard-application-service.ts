import type { IProjectRepository } from "@/applications/projects/iproject-repository";
import type { IWbsRepository } from "@/applications/wbs/iwbs-repository";
import type { ITaskRepository } from "@/applications/task/itask-repository";
import { Project } from "@/domains/project/project";
import { Task } from "@/domains/task/task";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import { ProjectStatus } from "@/types/wbs";

export interface DashboardStats {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalWbs: number;
    projectsByStatus: { status: string; count: number }[];
    tasksByStatus: { status: string; count: number }[];
    upcomingDeadlines: { projectId: string; projectName: string; endDate: Date }[];
    overdueProjects: { projectId: string; projectName: string; endDate: Date }[];
}

export interface IDashboardApplicationService {
    getDashboardStats(): Promise<DashboardStats>;
}

@injectable()
export class DashboardApplicationService implements IDashboardApplicationService {
    constructor(
        @inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository,
        @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository,
        @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository
    ) { }

    public async getDashboardStats(): Promise<DashboardStats> {
        const projects = await this.projectRepository.findAll();
        const allWbs = await this.wbsRepository.findAll();
        const allTasks = await this.taskRepository.findAll();

        const totalProjects = projects.length;
        const activeProjects = projects.filter(p => p.getStatus() === 'ACTIVE').length;
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t.getStatus() === 'COMPLETED').length;
        const totalWbs = allWbs.length;

        // プロジェクトのステータス別集計
        const projectsByStatus = this.getProjectsByStatus(projects);

        // タスクのステータス別集計
        const tasksByStatus = this.getTasksByStatus(allTasks);

        // 締切が近いプロジェクト（7日以内）
        const upcomingDeadlines = this.getUpcomingDeadlines(projects);

        // 期限切れプロジェクト
        const overdueProjects = this.getOverdueProjects(projects);

        return {
            totalProjects,
            activeProjects,
            totalTasks,
            completedTasks,
            totalWbs,
            projectsByStatus,
            tasksByStatus,
            upcomingDeadlines,
            overdueProjects
        };
    }

    private getProjectsByStatus(projects: Project[]): { status: string; count: number }[] {
        const statusCounts = projects.reduce((acc, project) => {
            const status = project.getStatus();
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count: count as number
        }));
    }

    private getTasksByStatus(tasks: Task[]): { status: string; count: number }[] {
        const statusCounts = tasks.reduce((acc, task) => {
            const status = task.getStatus();
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count: count as number
        }));
    }

    private getUpcomingDeadlines(projects: Project[]): { projectId: string; projectName: string; endDate: Date }[] {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        return projects
            .filter(p => p.endDate <= sevenDaysFromNow && p.endDate >= new Date())
            .map(p => ({
                projectId: p.id!,
                projectName: p.name,
                endDate: p.endDate
            }))
            .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
    }

    private getOverdueProjects(projects: Project[]): { projectId: string; projectName: string; endDate: Date }[] {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return projects
            .filter(p => p.endDate < today && p.getStatus() !== 'COMPLETED' as ProjectStatus)
            .map(p => ({
                projectId: p.id!,
                projectName: p.name,
                endDate: p.endDate
            }))
            .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
    }
}