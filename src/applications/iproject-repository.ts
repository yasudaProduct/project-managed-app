import { Project } from "../domains/project/project";

export interface IProjectRepository {
    findById(id: string): Promise<Project | null>;
    findByName(name: string): Promise<Project | null>;
    findAll(): Promise<Project[]>;
    create(project: Project): Promise<Project>;
    update(project: Project): Promise<Project>;
    delete(id: string): Promise<void>;
}