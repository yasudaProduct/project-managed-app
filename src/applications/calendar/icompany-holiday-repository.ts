import { CompanyHoliday } from '@/domains/calendar/company-calendar';

export interface ICompanyHolidayRepository {
  findAll(): Promise<CompanyHoliday[]>;
  findById(id: number): Promise<CompanyHoliday | null>;
  findByDateRange(startDate: Date, endDate: Date): Promise<CompanyHoliday[]>;
  findByDate(date: Date): Promise<CompanyHoliday | null>;
  findByDateExcludingId(date: Date, excludeId: number): Promise<CompanyHoliday | null>;
  save(holiday: CompanyHoliday): Promise<CompanyHoliday>;
  saveMany(holidays: CompanyHoliday[]): Promise<CompanyHoliday[]>;
  update(id: number, holiday: CompanyHoliday): Promise<CompanyHoliday>;
  delete(id: number): Promise<void>;
}