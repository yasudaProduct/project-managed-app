import * as holiday_jp from '@holiday-jp/holiday_jp';

export interface CompanyHoliday {
  date: Date;
  name: string;
  type: 'NATIONAL' | 'COMPANY' | 'SPECIAL';
}

export class CompanyCalendar {
  private readonly standardWorkingHours = 7.5;
  private companyHolidays: CompanyHoliday[] = [];

  constructor(companyHolidays: CompanyHoliday[] = []) {
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

  getStandardWorkingHours(): number {
    return this.standardWorkingHours;
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