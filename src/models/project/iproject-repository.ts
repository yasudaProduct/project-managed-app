import { Project } from "./project";

export interface IProjectRepository {
    findById(id: string): Promise<Project | null>;
    findAll(): Promise<Project[]>;
    create(project: Project): Promise<void>;
    update(project: Project): Promise<void>;
    delete(id: string): Promise<void>;
}