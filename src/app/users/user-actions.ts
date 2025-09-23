"use server"

import prisma from "@/lib/prisma/prisma";
import { revalidatePath } from "next/cache"

export async function getUsers() {
    return await prisma.users.findMany({
        orderBy: {
            createdAt: 'asc',
        },
    });
}

// TODO: サービス呼び出し
export async function getUserById(id: string) {
    return await prisma.users.findUnique({
        where: {
            id: id,
        },
    });
}

// TODO: サービス呼び出し
export async function createUser(userData: { id: string, name: string; email: string, displayName: string }) {
    console.log(userData);
    const newUser = await prisma.users.create({
        data: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            displayName: userData.displayName,
        },
    });

    revalidatePath("/users")
    return { success: true, user: newUser }
}

// TODO: サービス呼び出し
export async function updateUser(id: string, userData: { name: string; email: string, displayName: string }) {
    const updatedUser = await prisma.users.update({
        where: { id: id },
        data: {
            name: userData.name,
            email: userData.email,
            displayName: userData.displayName,
        },
    });

    revalidatePath("/users")
    revalidatePath(`/users/${id}`)
    return { success: true, user: updatedUser }
}
