import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import { CompanyHoliday } from '@/domains/calendar/company-calendar';
import { SYMBOL } from '@/types/symbol';

@injectable()
export class CompanyHolidayRepository implements ICompanyHolidayRepository {
  constructor(
    @inject(SYMBOL.PrismaClient) private readonly prisma: PrismaClient
  ) {}

  async findAll(): Promise<CompanyHoliday[]> {
    const holidays = await this.prisma.companyHoliday.findMany({
      orderBy: { date: 'asc' }
    });

    return holidays.map(holiday => ({
      date: holiday.date,
      name: holiday.name,
      type: holiday.type as 'NATIONAL' | 'COMPANY' | 'SPECIAL'
    }));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<CompanyHoliday[]> {
    const holidays = await this.prisma.companyHoliday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    return holidays.map(holiday => ({
      date: holiday.date,
      name: holiday.name,
      type: holiday.type as 'NATIONAL' | 'COMPANY' | 'SPECIAL'
    }));
  }

  async findByDate(date: Date): Promise<CompanyHoliday | null> {
    const holiday = await this.prisma.companyHoliday.findUnique({
      where: { date }
    });

    if (!holiday) return null;

    return {
      date: holiday.date,
      name: holiday.name,
      type: holiday.type as 'NATIONAL' | 'COMPANY' | 'SPECIAL'
    };
  }

  async save(holiday: CompanyHoliday): Promise<CompanyHoliday> {
    const created = await this.prisma.companyHoliday.create({
      data: {
        date: holiday.date,
        name: holiday.name,
        type: holiday.type
      }
    });

    return {
      date: created.date,
      name: created.name,
      type: created.type as 'NATIONAL' | 'COMPANY' | 'SPECIAL'
    };
  }

  async saveMany(holidays: CompanyHoliday[]): Promise<CompanyHoliday[]> {
    await this.prisma.companyHoliday.createMany({
      data: holidays.map(holiday => ({
        date: holiday.date,
        name: holiday.name,
        type: holiday.type
      }))
    });

    return this.findAll();
  }

  async delete(id: number): Promise<void> {
    await this.prisma.companyHoliday.delete({
      where: { id }
    });
  }
}