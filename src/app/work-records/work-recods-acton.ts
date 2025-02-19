"use server"

import prisma from "@/lib/prisma";

export async function getWorkRecords() {
    const workRecords = await prisma.workRecord.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
            task: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedWorkRecords = workRecords.map((workRecord: any) => ({
        id: workRecord.id,
        userId: workRecord.userId,
        userName: workRecord.user.name,
        taskId: workRecord.taskId,
        taskName: workRecord.task.name,
        date: workRecord.date,
        hours_worked: workRecord.hours_worked,
    }));

    return formattedWorkRecords;
}

export async function getWorkRecordById(id: string) {
    return await prisma.workRecord.findUnique({
        where: {
            id: id,
        },
    });
}