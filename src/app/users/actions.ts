"use server"

import { revalidatePath } from "next/cache"
import { container } from "@/lib/inversify.config"
import { IUserApplicationService } from "@/applications/user/user-application-service";
import { SYMBOL } from "@/types/symbol";

const userApplicationService = container.get<IUserApplicationService>(SYMBOL.IUserApplicationService);

export async function getUsers() {
    return await userApplicationService.getAllUsers();
}

export async function getUserById(id: string) {
    return await userApplicationService.getUserById(id);
}

export async function createUser(userData: { id: string, name: string; email: string, displayName: string; costPerHour: number }) {
    console.log(userData);
    const result = await userApplicationService.createUser(userData);

    if (result.success) {
        revalidatePath("/users");
    }

    return result;
}

export async function updateUser(id: string, userData: { name: string; email: string, displayName: string; costPerHour: number }) {
    const result = await userApplicationService.updateUser(id, userData);

    if (result.success) {
        revalidatePath("/users");
        revalidatePath(`/users/${id}`);
    }

    return result;
}
