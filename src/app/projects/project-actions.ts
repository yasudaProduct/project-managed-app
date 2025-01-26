"use server"

import prisma from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

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

    const check = await prisma.projects.findFirst({
        select: {
            name: true,
        },
        where: {
            name: projectData.name,
        },
    })

    if (check) {
        return { success: false, error: "同様のプロジェクト名が存在します。" }
    }

    const project = await prisma.projects.create({
        data: {
            name: projectData.name,
            description: projectData.description,
            startDate: new Date(projectData.startDate).toISOString(),
            endDate: new Date(projectData.endDate).toISOString(),
            status: "ACTIVE",
        }
    })

    // プロジェクト一覧ページを再検証
    revalidatePath("/")

    return { success: true, project: project }
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

    const check = await prisma.projects.findFirst({
        select: {
            id: true,
            name: true,
        },
        where: {
            name: projectData.name,
        },
    })

    if (check && check.id != id) {
        return { success: false, error: "同様のプロジェクト名が存在します。" }
    }

    const project = await prisma.projects.update({
        where: { id: id },
        data: {
            name: projectData.name,
            description: projectData.description,
            startDate: new Date(projectData.startDate).toISOString(),
            endDate: new Date(projectData.endDate).toISOString(),
            status: projectData.status,
        },
    })

    // プロジェクト一覧ページと詳細ページを再検証
    revalidatePath("/")
    revalidatePath(`/projects/${project.id}`)

    return { success: true, project: project }
}
