"use server"

import { IProjectApplicationService } from "@/applications/projects/project-application-service"
import { SYMBOL } from "@/types/symbol"
import { ProjectStatus } from "@/types/wbs"
import { revalidatePath } from "next/cache"
import { container } from "@/lib/inversify.config"
import { Project } from "@/types/project"

const projectApplicationService = container.get<IProjectApplicationService>(SYMBOL.IProjectApplicationService);

/**
 * プロジェクトを取得
 * @param id プロジェクトID
 * @returns プロジェクト
 */
export async function getProjectById(id: string): Promise<Project | null> {
    return await projectApplicationService.getProjectById(id);
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
    startDate: Date
    endDate: Date
}): Promise<{ success: boolean, error?: string, id?: string, project?: Project }> {
    console.log("projectData", projectData);
    console.log("new Date()", new Date());
    console.log("new Date('2025/09/21')", new Date("2025/09/21"));

    // プロジェクトを作成
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
        status: ProjectStatus
    },
): Promise<{ success: boolean, error?: string, id?: string, project?: Project }> {

    // プロジェクトを更新
    const { success, error, id } = await projectApplicationService.updateProject(
        {
            id: projectId,
            name: projectData.name,
            description: projectData.description,
            startDate: new Date(projectData.startDate!),
            endDate: new Date(projectData.endDate!),
            status: projectData.status,
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