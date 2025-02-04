import { Project } from "../models/project/project";

export interface IProjectRepository {
    findById(id: string): Promise<Project | null>;
    findByName(name: string): Promise<Project | null>;
    findAll(): Promise<Project[]>;
    create(project: Project): Promise<void>;
    update(project: Project): Promise<void>;
    delete(id: string): Promise<void>;
}