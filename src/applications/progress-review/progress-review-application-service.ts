import { inject, injectable } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { ProgressReviewCycle } from '@/types/progress-review-cycle';
import { calendarDateInTimeZone } from '@/utils/date-util';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { previousReviewDate } from '@/domains/progress-review/previous-review-date';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';

/** 日次サイクルの前営業日を探すのに十分な遡り日数（大型連休を含む） */
const HOLIDAY_LOOKBACK_DAYS = 31;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface IProgressReviewApplicationService {
  /** 前回の確認日（暦日・UTC深夜0時）。今日は業務タイムゾーン（JST）で決める */
  getPreviousReviewDate(cycle: ProgressReviewCycle, now?: Date): Promise<Date>;
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
    const holidays = await this.companyHolidayRepository.findByDateRange(
      new Date(today.getTime() - HOLIDAY_LOOKBACK_DAYS * MS_PER_DAY),
      today
    );
    // 稼働時間は isCompanyHoliday の判定に影響しないためダミー値（evm-service と同じ）
    const calendar = new CompanyCalendar(7.5, holidays);
    return previousReviewDate(cycle, today, (date) => !calendar.isCompanyHoliday(date));
  }
}
