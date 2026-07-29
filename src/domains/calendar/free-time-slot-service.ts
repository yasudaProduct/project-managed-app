import { CompanyCalendar } from './company-calendar';
import { UserSchedule } from './assignee-working-calendar';
import { isFullDayOffTitle } from './full-day-off';

/** 空き時間判定の対象時間帯の開始（深夜0時からの分） */
export const FREE_TIME_WINDOW_START_MINUTES = 9 * 60; // 09:00
/** 空き時間判定の対象時間帯の終了（深夜0時からの分） */
export const FREE_TIME_WINDOW_END_MINUTES = 18 * 60; // 18:00

const DAY_MS = 24 * 60 * 60 * 1000;
// 異常データによる無限ループ防止（実運用の期間上限はApplication層で制御）
const MAX_DAYS = 366;

const TIME_REGEX = /^(\d{1,2}):(\d{2})$/;

export interface FreeTimeSlot {
  /** 深夜0時からの分 */
  startMinutes: number;
  /** 深夜0時からの分（startMinutes < endMinutes を保証） */
  endMinutes: number;
}

export interface DailyFreeTimeSlots {
  /** 対象日（UTC深夜0時） */
  date: Date;
  /** 全員が空いている時間帯（昇順・1件以上） */
  slots: FreeTimeSlot[];
}

export interface CommonFreeSlotsParams {
  /** 対象ユーザーID（空の場合は結果なし） */
  userIds: string[];
  /** 期間内の予定（対象外ユーザーの予定が混じっていても無視される） */
  schedules: UserSchedule[];
  /** 開始日（UTC深夜0時・含む） */
  startDate: Date;
  /** 終了日（UTC深夜0時・含む） */
  endDate: Date;
  /** 最低空き時間（分）。未指定・0はフィルタなし */
  minDurationMinutes?: number;
}

interface BusyInterval {
  start: number;
  end: number;
}

/**
 * 共通空き時間計算サービス
 * @description 対象ユーザー全員が空いている時間帯を、営業日（土日・祝日・会社休日を除く）の
 * 09:00〜18:00の範囲で算出する純粋なドメインサービス。予定はユーザー横断でbusy区間として
 * 合成（union）し、その補集合を共通空き時間とする。
 */
export class FreeTimeSlotService {
  constructor(private readonly companyCalendar: CompanyCalendar) { }

  listCommonFreeSlots(params: CommonFreeSlotsParams): DailyFreeTimeSlots[] {
    const { userIds, schedules, startDate, endDate } = params;
    const minDurationMinutes = Math.max(0, params.minDurationMinutes ?? 0);

    if (userIds.length === 0) {
      return [];
    }

    const startMs = this.toUtcMidnightMs(startDate);
    const endMs = this.toUtcMidnightMs(endDate);
    if (startMs > endMs) {
      return [];
    }

    const schedulesByDate = this.groupTargetSchedulesByDate(schedules, new Set(userIds));

    const result: DailyFreeTimeSlots[] = [];
    for (
      let dayMs = startMs, dayCount = 0;
      dayMs <= endMs && dayCount < MAX_DAYS;
      dayMs += DAY_MS, dayCount++
    ) {
      const date = new Date(dayMs);
      if (this.companyCalendar.isCompanyHoliday(date)) {
        continue;
      }

      const busyIntervals = (schedulesByDate.get(this.utcDateKey(date)) ?? [])
        .map((schedule) => this.toBusyInterval(schedule))
        .filter((interval): interval is BusyInterval => interval !== null);

      const slots = this.subtractFromWindow(this.mergeIntervals(busyIntervals)).filter(
        (slot) => slot.endMinutes - slot.startMinutes >= minDurationMinutes
      );

      if (slots.length > 0) {
        result.push({ date, slots });
      }
    }

    return result;
  }

  private toUtcMidnightMs(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  private utcDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private groupTargetSchedulesByDate(
    schedules: UserSchedule[],
    targetUserIds: Set<string>
  ): Map<string, UserSchedule[]> {
    const grouped = new Map<string, UserSchedule[]>();
    for (const schedule of schedules) {
      if (!targetUserIds.has(schedule.userId)) {
        continue;
      }
      const key = this.utcDateKey(schedule.date);
      const list = grouped.get(key);
      if (list) {
        list.push(schedule);
      } else {
        grouped.set(key, [schedule]);
      }
    }
    return grouped;
  }

  /**
   * 予定をbusy区間（分）へ変換する
   * @returns 窓と重ならない・時刻が不正な予定は null（無視）
   */
  private toBusyInterval(schedule: UserSchedule): BusyInterval | null {
    // 全休タイトルは時刻が意味を持たないため終日ブロック
    if (isFullDayOffTitle(schedule.title)) {
      return { start: FREE_TIME_WINDOW_START_MINUTES, end: FREE_TIME_WINDOW_END_MINUTES };
    }

    const start = this.parseTimeToMinutes(schedule.startTime);
    const end = this.parseTimeToMinutes(schedule.endTime);
    if (start === null || end === null || end <= start) {
      return null;
    }

    const clampedStart = Math.max(start, FREE_TIME_WINDOW_START_MINUTES);
    const clampedEnd = Math.min(end, FREE_TIME_WINDOW_END_MINUTES);
    if (clampedStart >= clampedEnd) {
      return null;
    }

    return { start: clampedStart, end: clampedEnd };
  }

  private parseTimeToMinutes(time: string): number | null {
    const match = time.match(TIME_REGEX);
    if (!match) {
      return null;
    }
    const minutes = parseInt(match[2], 10);
    if (minutes > 59) {
      return null;
    }
    return parseInt(match[1], 10) * 60 + minutes;
  }

  /** 開始昇順でソートし、重複・隣接する区間を結合する */
  private mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
    if (intervals.length === 0) {
      return [];
    }
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged: BusyInterval[] = [{ ...sorted[0] }];
    for (const interval of sorted.slice(1)) {
      const last = merged[merged.length - 1];
      if (interval.start <= last.end) {
        last.end = Math.max(last.end, interval.end);
      } else {
        merged.push({ ...interval });
      }
    }
    return merged;
  }

  /** 窓（09:00〜18:00）からbusy区間を除いた補集合を返す */
  private subtractFromWindow(busyIntervals: BusyInterval[]): FreeTimeSlot[] {
    const slots: FreeTimeSlot[] = [];
    let cursor = FREE_TIME_WINDOW_START_MINUTES;
    for (const busy of busyIntervals) {
      if (busy.start > cursor) {
        slots.push({ startMinutes: cursor, endMinutes: busy.start });
      }
      cursor = Math.max(cursor, busy.end);
    }
    if (cursor < FREE_TIME_WINDOW_END_MINUTES) {
      slots.push({ startMinutes: cursor, endMinutes: FREE_TIME_WINDOW_END_MINUTES });
    }
    return slots;
  }
}
