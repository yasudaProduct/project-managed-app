import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { SYMBOL } from '@/types/symbol';

@injectable()
export class UserScheduleRepository implements IUserScheduleRepository {
  constructor(
    @inject(SYMBOL.PrismaClient) private readonly prisma: PrismaClient
  ) { }

  async findByUserId(userId: string): Promise<UserSchedule[]> {
    const schedules = await this.prisma.userSchedule.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });

    return schedules.map(this.toDomain);
  }

  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserSchedule[]> {
    const schedules = await this.prisma.userSchedule.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    return schedules.map(this.toDomain);
  }

  async findByUsersAndDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<UserSchedule[]> {
    const schedules = await this.prisma.userSchedule.findMany({
      where: {
        userId: { in: userIds },
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [{ date: 'asc' }, { userId: 'asc' }]
    });

    return schedules.map(this.toDomain);
  }

  async findByUserIdAndDate(userId: string, date: Date): Promise<UserSchedule[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await this.prisma.userSchedule.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return schedules.map(this.toDomain);
  }

  async save(schedule: UserSchedule): Promise<UserSchedule> {
    const created = await this.prisma.userSchedule.create({
      data: {
        userId: schedule.userId,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        title: schedule.title,
        location: schedule.location,
        description: schedule.description
      }
    });

    return this.toDomain(created);
  }

  async update(id: number, schedule: Partial<UserSchedule>): Promise<UserSchedule> {
    const updated = await this.prisma.userSchedule.update({
      where: { id },
      data: {
        ...(schedule.date && { date: schedule.date }),
        ...(schedule.startTime && { startTime: schedule.startTime }),
        ...(schedule.endTime && { endTime: schedule.endTime }),
        ...(schedule.title && { title: schedule.title }),
        ...(schedule.location !== undefined && { location: schedule.location }),
        ...(schedule.description !== undefined && { description: schedule.description })
      }
    });

    return this.toDomain(updated);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.userSchedule.delete({
      where: { id }
    });
  }

  private toDomain(schedule: {
    id: number;
    userId: string;
    date: Date;
    startTime: string;
    endTime: string;
    title: string;
    location?: string | null;
    description?: string | null;
  }): UserSchedule {
    return {
      id: schedule.id,
      userId: schedule.userId,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      title: schedule.title,
      location: schedule.location || undefined,
      description: schedule.description || undefined
    };
  }
}