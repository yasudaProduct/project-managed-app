"use server"

import { z } from "zod"
import { IProjectApplicationService } from "@/applications/projects/project-application-service"
import { SYMBOL } from "@/types/symbol"
import { ProjectStatus } from "@/types/wbs"
import { revalidatePath } from "next/cache"
import { container } from "@/lib/inversify.config"
import { Project } from "@/types/project"
import type { ActionResult } from "@/types/action-result"

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

const createProjectSchema = z.object({
    name: z.string().min(1, "プロジェクト名は必須です。"),
    description: z.string().max(100, "説明は100文字以下で入力してください。").optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
});

/**
 * プロジェクトを作成
 * @param projectData プロジェクトデータ
 * @returns 作成したプロジェクト
 */
export async function createProject(projectData: {
    name: string
    description: string
    startDate: Date
    endDate: Date
}): Promise<ActionResult<Project>> {
    const parsed = createProjectSchema.safeParse(projectData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const { success, error, id } = await projectApplicationService.createProject({
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
    });

    if (!success || !id) {
        return { success: false, error: error ?? "プロジェクトの作成に失敗しました。" };
    }

    // 作成したプロジェクトを取得
    const project = await projectApplicationService.getProjectById(id);
    if (!project) {
        return { success: false, error: "作成したプロジェクトの取得に失敗しました。" };
    }

    // プロジェクト一覧ページを再検証
    revalidatePath("/")
    return { success: true, data: project };
}

const updateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().max(100).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(["INACTIVE", "ACTIVE", "DONE", "CANCELLED", "PENDING"]),
});

/**
 * プロジェクトを更新
 * @param projectId プロジェクトID
 * @param projectData プロジェクトデータ
 * @returns 更新したプロジェクト
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
): Promise<ActionResult<Project>> {
    const parsed = updateProjectSchema.safeParse(projectData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const { success, error, id } = await projectApplicationService.updateProject({
        id: projectId,
        name: parsed.data.name,
        description: parsed.data.description,
        startDate: new Date(parsed.data.startDate!),
        endDate: new Date(parsed.data.endDate!),
        status: parsed.data.status,
    });

    if (!success || !id) {
        return { success: false, error: error ?? "プロジェクトの更新に失敗しました。" };
    }

    // 更新したプロジェクトを取得
    const project = await projectApplicationService.getProjectById(id);
    if (!project) {
        return { success: false, error: "更新したプロジェクトの取得に失敗しました。" };
    }

    // プロジェクト一覧ページと詳細ページを再検証
    revalidatePath("/")
    revalidatePath(`/projects/${project.id}`)
    return { success: true, data: project };
}

/**
 * プロジェクトを削除
 * @param projectId プロジェクトID
 * @returns 削除したプロジェクトID
 */
export async function deleteProject(projectId: string): Promise<ActionResult<{ id: string }>> {
    const { success, error, id } = await projectApplicationService.deleteProject(projectId);
    if (!success || !id) {
        return { success: false, error: error ?? "プロジェクトの削除に失敗しました。" };
    }

    // プロジェクト一覧ページを再検証
    revalidatePath("/")
    return { success: true, data: { id } };
}
