import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';

export interface IUserScheduleRepository {
  findAll(): Promise<UserSchedule[]>;

  findByUserId(userId: string): Promise<UserSchedule[]>;

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

  /**
   * 既存の全ユーザースケジュールを削除し、渡されたスケジュールで置き換える
   */
  replaceAll(schedules: Omit<UserSchedule, "id">[]): Promise<void>;
}