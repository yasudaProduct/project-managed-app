"use server"

import { IProjectApplicationService } from "@/applications/projects/project-application-service"
import prisma from "@/lib/prisma"
import { SYMBOL } from "@/types/symbol"
import { ProjectStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { container } from "@/lib/inversify.config"
import { Project } from "@/types/project"
import { ensureUTC } from "@/lib/date-utils"

const projectApplicationService = container.get<IProjectApplicationService>(SYMBOL.IProjectApplicationService);

/**
 * プロジェクトを取得
 * @param id プロジェクトID
 * @returns プロジェクト
 */
export async function getProjectById(id: string) {
    const project = await prisma.projects.findUnique({
        where: { id: id },
    })
    if (!project) {
        return null
    }
    // データベースからのUTC日付はそのまま返す（クライアント側で表示変換）
    return project
}

/**
 * プロジェクト一覧を取得
 * @returns プロジェクト一覧
 */
export async function getProjectAll() {
    return await projectApplicationService.getProjectAll();
}

/**
 * プロジェクトを作成
 * @param projectData プロジェクトデータ
 * @returns プロジェクト
 */
export async function createProject(projectData: {
    name: string
    description: string
    startDate: string
    endDate: string
}): Promise<{ success: boolean, error?: string, id?: string, project?: Project }> {

    // プロジェクトを作成
    const { success, error, id } = await projectApplicationService.createProject(
        {
            name: projectData.name,
            description: projectData.description,
            startDate: ensureUTC(projectData.startDate)!,
            endDate: ensureUTC(projectData.endDate)!,
        }
    );

    if (!success) {
        return { success: false, error: error }
    }

    // 作成したプロジェクトを取得
    const project = await projectApplicationService.getProjectById(id!);

    // プロジェクト一覧ページを再検証
    revalidatePath("/")

    return { success: true, project: project! }
}

/**
 * プロジェクトを更新
 * @param projectId プロジェクトID
 * @param projectData プロジェクトデータ
 * @returns プロジェクト
 */
export async function updateProject(
    projectId: string,
    projectData: {
        name?: string
        description?: string
        startDate?: string
        endDate?: string
        status?: ProjectStatus
    },
): Promise<{ success: boolean, error?: string, id?: string, project?: Project }> {

    // プロジェクトを更新
    const { success, error, id } = await projectApplicationService.updateProject(
        {
            id: projectId,
            name: projectData.name,
            description: projectData.description,
            startDate: ensureUTC(projectData.startDate),
            endDate: ensureUTC(projectData.endDate),
        }
    );

    if (!success) {
        return { success: false, error: error }
    }

    // 更新したプロジェクトを取得
    const project = await projectApplicationService.getProjectById(id!);

    // プロジェクト一覧ページと詳細ページを再検証
    revalidatePath("/")
    revalidatePath(`/projects/${project!.id}`)

    return { success: true, project: project! }
}

/**
 * プロジェクトを削除
 * @param projectId プロジェクトID
 * @returns プロジェクト
 */
export async function deleteProject(projectId: string): Promise<{ success: boolean, error?: string, id?: string }> {

    // プロジェクトを削除
    const { success, error, id } = await projectApplicationService.deleteProject(projectId);
    if (!success) {
        return { success: false, error: error }
    }

    // プロジェクト一覧ページを再検証
    revalidatePath("/")
    return { success: true, id: id }
}