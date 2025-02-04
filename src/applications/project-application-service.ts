import type { IProjectRepository } from "@/applications/iproject-repository";
import { Project } from "@/domains/project/project";
import type { Project as ProjectType } from "@/types/project";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";


export interface IProjectApplicationService {
    createProject(args: { name: string; description: string; startDate: Date; endDate: Date }): Promise<{ success: boolean; error?: string; id?: string }>;
    getProjectById(id: string): Promise<ProjectType | null>;
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

}
