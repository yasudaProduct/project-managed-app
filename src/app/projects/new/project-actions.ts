"use server"

import prisma from "@/lib/prisma"
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
            status: "active",
        }
    })

    console.log("project:", project)

    // プロジェクト一覧ページを再検証
    revalidatePath("/projects")

    return { success: true }
}
