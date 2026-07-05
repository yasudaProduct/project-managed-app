"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { container } from "@/lib/inversify.config"
import { IUserApplicationService } from "@/applications/user/user-application-service";
import { SYMBOL } from "@/types/symbol";
import type { ActionResult } from "@/types/action-result"

const userApplicationService = container.get<IUserApplicationService>(SYMBOL.IUserApplicationService);

export async function getUsers() {
    return await userApplicationService.getAllUsers();
}

export async function getUserById(id: string) {
    return await userApplicationService.getUserById(id);
}

const createUserSchema = z.object({
    id: z.string().min(1, "IDは必須です。"),
    name: z.string().min(1, "名前は必須です。"),
    email: z.string().email("有効なメールアドレスを入力してください。"),
    displayName: z.string().min(1, "表示名は必須です。"),
    costPerHour: z.number().min(0, "人員原価は0以上の数値を入力してください。"),
});

export async function createUser(userData: { id: string, name: string; email: string, displayName: string; costPerHour: number }): Promise<ActionResult<void>> {
    const parsed = createUserSchema.safeParse(userData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await userApplicationService.createUser(parsed.data);
    if (!result.success) {
        return { success: false, error: result.error ?? "ユーザーの作成に失敗しました。" };
    }

    revalidatePath("/users");
    return { success: true, data: undefined };
}

const updateUserSchema = z.object({
    name: z.string().min(1, "名前は必須です。"),
    email: z.string().email("有効なメールアドレスを入力してください。"),
    displayName: z.string().min(1, "表示名は必須です。"),
    costPerHour: z.number().min(0, "人員原価は0以上の数値を入力してください。"),
});

export async function updateUser(id: string, userData: { name: string; email: string, displayName: string; costPerHour: number }): Promise<ActionResult<void>> {
    const parsed = updateUserSchema.safeParse(userData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await userApplicationService.updateUser(id, parsed.data);
    if (!result.success) {
        return { success: false, error: result.error ?? "ユーザーの更新に失敗しました。" };
    }

    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    return { success: true, data: undefined };
}
