import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';

export interface IUserScheduleRepository {
  findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserSchedule[]>;
  
  findByUsersAndDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<UserSchedule[]>;
  
  findByUserIdAndDate(userId: string, date: Date): Promise<UserSchedule[]>;
  
  save(schedule: UserSchedule): Promise<UserSchedule>;
  
  update(id: number, schedule: Partial<UserSchedule>): Promise<UserSchedule>;
  
  delete(id: number): Promise<void>;
}