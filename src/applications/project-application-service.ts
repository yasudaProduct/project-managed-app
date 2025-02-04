import type { IProjectRepository } from "@/applications/iproject-repository";
import { Project } from "@/models/project/project";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";


export interface IProjectApplicationService {
    createProject(args: { name: string; description: string; startDate: Date; endDate: Date }): Promise<{ success: boolean; error: string }>;
}

@injectable()
export class ProjectApplicationService implements IProjectApplicationService {

    constructor(@inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository) {
    }

    public async getProjectById(id: string): Promise<Project | null> {
        return await this.projectRepository.findById(id);
    }

    public async createProject(args: { name: string; description: string; startDate: Date; endDate: Date }): Promise<{ success: boolean; error: string; project: Project | null }> {
        const project = Project.create({
            name: args.name,
            description: args.description,
            startDate: args.startDate,
            endDate: args.endDate,
        });

        const check = await this.projectRepository.findByName(project.name);
        if (check) {
            return { success: false, error: "同様のプロジェクト名が存在します。", project: null }
        }

        const newProject = await this.projectRepository.create(project);
        return { success: true, error: "", project: newProject }
    }

}
