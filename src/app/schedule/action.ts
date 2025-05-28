"use server";

import prisma from "@/lib/prisma";
import { scheduleCsvData } from "@/types/csv";

export interface ScheduleEntry {
    id: number;
    userId: string;
    name: string;
    date: Date;
    startTime: string;
    endTime: string;
    title: string;
    location: string;
    description: string;
}

export async function getSchedules(): Promise<ScheduleEntry[]> {
    const schedules = await prisma.userSchedule.findMany({
        include: {
            user: true,
        },
    });

    return schedules.map((schedule) => ({
        id: schedule.id,
        userId: schedule.userId,
        name: schedule.user.name,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        title: schedule.title,
        location: schedule.location ?? "",
        description: schedule.description ?? "",
    }));
}

export async function importSchedule(csv: scheduleCsvData[]): Promise<{
    success: boolean;
    error?: string;
}> {

    // トランザクション
    await prisma.$transaction(async (tx) => {

        // userSchedule を削除
        await tx.userSchedule.deleteMany();

        for (const schedule of csv) {
            const user = await tx.users.findFirst({
                where: {
                    id: schedule.userId,
                }
            });

            if (!user) {
                // ユーザーが見つからない場合はスキップ
                continue;
            }

            const schedules = await tx.userSchedule.createMany({
                data: {
                    userId: schedule.userId,
                    date: new Date(schedule.date),
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    title: schedule.title,
                    location: schedule.location,
                    description: schedule.description,
                }
            });

            if (!schedules) {
                throw new Error(`スケジュールの作成に失敗しました: ${schedule.userId}`);
            }
        }
    });

    return {
        success: true,
    };
}