"use server";

import prisma from "@/lib/prisma/prisma";
import { scheduleTsvData } from "@/types/csv";

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

export async function getUsers(): Promise<Array<{ id: string, name: string, email: string }>> {
    const users = await prisma.users.findMany({
        select: {
            id: true,
            name: true,
            email: true,
        },
    });

    return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
    }));
}

export async function importScheduleTsv(tsvData: scheduleTsvData[]): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        // トランザクション
        await prisma.$transaction(async (tx) => {
            console.log('TSV Import Data:', tsvData);

            // userSchedule を削除
            await tx.userSchedule.deleteMany();

            for (const schedule of tsvData) {
                // データの検証
                const userId = schedule['個人ｺｰﾄﾞ']?.trim();
                const dateTimeStr = schedule['年月日']?.trim();

                if (!userId || !dateTimeStr) {
                    console.warn(`無効なスケジュールデータをスキップ: ${JSON.stringify(schedule)}`);
                    continue;
                }

                // ユーザーの存在確認（個人コードでユーザーを探す）
                const user = await tx.users.findFirst({
                    where: {
                        id: userId,
                    }
                });

                if (!user) {
                    console.warn(`ユーザーが見つかりません: ${userId}`);
                    continue;
                }

                // 日付の検証と変換（YYYY/MM/DD HH:mm:ss → Date）
                const dateTimeRegex = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+\d{2}:\d{2}:\d{2}$/;
                const match = dateTimeStr.match(dateTimeRegex);

                if (!match) {
                    console.warn(`無効な日付形式: ${dateTimeStr}`);
                    continue;
                }

                const [, year, month, day] = match;
                const scheduleDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

                if (isNaN(scheduleDate.getTime())) {
                    console.warn(`無効な日付: ${dateTimeStr}`);
                    continue;
                }

                // 時間の検証
                const startTime = schedule['開始時間']?.trim() || '';
                const endTime = schedule['終了時間']?.trim() || '';

                // 時間形式の検証 (HH:mm)
                const timeRegex = /^\d{1,2}:\d{2}$/;
                if (startTime && !timeRegex.test(startTime)) {
                    console.warn(`無効な開始時間形式: ${startTime}`);
                    continue;
                }
                if (endTime && !timeRegex.test(endTime)) {
                    console.warn(`無効な終了時間形式: ${endTime}`);
                    continue;
                }

                // スケジュールレコードを作成
                await tx.userSchedule.create({
                    data: {
                        userId: userId,
                        date: scheduleDate,
                        startTime: startTime,
                        endTime: endTime,
                        title: schedule['ﾀｲﾄﾙ']?.trim() || '',
                        location: schedule['場所']?.trim() || '',
                        description: schedule['内容']?.trim() || '',
                    }
                });
            }
        }, {
            maxWait: 30000, // 最大待機時間: 30秒
            timeout: 30000, // タイムアウト: 30秒
        });

        return {
            success: true,
        };
    } catch (error) {
        console.error('TSVスケジュールインポートエラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました',
        };
    }
}