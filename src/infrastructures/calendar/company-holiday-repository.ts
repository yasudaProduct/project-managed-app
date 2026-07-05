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

  private toDomain(holiday: {
    id: number;
    date: Date;
    name: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
  }): CompanyHoliday {
    return {
      id: holiday.id,
      date: holiday.date,
      name: holiday.name,
      type: holiday.type as 'NATIONAL' | 'COMPANY' | 'SPECIAL',
      createdAt: holiday.createdAt,
      updatedAt: holiday.updatedAt,
    };
  }

  async findAll(): Promise<CompanyHoliday[]> {
    const holidays = await this.prisma.companyHoliday.findMany({
      orderBy: { date: 'asc' }
    });

    return holidays.map(holiday => this.toDomain(holiday));
  }

  async findById(id: number): Promise<CompanyHoliday | null> {
    const holiday = await this.prisma.companyHoliday.findUnique({
      where: { id }
    });

    if (!holiday) return null;

    return this.toDomain(holiday);
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

    return holidays.map(holiday => this.toDomain(holiday));
  }

  async findByDate(date: Date): Promise<CompanyHoliday | null> {
    const holiday = await this.prisma.companyHoliday.findUnique({
      where: { date }
    });

    if (!holiday) return null;

    return this.toDomain(holiday);
  }

  async findByDateExcludingId(date: Date, excludeId: number): Promise<CompanyHoliday | null> {
    const holiday = await this.prisma.companyHoliday.findFirst({
      where: {
        date,
        id: { not: excludeId },
      },
    });

    if (!holiday) return null;

    return this.toDomain(holiday);
  }

  async save(holiday: CompanyHoliday): Promise<CompanyHoliday> {
    const created = await this.prisma.companyHoliday.create({
      data: {
        date: holiday.date,
        name: holiday.name,
        type: holiday.type
      }
    });

    return this.toDomain(created);
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

  async update(id: number, holiday: CompanyHoliday): Promise<CompanyHoliday> {
    const updated = await this.prisma.companyHoliday.update({
      where: { id },
      data: {
        date: holiday.date,
        name: holiday.name,
        type: holiday.type,
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.companyHoliday.delete({
      where: { id }
    });
  }
}
