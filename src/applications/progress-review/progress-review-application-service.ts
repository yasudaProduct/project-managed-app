import { inject, injectable } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { ProgressReviewCycle } from '@/types/progress-review-cycle';
import { calendarDateInTimeZone } from '@/utils/date-util';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import {
  previousReviewDate,
  recentReviewDates,
} from '@/domains/progress-review/previous-review-date';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';

/** 日次サイクルの前営業日を探すのに十分な遡り日数（大型連休を含む） */
const HOLIDAY_LOOKBACK_DAYS = 31;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface IProgressReviewApplicationService {
  /** 前回の確認日（暦日・UTC深夜0時）。今日は業務タイムゾーン（JST）で決める */
  getPreviousReviewDate(cycle: ProgressReviewCycle, now?: Date): Promise<Date>;
  /** 直近 count 回分の確認日と今日（古い順、count + 1 件） */
  getRecentReviewDates(cycle: ProgressReviewCycle, count: number, now?: Date): Promise<Date[]>;
}

@injectable()
export class ProgressReviewApplicationService implements IProgressReviewApplicationService {
  constructor(
    @inject(SYMBOL.ICompanyHolidayRepository)
    private readonly companyHolidayRepository: ICompanyHolidayRepository
  ) {}

  public async getPreviousReviewDate(
    cycle: ProgressReviewCycle,
    now: Date = new Date()
  ): Promise<Date> {
    const today = calendarDateInTimeZone(now);
    const isBusinessDay = await this.buildBusinessDayPredicate(today, 1);
    return previousReviewDate(cycle, today, isBusinessDay);
  }

  public async getRecentReviewDates(
    cycle: ProgressReviewCycle,
    count: number,
    now: Date = new Date()
  ): Promise<Date[]> {
    const today = calendarDateInTimeZone(now);
    const isBusinessDay = await this.buildBusinessDayPredicate(today, count);
    return recentReviewDates(cycle, today, isBusinessDay, count);
  }

  /** 日次サイクルで count 回さかのぼるのに十分な期間の会社休日を読み、営業日判定を作る */
  private async buildBusinessDayPredicate(
    today: Date,
    count: number
  ): Promise<(date: Date) => boolean> {
    const holidays = await this.companyHolidayRepository.findByDateRange(
      new Date(today.getTime() - HOLIDAY_LOOKBACK_DAYS * count * MS_PER_DAY),
      today
    );
    // 稼働時間は isCompanyHoliday の判定に影響しないためダミー値（evm-service と同じ）
    const calendar = new CompanyCalendar(7.5, holidays);
    return (date) => !calendar.isCompanyHoliday(date);
  }
}
