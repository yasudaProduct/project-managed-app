"use server"

import { IProjectApplicationService } from "@/applications/project-application-service"
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

    const result = await projectApplicationService.createProject(
        {
            name: projectData.name,
            description: projectData.description,
            startDate: new Date(projectData.startDate),
            endDate: new Date(projectData.endDate),
        }
    );

    if (!result.success) {
        return result
    }

    const project = await projectApplicationService.getProjectById(result.project.id);

    // プロジェクト一覧ページを再検証
    revalidatePath("/")

    return { success: true, project: result.project }
}

export async function updateProject(
    id: string,
    projectData: {
        name: string
        description: string
        startDate: string
        endDate: string
        status: ProjectStatus
    },
) {

    await createProject(projectData);

    // const project = await getProjectById(id);
    // if (!project) {
    //     return { success: false, error: "プロジェクトが存在しません。" }
    // }


    // const check = await prisma.projects.findFirst({
    //     select: {
    //         id: true,
    //         name: true,
    //     },
    //     where: {
    //         name: projectData.name,
    //     },
    // })

    // if (check && check.id != id) {
    //     return { success: false, error: "同様のプロジェクト名が存在します。" }
    // }

    // const project = await prisma.projects.update({
    //     where: { id: id },
    //     data: {
    //         name: projectData.name,
    //         description: projectData.description,
    //         startDate: new Date(projectData.startDate).toISOString(),
    //         endDate: new Date(projectData.endDate).toISOString(),
    //         status: projectData.status,
    //     },
    // })

    // プロジェクト一覧ページと詳細ページを再検証
    revalidatePath("/")
    revalidatePath(`/projects/${project.id}`)

    return { success: true, project: project }
}
