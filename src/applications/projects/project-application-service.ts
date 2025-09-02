import type { IProjectRepository } from "@/applications/projects/iproject-repository";
import { Project } from "@/domains/project/project";
import { ProjectStatus } from "@/domains/project/project-status";
import type { Project as ProjectType } from "@/types/project";
import { SYMBOL } from "@/types/symbol";
import { ProjectStatus as ProjectStatusType} from "@/types/wbs";
import { inject, injectable } from "inversify";

export interface IProjectApplicationService {
    getProjectById(id: string): Promise<ProjectType | null>;
    getProjectAll(): Promise<ProjectType[] | null>;
    createProject(args: { name: string; description: string; startDate: Date; endDate: Date }): Promise<{ success: boolean; error?: string; id?: string }>;
    updateProject(args: { id: string; name?: string; description?: string; startDate?: Date; endDate?: Date }): Promise<{ success: boolean; error?: string; id?: string }>;
    deleteProject(id: string): Promise<{ success: boolean; error?: string; id?: string }>;
}

/**
 * プロジェクトアプリケーションサービス
 */
@injectable()
export class ProjectApplicationService implements IProjectApplicationService {

    constructor(@inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository) {
    }

    /**
     * プロジェクトを取得
     * @param id プロジェクトID
     * @returns プロジェクト
     */
    public async getProjectById(id: string): Promise<ProjectType | null> {
        const project = await this.projectRepository.findById(id);
        if (!project) return null;
        return {
            id: project.id!,
            name: project.name,
            status: project.getStatus(),
            description: project.description,
            startDate: project.startDate,
            endDate: project.endDate,
        };
    }

    /**
     * プロジェクト一覧を取得
     * @returns プロジェクト一覧
     */
    public async getProjectAll(): Promise<ProjectType[] | null> {
        const projects = await this.projectRepository.findAll();

        return projects.map((project) => {
            return {
                id: project.id!,
                name: project.name,
                status: project.getStatus(),
                description: project.description,
                startDate: project.startDate,
                endDate: project.endDate,
            }
        });
    }

    /**
     * プロジェクトを作成
     * @param args プロジェクトデータ
     * @returns プロジェクト
     */
    public async createProject(args: { name: string; description: string; startDate: Date; endDate: Date }): Promise<{ success: boolean; error?: string; id?: string }> {
        const project = Project.create({
            name: args.name,
            description: args.description,
            startDate: args.startDate,
            endDate: args.endDate,
        });

        const check = await this.projectRepository.findByName(project.name);
        if (check) {
            return { success: false, error: "同様のプロジェクト名が存在します。" }
        }

        const newProject = await this.projectRepository.create(project);
        return { success: true, id: newProject.id }
    }

    /**
     * プロジェクトを更新
     * @param args プロジェクトデータ
     * @returns プロジェクト
     */
    public async updateProject(
        args: { 
            id: string; 
            name?: string; 
            description?: string; 
            startDate?: Date; 
            endDate?: Date; 
            status?: ProjectStatusType
        }): Promise<{ success: boolean; error?: string; id?: string }> {
        const project: Project | null = await this.projectRepository.findById(args.id);
        if (!project) return { success: false, error: "プロジェクトが存在しません。" }

        if (args.name) project.updateName(args.name);
        if (args.description) project.updateDescription(args.description);
        if (args.startDate) project.updateStartDate(args.startDate);
        if (args.endDate) project.updateEndDate(args.endDate);
        if (args.status) project.updateStatus(new ProjectStatus({ status: args.status }));

        // プロジェクト名の重複チェック
        const check = await this.projectRepository.findByName(project.name);
        if (check && !check.isEqual(project)) {
            return { success: false, error: "同様のプロジェクト名が存在します。" }
        }

        const udpatedProject = await this.projectRepository.update(project);
        return { success: true, id: udpatedProject.id }
    }

    /**
     * プロジェクトを削除
     * @param id プロジェクトID
     * @returns プロジェクト
     */
    public async deleteProject(id: string): Promise<{ success: boolean; error?: string; id?: string }> {
        const project = await this.projectRepository.findById(id);
        if (!project) return { success: false, error: "プロジェクトが存在しません。" }
        await this.projectRepository.delete(id);
        return { success: true, id: id }
    }

}
