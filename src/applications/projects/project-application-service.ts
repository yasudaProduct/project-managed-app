import type { IProjectRepository } from "@/applications/projects/iproject-repository";
import { Project } from "@/domains/project/project";
import type { Project as ProjectType } from "@/types/project";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";


export interface IProjectApplicationService {
    getProjectById(id: string): Promise<ProjectType | null>;
    getProjectAll(): Promise<ProjectType[] | null>;
    createProject(args: { name: string; description: string; startDate: Date; endDate: Date }): Promise<{ success: boolean; error?: string; id?: string }>;
    updateProject(args: { id: string; name?: string; description?: string; startDate?: Date; endDate?: Date }): Promise<{ success: boolean; error?: string; id?: string }>;
    deleteProject(id: string): Promise<{ success: boolean; error?: string; id?: string }>;
}

@injectable()
export class ProjectApplicationService implements IProjectApplicationService {

    constructor(@inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository) {
    }

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

    public async getProjectAll(): Promise<ProjectType[] | null> {
        const projects = await this.projectRepository.findAll();

        // TODO ステータスで生きているものを絞り込んで返却する
        return projects.map((project) => {
            return {
                id: project.id!,
                name: project.name,
                status: project.getStatus(),
                description: project.description,
                startDate: project.startDate,
                endDate: project.endDate,
            }
        })
            ;
    }

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

    public async updateProject(args: { id: string; name?: string; description?: string; startDate?: Date; endDate?: Date }): Promise<{ success: boolean; error?: string; id?: string }> {
        const project = await this.projectRepository.findById(args.id);
        if (!project) return { success: false, error: "プロジェクトが存在しません。" }

        if (args.name) project.updateName(args.name);
        if (args.description) project.updateDescription(args.description);
        if (args.startDate) project.updateStartDate(args.startDate);
        if (args.endDate) project.updateEndDate(args.endDate);

        // プロジェクト名の重複チェック
        const check = await this.projectRepository.findByName(project.name);
        if (check && !check.isEqual(project)) {
            return { success: false, error: "同様のプロジェクト名が存在します。" }
        }

        const udpatedProject = await this.projectRepository.update(project);
        return { success: true, id: udpatedProject.id }
    }

    public async deleteProject(id: string): Promise<{ success: boolean; error?: string; id?: string }> {
        const project = await this.projectRepository.findById(id);
        if (!project) return { success: false, error: "プロジェクトが存在しません。" }
        await this.projectRepository.delete(id);
        return { success: true, id: id }
    }

}
