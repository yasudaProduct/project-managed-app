import prisma from "@/lib/prisma";

export async function getUsers() {
    return await prisma.users.findMany({
        select: {
            id: true,
            name: true,
            displayName: true,
        },
    });
} 