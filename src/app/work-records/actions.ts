"use server"

import { formatDate } from "@/utils/date-util";
import prisma from "@/lib/prisma/prisma";

// TODO: サービス呼び出し
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
                    taskNo: true,
                },
            },
        },
    });

    const formattedWorkRecords = workRecords.map((workRecord) => ({
        id: workRecord.id,
        userId: workRecord.userId,
        userName: workRecord.user.name,
        taskNo: workRecord.task?.taskNo,
        taskName: workRecord.task?.name,
        date: formatDate(workRecord.date, "YYYY/MM/DD"),
        hours_worked: Number(workRecord.hours_worked),
    }));

    return formattedWorkRecords;
}

// TODO: サービス呼び出し
export async function getWorkRecordById(id: string) {
    return await prisma.workRecord.findUnique({
        where: {
            id: parseInt(id),
        },
    });
}