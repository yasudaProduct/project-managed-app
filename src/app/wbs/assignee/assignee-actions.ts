"use server"

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

export async function getWbsAssignees(wbsId: number) {
    console.log("getWbsAssignees");
    return await prisma.wbsAssignee.findMany({
        where: {
            wbsId: wbsId,
        },
        include: {
            assignee: true,
        },
        orderBy: {
            assignee: {
                id: "asc",
            },
        },
    });
}

export async function getWbsAssigneeById(id: number) {
    return await prisma.wbsAssignee.findUnique({
        include: {
            assignee: true,
        },
        where: {
            id: id,
        },
    });
}