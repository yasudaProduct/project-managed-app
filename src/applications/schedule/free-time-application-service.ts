import { inject, injectable } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import type { IUserRepository } from "@/applications/user/iuser-repository";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";
import {
    FreeTimeSlotService,
    FREE_TIME_WINDOW_START_MINUTES,
    FREE_TIME_WINDOW_END_MINUTES,
} from "@/domains/calendar/free-time-slot-service";
import { utcDateFromYmd, utcDateKey } from "@/utils/date-util";
import type { FreeTimeSearchResultDto } from "@/types/free-time";

export interface FreeTimeSearchInput {
    /** 対象ユーザーID。省略・空配列は全ユーザー */
    userIds?: string[];
    /** 開始日 "YYYY-MM-DD"。省略は今日（UTC） */
    startDate?: string;
    /** 終了日 "YYYY-MM-DD"。省略は開始日+7日 */
    endDate?: string;
    /** 最低空き時間（分）。省略はフィルタなし */
    minDurationMinutes?: number;
}

export type FreeTimeSearchServiceResult =
    | { success: true; data: FreeTimeSearchResultDto }
    | { success: false; error: string };

export interface IFreeTimeApplicationService {
    searchFreeTime(input: FreeTimeSearchInput): Promise<FreeTimeSearchServiceResult>;
}

/** 検索期間の上限日数（両端含む） */
export const FREE_TIME_MAX_PERIOD_DAYS = 92;

const DEFAULT_PERIOD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type TargetUser = { id: string; name: string };

function minutesToHHmm(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

@injectable()
export class FreeTimeApplicationService implements IFreeTimeApplicationService {
    constructor(
        @inject(SYMBOL.IUserScheduleRepository) private readonly userScheduleRepository: IUserScheduleRepository,
        @inject(SYMBOL.ICompanyHolidayRepository) private readonly companyHolidayRepository: ICompanyHolidayRepository,
        @inject(SYMBOL.IUserRepository) private readonly userRepository: IUserRepository,
    ) { }

    public async searchFreeTime(input: FreeTimeSearchInput): Promise<FreeTimeSearchServiceResult> {
        const usersResult = await this.resolveTargetUsers(input.userIds);
        if (!usersResult.success) {
            return usersResult;
        }
        const targetUsers = usersResult.data;

        const periodResult = this.resolvePeriod(input.startDate, input.endDate);
        if (!periodResult.success) {
            return periodResult;
        }
        const { startDate, endDate } = periodResult.data;

        const minDurationMinutes = Math.max(0, input.minDurationMinutes ?? 0);

        const targetUserIds = targetUsers.map((user) => user.id);
        const [schedules, companyHolidays] = await Promise.all([
            this.userScheduleRepository.findByUsersAndDateRange(targetUserIds, startDate, endDate),
            this.companyHolidayRepository.findByDateRange(startDate, endDate),
        ]);

        // 標準稼働時間はisCompanyHoliday判定に影響しないためダミー値
        const companyCalendar = new CompanyCalendar(7.5, companyHolidays);
        const dailySlots = new FreeTimeSlotService(companyCalendar).listCommonFreeSlots({
            userIds: targetUserIds,
            schedules,
            startDate,
            endDate,
            minDurationMinutes,
        });

        return {
            success: true,
            data: {
                conditions: {
                    users: targetUsers,
                    startDate: utcDateKey(startDate),
                    endDate: utcDateKey(endDate),
                    minDurationMinutes,
                    windowStartTime: minutesToHHmm(FREE_TIME_WINDOW_START_MINUTES),
                    windowEndTime: minutesToHHmm(FREE_TIME_WINDOW_END_MINUTES),
                },
                days: dailySlots.map((daily) => ({
                    date: utcDateKey(daily.date),
                    slots: daily.slots.map((slot) => ({
                        startTime: minutesToHHmm(slot.startMinutes),
                        endTime: minutesToHHmm(slot.endMinutes),
                        durationMinutes: slot.endMinutes - slot.startMinutes,
                    })),
                })),
            },
        };
    }

    private async resolveTargetUsers(
        userIds: string[] | undefined
    ): Promise<{ success: true; data: TargetUser[] } | { success: false; error: string }> {
        const allUsers = await this.userRepository.findAll();
        const candidates: TargetUser[] = allUsers.flatMap((user) =>
            user.id !== undefined ? [{ id: user.id, name: user.name }] : []
        );

        let targetUsers = candidates;
        if (userIds && userIds.length > 0) {
            const userById = new Map(candidates.map((user) => [user.id, user]));
            const found: TargetUser[] = [];
            for (const id of userIds) {
                const user = userById.get(id);
                if (!user) {
                    return { success: false, error: "存在しないユーザーが指定されています" };
                }
                found.push(user);
            }
            targetUsers = found;
        }

        if (targetUsers.length === 0) {
            return { success: false, error: "検索対象のユーザーがいません" };
        }

        return { success: true, data: targetUsers };
    }

    private resolvePeriod(
        startInput: string | undefined,
        endInput: string | undefined
    ): { success: true; data: { startDate: Date; endDate: Date } } | { success: false; error: string } {
        const startDate = startInput !== undefined ? this.parseUtcDate(startInput) : this.todayUtc();
        if (!startDate) {
            return { success: false, error: "開始日の形式が不正です" };
        }

        const endDate = endInput !== undefined
            ? this.parseUtcDate(endInput)
            : new Date(startDate.getTime() + DEFAULT_PERIOD_DAYS * DAY_MS);
        if (!endDate) {
            return { success: false, error: "終了日の形式が不正です" };
        }

        if (endDate.getTime() < startDate.getTime()) {
            return { success: false, error: "終了日は開始日以降の日付を指定してください" };
        }

        const periodDays = (endDate.getTime() - startDate.getTime()) / DAY_MS + 1;
        if (periodDays > FREE_TIME_MAX_PERIOD_DAYS) {
            return { success: false, error: `検索期間は${FREE_TIME_MAX_PERIOD_DAYS}日以内で指定してください` };
        }

        return { success: true, data: { startDate, endDate } };
    }

    private todayUtc(): Date {
        const now = new Date();
        return utcDateFromYmd(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
    }

    private parseUtcDate(value: string): Date | null {
        if (!DATE_INPUT_REGEX.test(value)) {
            return null;
        }
        const date = new Date(`${value}T00:00:00.000Z`);
        return Number.isNaN(date.getTime()) ? null : date;
    }
}
