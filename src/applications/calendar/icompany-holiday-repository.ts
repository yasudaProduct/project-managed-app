import { CompanyHoliday } from '@/domains/calendar/company-calendar';

export interface ICompanyHolidayRepository {
  findAll(): Promise<CompanyHoliday[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<CompanyHoliday[]>;
  findByDate(date: Date): Promise<CompanyHoliday | null>;
  save(holiday: CompanyHoliday): Promise<CompanyHoliday>;
  saveMany(holidays: CompanyHoliday[]): Promise<CompanyHoliday[]>;
  delete(id: number): Promise<void>;
}