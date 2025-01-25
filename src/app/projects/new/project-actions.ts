"use server"

import { revalidatePath } from "next/cache"

export async function createProject(projectData: {
    name: string
    description: string
    startDate: string
    endDate: string
}) {
    // ここでデータベースに新しいプロジェクトを保存する処理を実装します
    // 例: await db.insert(projectData).into('projects')

    console.log("Creating new project:", projectData)

    // プロジェクト一覧ページを再検証
    revalidatePath("/projects")

    return { success: true }
}

