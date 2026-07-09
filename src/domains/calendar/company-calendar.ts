import * as holiday_jp from '@holiday-jp/holiday_jp';
import { addDays, startOfDay } from 'date-fns';

export interface CompanyHoliday {
  id?: number;
  date: Date;
  name: string;
  type: 'NATIONAL' | 'COMPANY' | 'SPECIAL';
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 会社カレンダー
 */
export class CompanyCalendar {
  private companyHolidays: CompanyHoliday[] = [];

  constructor(
    private readonly standardWorkingHours: number,
    companyHolidays: CompanyHoliday[] = []
  ) {
    if (standardWorkingHours <= 0) {
      throw new Error('standardWorkingHours must be positive');
    }
    this.companyHolidays = companyHolidays;
  }

  isCompanyHoliday(date: Date): boolean {
    // 土日判定
    if (date.getDay() === 0 || date.getDay() === 6) {
      return true;
    }

    // 日本の祝日判定
    if (holiday_jp.isHoliday(date)) {
      return true;
    }

    // 会社独自休日判定
    const dateString = this.formatDateString(date);
    return this.companyHolidays.some(holiday => {
      const holidayString = this.formatDateString(holiday.date);
      return holidayString === dateString;
    });
  }

  /**
   * 基準時間を取得
   * @returns 基準時間
   */
  getStandardWorkingHours(): number {
    return this.standardWorkingHours;
  }

  /**
   * 期間内（両端含む）の稼働日数を数える。
   * @param start 開始日（含む）
   * @param end 終了日（含む）
   * @returns 稼働日数。end < start の場合は 0
   * @description 土日・祝日・会社休日を除いた日数を返す（定常タスクの見通し按分等で使用）。
   */
  countWorkingDays(start: Date, end: Date): number {
    let current = startOfDay(start);
    const last = startOfDay(end);
    if (current.getTime() > last.getTime()) {
      return 0;
    }

    let count = 0;
    // 異常データによる無限ループ防止（約20年で打ち切り）
    const MAX_DAYS = 366 * 20;
    for (
      let i = 0;
      i <= MAX_DAYS && current.getTime() <= last.getTime();
      i++
    ) {
      if (!this.isCompanyHoliday(current)) {
        count++;
      }
      current = addDays(current, 1);
    }
    return count;
  }

  addCompanyHoliday(holiday: CompanyHoliday): void {
    this.companyHolidays.push(holiday);
  }

  getCompanyHolidays(): CompanyHoliday[] {
    return [...this.companyHolidays];
  }

  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}