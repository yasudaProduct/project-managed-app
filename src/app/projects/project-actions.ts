"use server"

import { IProjectApplicationService } from "@/applications/projects/project-application-service"
import prisma from "@/lib/prisma"
import { SYMBOL } from "@/types/symbol"
import { ProjectStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { container } from "@/lib/inversify.config"

export async function getProjectById(id: string) {
    return await prisma.projects.findUnique({
        where: { id: id },
    })
}

export async function createProject(projectData: {
    name: string
    description: string
    startDate: string
    endDate: string
}) {

    const projectApplicationService = container.get<IProjectApplicationService>(SYMBOL.IProjectApplicationService);

    const { success, error, id } = await projectApplicationService.createProject(
        {
            name: projectData.name,
            description: projectData.description,
            startDate: new Date(projectData.startDate),
            endDate: new Date(projectData.endDate),
        }
    );

    if (!success) {
        return { success: false, error: error }
    }

    const project = await projectApplicationService.getProjectById(id!);

    // プロジェクト一覧ページを再検証
    revalidatePath("/")

    return { success: true, project: project }
}

export async function updateProject(
    projectId: string,
    projectData: {
        name?: string
        description?: string
        startDate?: string
        endDate?: string
        status?: ProjectStatus
    },
) {

    const projectApplicationService = container.get<IProjectApplicationService>(SYMBOL.IProjectApplicationService);

    const { success, error, id } = await projectApplicationService.updateProject(
        {
            id: projectId,
            name: projectData.name,
            description: projectData.description,
            startDate: projectData.startDate ? new Date(projectData.startDate) : undefined,
            endDate: projectData.endDate ? new Date(projectData.endDate) : undefined,
        }
    );

    if (!success) {
        return { success: false, error: error }
    }

    const project = await projectApplicationService.getProjectById(id!);

    // プロジェクト一覧ページと詳細ページを再検証
    revalidatePath("/")
    revalidatePath(`/projects/${project!.id}`)

    return { success: true, project: project }
}

export async function deleteProject(projectId: string) {
    const projectApplicationService = container.get<IProjectApplicationService>(SYMBOL.IProjectApplicationService);
    const { success, error, id } = await projectApplicationService.deleteProject(projectId);
    if (!success) {
        return { success: false, error: error }
    }
    revalidatePath("/")
    return { success: true, id: id }
}