import { inject, injectable } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IUserRepository } from "@/applications/user/iuser-repositroy";
import type { UserSchedule } from "@/domains/calendar/assignee-working-calendar";
import type { ScheduleEntry } from "@/types/schedule";
import type { scheduleTsvData } from "@/types/csv";

export interface IScheduleApplicationService {
    getSchedules(): Promise<ScheduleEntry[]>;
    importScheduleTsv(tsvData: scheduleTsvData[]): Promise<{ success: boolean; error?: string }>;
}

const DATE_TIME_REGEX = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+\d{2}:\d{2}:\d{2}$/;
const TIME_REGEX = /^\d{1,2}:\d{2}$/;

@injectable()
export class ScheduleApplicationService implements IScheduleApplicationService {
    constructor(
        @inject(SYMBOL.IUserScheduleRepository) private readonly userScheduleRepository: IUserScheduleRepository,
        @inject(SYMBOL.IUserRepository) private readonly userRepository: IUserRepository,
    ) { }

    public async getSchedules(): Promise<ScheduleEntry[]> {
        const [schedules, users] = await Promise.all([
            this.userScheduleRepository.findAll(),
            this.userRepository.findAll(),
        ]);

        const userNameById = new Map(users.map((user) => [user.id, user.name]));

        return schedules.map((schedule) => ({
            id: schedule.id,
            userId: schedule.userId,
            name: userNameById.get(schedule.userId) ?? "",
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            title: schedule.title,
            location: schedule.location ?? "",
            description: schedule.description ?? "",
        }));
    }

    public async importScheduleTsv(tsvData: scheduleTsvData[]): Promise<{ success: boolean; error?: string }> {
        try {
            const users = await this.userRepository.findAll();
            const userIds = new Set(users.map((user) => user.id).filter((id): id is string => id !== undefined));

            const validSchedules: Omit<UserSchedule, "id">[] = [];

            for (const row of tsvData) {
                const parsed = this.parseRow(row, userIds);
                if (parsed) validSchedules.push(parsed);
            }

            await this.userScheduleRepository.replaceAll(validSchedules);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "不明なエラーが発生しました",
            };
        }
    }

    private parseRow(row: scheduleTsvData, userIds: Set<string>): Omit<UserSchedule, "id"> | null {
        const userId = row["個人ｺｰﾄﾞ"]?.trim();
        const dateTimeStr = row["年月日"]?.trim();

        if (!userId || !dateTimeStr) return null;
        if (!userIds.has(userId)) return null;

        const match = dateTimeStr.match(DATE_TIME_REGEX);
        if (!match) return null;

        const [, year, month, day] = match;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (isNaN(date.getTime())) return null;

        const startTime = row["開始時間"]?.trim() || "";
        const endTime = row["終了時間"]?.trim() || "";

        if (startTime && !TIME_REGEX.test(startTime)) return null;
        if (endTime && !TIME_REGEX.test(endTime)) return null;

        return {
            userId,
            date,
            startTime,
            endTime,
            title: row["ﾀｲﾄﾙ"]?.trim() || "",
            location: row["場所"]?.trim() || "",
            description: row["内容"]?.trim() || "",
        };
    }
}
