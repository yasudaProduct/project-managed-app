import prisma from "@/lib/prisma/prisma";
import { IProjectRepository } from "@/applications/projects/iproject-repository";
import { Project } from "@/domains/project/project";
import { ProjectStatus } from "@/domains/project/project-status";
import { injectable } from "inversify";

@injectable()
export class ProjectRepository implements IProjectRepository {

    async findById(id: string): Promise<Project | null> {
        const projectDb = await prisma.projects.findUnique({
            where: { id },
        });

        if (!projectDb) return null;

        return Project.createFromDb({
            id: projectDb.id,
            name: projectDb.name,
            status: new ProjectStatus({ status: projectDb.status }),
            description: projectDb.description ?? undefined,
            startDate: projectDb.startDate,
            endDate: projectDb.endDate,
        });
    }

    async findByName(name: string): Promise<Project | null> {
        const projectDb = await prisma.projects.findFirst({
            where: { name },
        });
        if (!projectDb) return null;
        return Project.createFromDb({
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
        return projectsDb.map(projectDb => Project.createFromDb({
            id: projectDb.id,
            name: projectDb.name,
            status: new ProjectStatus({ status: projectDb.status }),
            description: projectDb.description ?? undefined,
            startDate: projectDb.startDate,
            endDate: projectDb.endDate,
        }));
    }

    async create(project: Project): Promise<Project> {
        const projectDb = await prisma.projects.create({
            data: {
                name: project.name,
                status: project.getStatus(),
                description: project.description ?? undefined,
                startDate: project.startDate,
                endDate: project.endDate,
            },
        });

        return Project.createFromDb({
            id: projectDb.id,
            name: projectDb.name,
            status: new ProjectStatus({ status: projectDb.status }),
            description: projectDb.description ?? undefined,
            startDate: projectDb.startDate,
            endDate: projectDb.endDate,
        });
    }

    async update(project: Project): Promise<Project> {
        const projectDb = await prisma.projects.update({
            where: { id: project.id },
            data: {
                name: project.name,
                status: project.getStatus(),
                description: project.description ?? undefined,
                startDate: project.startDate,
                endDate: project.endDate,
            },
        });
        return Project.createFromDb({
            id: projectDb.id,
            name: projectDb.name,
            status: new ProjectStatus({ status: projectDb.status }),
            description: projectDb.description ?? undefined,
            startDate: projectDb.startDate,
            endDate: projectDb.endDate,
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.projects.delete({
            where: { id },
        });
    }


}