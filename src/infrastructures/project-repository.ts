import prisma from "@/lib/prisma";
import { IProjectRepository } from "@/applications/iproject-repository";
import { Project } from "@/models/project/project";
import { ProjectStatus } from "@/models/project/project-status";
import { injectable } from "inversify";

@injectable()
export class ProjectRepository implements IProjectRepository {
    async findById(id: string): Promise<Project | null> {
        const projectDb = await prisma.projects.findUnique({
            where: { id },
        });

        if (!projectDb) return null;

        return Project.create({
            id: projectDb.id,
            name: projectDb.name,
            status: new ProjectStatus({ status: projectDb.status }),
            description: projectDb.description ?? undefined,
            startDate: projectDb.startDate,
            endDate: projectDb.endDate,
        });
    }
    async findAll(): Promise<Project[]> {
        const projectsDb = await prisma.projects.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        return projectsDb.map(projectDb => Project.create({
            id: projectDb.id,
            name: projectDb.name,
            status: new ProjectStatus({ status: projectDb.status }),
            description: projectDb.description ?? undefined,
            startDate: projectDb.startDate,
            endDate: projectDb.endDate,
        }));
    }
    async create(project: Project): Promise<void> {
        await prisma.projects.create({
            data: {
                name: project.name,
                status: project.status.status,
                description: project.description ?? undefined,
                startDate: project.startDate,
                endDate: project.endDate,
            },
        });
    }
    async update(project: Project): Promise<void> {
        await prisma.projects.update({
            where: { id: project.id },
            data: {
                name: project.name,
                status: project.status.status,
                description: project.description ?? undefined,
                startDate: project.startDate,
                endDate: project.endDate,
            },
        });
    }
    async delete(id: string): Promise<void> {
        await prisma.projects.delete({
            where: { id },
        });
    }


}