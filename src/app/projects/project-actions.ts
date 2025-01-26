"use server"

import prisma from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function createProject(projectData: {
    name: string
    description: string
    startDate: string
    endDate: string
}) {
    console.log("createProject:", projectData)

    const project = await prisma.projects.create({
        data: {
            name: projectData.name,
            description: projectData.description,
            startDate: new Date(projectData.startDate).toISOString(),
            endDate: new Date(projectData.endDate).toISOString(),
            status: "ACTIVE",
        }
    })

    console.log("project:", project)

    // プロジェクト一覧ページを再検証
    revalidatePath("/projects")

    return { success: true }
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

    console.log("project:", project)

    // プロジェクト一覧ページと詳細ページを再検証
    revalidatePath("/projects")
    revalidatePath(`/projects/${id}`)

    return { success: true }
}
