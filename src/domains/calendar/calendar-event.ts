import type { UserSchedule } from './assignee-working-calendar';
import { isFullDayOffTitle } from './full-day-off';

/**
 * 予定の公開方法（Outlook の「公開する時間帯の種類」に相当）
 */
export const CALENDAR_EVENT_AVAILABILITIES = [
  'free',
  'workingElsewhere',
  'tentative',
  'busy',
  'outOfOffice',
] as const;
export type CalendarEventAvailability = (typeof CALENDAR_EVENT_AVAILABILITIES)[number];

/** 稼働を妨げない公開方法 */
const NON_BLOCKING_AVAILABILITIES: ReadonlySet<CalendarEventAvailability> = new Set([
  'free',
  'workingElsewhere',
]);

/** 1件の予定として許容する最大日数（日分割による爆発的な件数増加を防ぐ） */
export const MAX_CALENDAR_EVENT_SPAN_DAYS = 366;

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

export interface CalendarEventParams {
  title: string;
  /** 開始日（UTC 0時の日付） */
  startDate: Date;
  /** 開始時刻（0時からの経過分。ファイルに書かれた壁時計時刻） */
  startMinutes: number;
  /** 終了日（UTC 0時の日付） */
  endDate: Date;
  /** 終了時刻（0時からの経過分。1440 は24:00） */
  endMinutes: number;
  isAllDay: boolean;
  availability: CalendarEventAvailability;
  location?: string;
  description?: string;
}

export type CalendarEventDateRange = Readonly<{ startDate: Date; endDate: Date }>;

/**
 * 外部の予定表（Outlook等）から取り込む1件の予定
 * @description 終日・日をまたぐ予定を、日単位の個人予定（UserSchedule）へ分割する。
 * 時刻はタイムゾーン変換を行わず、ファイルに書かれた壁時計時刻のまま扱う。
 */
export class CalendarEvent {
  private constructor(private readonly params: CalendarEventParams) { }

  /**
   * @throws {Error} 日付・時刻が不正、終了が開始より前、期間が長すぎる場合
   */
  static create(params: CalendarEventParams): CalendarEvent {
    if (!isUtcMidnight(params.startDate) || !isUtcMidnight(params.endDate)) {
      throw new Error('日付が不正です');
    }
    if (!isValidMinutes(params.startMinutes) || !isValidMinutes(params.endMinutes)) {
      throw new Error('時刻が不正です');
    }

    const event = new CalendarEvent({ ...params });
    if (event.endEpochMs() < event.startEpochMs()) {
      throw new Error('終了日時が開始日時より前です');
    }

    const { startDate, endDate } = event.coveredDateRange();
    const spanDays = (endDate.getTime() - startDate.getTime()) / MS_PER_DAY + 1;
    if (spanDays > MAX_CALENDAR_EVENT_SPAN_DAYS) {
      throw new Error('予定の期間が長すぎます');
    }

    return event;
  }

  get title(): string {
    return this.params.title;
  }

  get isAllDay(): boolean {
    return this.params.isAllDay;
  }

  get availability(): CalendarEventAvailability {
    return this.params.availability;
  }

  /**
   * 稼働を妨げる予定か
   * @description 「空き時間」「他の場所で作業中」の予定は稼働可能とみなす。
   * ただし全休タイトルの予定は公開方法に関係なく稼働を妨げる。
   */
  isBlocking(): boolean {
    if (isFullDayOffTitle(this.params.title)) {
      return true;
    }
    return !NON_BLOCKING_AVAILABILITIES.has(this.params.availability);
  }

  /**
   * 予定が占める日付の範囲（両端含む）
   * @description 翌日0時ちょうどに終わる予定（終日予定の排他終了を含む）は前日までとする。
   */
  coveredDateRange(): CalendarEventDateRange {
    const { startDate, endDate, endMinutes } = this.params;
    const endsAtMidnightOfLaterDay = endDate.getTime() > startDate.getTime() && endMinutes === 0;
    const lastDate = endsAtMidnightOfLaterDay ? addDays(endDate, -1) : endDate;
    return { startDate, endDate: lastDate };
  }

  /**
   * 日ごとの個人予定へ分割する
   * @description 終日予定は各日 00:00〜24:00。日をまたぐ予定は 初日:開始〜24:00 / 中日:00:00〜24:00 / 最終日:00:00〜終了。
   */
  toDailySchedules(userId: string): Omit<UserSchedule, 'id'>[] {
    const { startDate, endDate } = this.coveredDateRange();
    const schedules: Omit<UserSchedule, 'id'>[] = [];

    for (let date = startDate; date.getTime() <= endDate.getTime(); date = addDays(date, 1)) {
      const [startMinutes, endMinutes] = this.minutesOn(date);
      schedules.push({
        userId,
        date,
        startTime: formatMinutes(startMinutes),
        endTime: formatMinutes(endMinutes),
        title: this.params.title,
        location: this.params.location || undefined,
        description: this.params.description || undefined,
      });
    }

    return schedules;
  }

  private minutesOn(date: Date): [number, number] {
    if (this.params.isAllDay) {
      return [0, MINUTES_PER_DAY];
    }
    const isStartDate = date.getTime() === this.params.startDate.getTime();
    const isEndDate = date.getTime() === this.params.endDate.getTime();
    return [
      isStartDate ? this.params.startMinutes : 0,
      isEndDate ? this.params.endMinutes : MINUTES_PER_DAY,
    ];
  }

  private startEpochMs(): number {
    const minutes = this.params.isAllDay ? 0 : this.params.startMinutes;
    return this.params.startDate.getTime() + minutes * MS_PER_MINUTE;
  }

  private endEpochMs(): number {
    const minutes = this.params.isAllDay ? 0 : this.params.endMinutes;
    return this.params.endDate.getTime() + minutes * MS_PER_MINUTE;
  }
}

function isUtcMidnight(date: Date): boolean {
  return !Number.isNaN(date.getTime()) && date.getTime() % MS_PER_DAY === 0;
}

function isValidMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= MINUTES_PER_DAY;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
