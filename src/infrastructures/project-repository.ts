import prisma from "@/lib/prisma/prisma";
import { IProjectRepository } from "@/applications/projects/iproject-repository";
import { Project } from "@/domains/project/project";
import { ProjectStatus } from "@/domains/project/project-status";
import { injectable } from "inversify";
import type { Projects as ProjectDb } from "@prisma/client";
import type { ProjectKind, StandingCategory } from "@/types/project";

@injectable()
export class ProjectRepository implements IProjectRepository {

    async findById(id: string): Promise<Project | null> {
        const projectDb = await prisma.projects.findUnique({
            where: { id },
        });

        if (!projectDb) return null;

        return toDomain(projectDb);
    }

    async findByName(name: string): Promise<Project | null> {
        const projectDb = await prisma.projects.findFirst({
            where: { name },
        });
        if (!projectDb) return null;
        return toDomain(projectDb);
    }

    async findAll(): Promise<Project[]> {
        const projectsDb = await prisma.projects.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        return projectsDb.map(projectDb => toDomain(projectDb));
    }

    async create(project: Project): Promise<Project> {
        const projectDb = await prisma.projects.create({
            data: {
                name: project.name,
                status: project.getStatus(),
                kind: project.kind,
                category: project.category ?? null,
                description: project.description ?? undefined,
                startDate: project.startDate,
                endDate: project.endDate,
            },
        });

        return toDomain(projectDb);
    }

    async update(project: Project): Promise<Project> {
        const projectDb = await prisma.projects.update({
            where: { id: project.id },
            data: {
                name: project.name,
                status: project.getStatus(),
                category: project.category ?? null,
                description: project.description ?? undefined,
                startDate: project.startDate,
                endDate: project.endDate,
            },
        });
        return toDomain(projectDb);
    }

    async delete(id: string): Promise<void> {
        await prisma.projects.delete({
            where: { id },
        });
    }


}

function toDomain(projectDb: ProjectDb): Project {
    return Project.createFromDb({
        id: projectDb.id,
        name: projectDb.name,
        status: new ProjectStatus({ status: projectDb.status }),
        description: projectDb.description ?? undefined,
        startDate: projectDb.startDate,
        endDate: projectDb.endDate,
        kind: toKind(projectDb.kind),
        category: projectDb.category ? toCategory(projectDb.category) : undefined,
    });
}

function toKind(kind: ProjectDb["kind"]): ProjectKind {
    return kind === "STANDING" ? "STANDING" : "PROJECT";
}

function toCategory(category: NonNullable<ProjectDb["category"]>): StandingCategory {
    switch (category) {
        case "MAINTENANCE":
            return "MAINTENANCE";
        case "INTERNAL":
            return "INTERNAL";
        default:
            return "OTHER";
    }
}
