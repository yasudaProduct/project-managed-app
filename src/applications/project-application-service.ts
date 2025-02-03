import { IProjectRepository } from "@/models/project/iproject-repository";
import { Project } from "@/models/project/project";
import { ProjectStatus } from "@/models/project/project-status";
import { ProjectStatus as ProjectStatusType } from "@/types/wbs";

export class ProjectApplicationService {
    private readonly projectRepository: IProjectRepository;

    constructor(projectRepository: IProjectRepository) {
        this.projectRepository = projectRepository;
    }

    public async createProject(args: { name: string; status: ProjectStatusType; description: string; startDate: Date; endDate: Date }) {
        const project = Project.create({
            id: undefined,
            name: args.name,
            status: new ProjectStatus({ status: args.status }),
            description: args.description,
            startDate: args.startDate,
            endDate: args.endDate,
        });
        await this.projectRepository.create(project);
    }
}