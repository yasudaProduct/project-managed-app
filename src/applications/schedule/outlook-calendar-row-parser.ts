import { CalendarEvent, type CalendarEventAvailability } from "@/domains/calendar/calendar-event";
import type { OutlookCalendarRowDto, OutlookCalendarRowErrorDto } from "@/types/outlook-calendar";

export type OutlookCalendarRowsParseResult = {
    events: CalendarEvent[];
    errors: OutlookCalendarRowErrorDto[];
};

/** YYYY/M/D・YYYY-M-D（後ろに時刻が付いていても無視する） */
const YMD_REGEX = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/;
/** M/D/YYYY（英語版 Outlook） */
const MDY_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/;
/** H:mm[:ss] [AM|PM] */
const TIME_12_24_REGEX = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?$/;
/** 午前|午後 h:mm[:ss] */
const TIME_JA_MERIDIEM_REGEX = /^(午前|午後)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

const TRUE_VALUES = new Set(["true", "1", "yes", "はい", "オン", "on"]);

/**
 * 公開方法（Outlook の「公開する時間帯の種類」/ "Show time as"）
 * @description 数値コードは Outlook の CSV エクスポートで観測される値。
 * VBA の OlBusyStatus 列挙（0=空き時間, 3=外出中）とは一致しないため注意。
 */
const AVAILABILITY_BY_SHOW_TIME_AS: ReadonlyMap<string, CalendarEventAvailability> = new Map([
    ["0", "workingElsewhere"],
    ["1", "tentative"],
    ["2", "busy"],
    ["3", "free"],
    ["4", "outOfOffice"],
    ["空き時間", "free"],
    ["free", "free"],
    ["仮の予定", "tentative"],
    ["tentative", "tentative"],
    ["予定あり", "busy"],
    ["busy", "busy"],
    ["外出中", "outOfOffice"],
    ["out of office", "outOfOffice"],
    ["他の場所で作業中", "workingElsewhere"],
    ["working elsewhere", "workingElsewhere"],
]);

/** 公開方法が空・不明の場合は安全側（稼働を妨げる）として扱う */
const DEFAULT_AVAILABILITY: CalendarEventAvailability = "busy";

/**
 * Outlook 予定表エクスポートの行を CalendarEvent へ変換する
 * @description 解釈できない行は errors に行番号と理由を積み、他の行の取り込みは継続する。
 */
export function parseOutlookCalendarRows(rows: ReadonlyArray<OutlookCalendarRowDto>): OutlookCalendarRowsParseResult {
    const events: CalendarEvent[] = [];
    const errors: OutlookCalendarRowErrorDto[] = [];

    for (const row of rows) {
        try {
            events.push(parseRow(row));
        } catch (error) {
            errors.push({
                rowNumber: row.rowNumber,
                message: error instanceof Error ? error.message : "行を解釈できません",
            });
        }
    }

    return { events, errors };
}

function parseRow(row: OutlookCalendarRowDto): CalendarEvent {
    const startDate = parseDateOrThrow(row.startDate, "開始日");
    const endDateText = row.endDate?.trim() ?? "";
    const endDate = endDateText ? parseDateOrThrow(endDateText, "終了日") : startDate;

    const startTimeText = row.startTime?.trim() ?? "";
    const endTimeText = row.endTime?.trim() ?? "";
    const isAllDay = isTruthy(row.allDay) || (!startTimeText && !endTimeText);

    let startMinutes = 0;
    let endMinutes = 0;
    if (!isAllDay) {
        startMinutes = parseTimeOrThrow(startTimeText, "開始時刻");
        endMinutes = endTimeText ? parseTimeOrThrow(endTimeText, "終了時刻") : startMinutes;
    }

    return CalendarEvent.create({
        title: row.subject.trim(),
        startDate,
        startMinutes,
        endDate,
        endMinutes,
        isAllDay,
        availability: toAvailability(row.showTimeAs),
        location: row.location?.trim() || undefined,
        description: row.description?.trim() || undefined,
    });
}

function parseDateOrThrow(text: string | undefined, label: string): Date {
    const value = text?.trim() ?? "";
    const date = parseDate(value);
    if (!date) {
        throw new Error(`${label}が不正です（${value}）`);
    }
    return date;
}

function parseDate(value: string): Date | null {
    const ymd = value.match(YMD_REGEX);
    if (ymd) {
        return toUtcDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
    }
    const mdy = value.match(MDY_REGEX);
    if (mdy) {
        return toUtcDate(Number(mdy[3]), Number(mdy[1]), Number(mdy[2]));
    }
    return null;
}

/** 実在しない日付（2/30 など）は null */
function toUtcDate(year: number, month: number, day: number): Date | null {
    const date = new Date(Date.UTC(year, month - 1, day));
    const isSameDate =
        date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    return isSameDate ? date : null;
}

function parseTimeOrThrow(value: string, label: string): number {
    const minutes = parseTime(value);
    if (minutes === null) {
        throw new Error(`${label}が不正です（${value}）`);
    }
    return minutes;
}

/** 0時からの経過分を返す。解釈できない場合は null */
function parseTime(value: string): number | null {
    const ja = value.match(TIME_JA_MERIDIEM_REGEX);
    if (ja) {
        return toMinutesWithMeridiem(Number(ja[2]), Number(ja[3]), ja[4], ja[1] === "午後");
    }

    const match = value.match(TIME_12_24_REGEX);
    if (!match) {
        return null;
    }
    const [, hourText, minuteText, secondText, meridiem] = match;
    if (meridiem) {
        return toMinutesWithMeridiem(Number(hourText), Number(minuteText), secondText, meridiem.toLowerCase() === "pm");
    }

    const hours = Number(hourText);
    const minutes = Number(minuteText);
    if (!isValidMinuteSecond(minutes, secondText)) {
        return null;
    }
    if (hours > 24 || (hours === 24 && minutes > 0)) {
        return null;
    }
    return hours * 60 + minutes;
}

/** 12時間表記（12 AM = 0時、12 PM = 12時。午前0時のような0時表記も許容） */
function toMinutesWithMeridiem(hours: number, minutes: number, secondText: string | undefined, isPm: boolean): number | null {
    if (hours > 12 || !isValidMinuteSecond(minutes, secondText)) {
        return null;
    }
    const hours24 = (hours % 12) + (isPm ? 12 : 0);
    return hours24 * 60 + minutes;
}

function isValidMinuteSecond(minutes: number, secondText: string | undefined): boolean {
    if (minutes > 59) {
        return false;
    }
    return secondText === undefined || Number(secondText) <= 59;
}

function isTruthy(value: string | undefined): boolean {
    return TRUE_VALUES.has(value?.trim().toLowerCase() ?? "");
}

function toAvailability(showTimeAs: string | undefined): CalendarEventAvailability {
    const key = showTimeAs?.trim().toLowerCase() ?? "";
    return AVAILABILITY_BY_SHOW_TIME_AS.get(key) ?? DEFAULT_AVAILABILITY;
}
