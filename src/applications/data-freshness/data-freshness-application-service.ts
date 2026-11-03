import { inject, injectable } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { calendarDateInTimeZone, utcDateKey } from '@/utils/date-util';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { isFullDayOffTitle } from '@/domains/calendar/full-day-off';
import {
  listRecentBusinessDays,
  findMissingWorkEntryDates,
  type PlannedPeriod,
} from '@/domains/work-record/missing-work-entry';
import type { Task } from '@/domains/task/task';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { IWorkRecordRepository } from '@/applications/work-record/repositories/iwork-record-repository';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import type { ISyncLogRepository } from '@/applications/wbs-sync/isync-log-repository';

/** 入力漏れを確認する営業日数（前日まで）。毎日入力する運用で、2週間分見れば漏れに気づける */
export const MISSING_ENTRY_CHECK_BUSINESS_DAYS = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** データの鮮度（Server Action 経由でクライアントへ渡すため日付は ISO 文字列） */
export type DataFreshnessDto = {
  lastWbsSync: {
    syncedAt: string;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  } | null;
  entryCheck: {
    windowStart: string | null;
    windowEnd: string | null;
    assignees: Array<{
      userId: string;
      name: string;
      lastRecordDate: string | null;
      missingDates: string[];
    }>;
  };
  taskIssues: {
    noAssigneeCount: number;
    noBaselineCount: number;
    zeroProgressInProgressCount: number;
  };
};

export type GetDataFreshnessOptions = {
  now?: Date;
};

export interface IDataFreshnessApplicationService {
  getDataFreshness(
    wbsId: number,
    projectId: string,
    options?: GetDataFreshnessOptions
  ): Promise<DataFreshnessDto>;
}

/**
 * 「この数字は信用できるか」を判断するためのデータの鮮度
 * （docs/plans/progress-management-analysis-requirements.md 1-4）。
 */
@injectable()
export class DataFreshnessApplicationService implements IDataFreshnessApplicationService {
  constructor(
    @inject(SYMBOL.ITaskRepository)
    private readonly taskRepository: ITaskRepository,
    @inject(SYMBOL.IWbsAssigneeRepository)
    private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.IWorkRecordRepository)
    private readonly workRecordRepository: IWorkRecordRepository,
    @inject(SYMBOL.IUserScheduleRepository)
    private readonly userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.ICompanyHolidayRepository)
    private readonly companyHolidayRepository: ICompanyHolidayRepository,
    @inject(SYMBOL.ISystemSettingsRepository)
    private readonly systemSettingsRepository: ISystemSettingsRepository,
    @inject(SYMBOL.ISyncLogRepository)
    private readonly syncLogRepository: ISyncLogRepository
  ) {}

  public async getDataFreshness(
    wbsId: number,
    projectId: string,
    options: GetDataFreshnessOptions = {}
  ): Promise<DataFreshnessDto> {
    const today = calendarDateInTimeZone(options.now ?? new Date());
    const [tasks, assignees, lastSync] = await Promise.all([
      this.taskRepository.findActiveByWbsId(wbsId),
      this.wbsAssigneeRepository.findByWbsId(wbsId),
      this.syncLogRepository.getLastSync(projectId),
    ]);

    return {
      lastWbsSync: lastSync
        ? { syncedAt: lastSync.syncedAt.toISOString(), status: lastSync.syncStatus }
        : null,
      entryCheck: await this.checkWorkEntries(
        tasks,
        assignees.map((assignee) => ({
          userId: assignee.userId,
          name: assignee.userName ?? assignee.userId,
        })),
        today
      ),
      taskIssues: this.countTaskIssues(tasks),
    };
  }

  private async checkWorkEntries(
    tasks: Task[],
    assignees: Array<{ userId: string; name: string }>,
    today: Date
  ): Promise<DataFreshnessDto['entryCheck']> {
    const userIds = assignees.map((assignee) => assignee.userId);
    const yesterday = new Date(today.getTime() - MS_PER_DAY);
    // 確認期間の最も古い日は、休日を挟んでも営業日数の3倍まで遡れば必ず含まれる
    const lookbackStart = new Date(
      yesterday.getTime() - MISSING_ENTRY_CHECK_BUSINESS_DAYS * 3 * MS_PER_DAY
    );
    const [systemSettings, companyHolidays] = await Promise.all([
      this.systemSettingsRepository.get(),
      this.companyHolidayRepository.findByDateRange(lookbackStart, yesterday),
    ]);
    const calendar = new CompanyCalendar(systemSettings.standardWorkingHours, companyHolidays);
    const businessDays = listRecentBusinessDays(
      (date) => !calendar.isCompanyHoliday(date),
      yesterday,
      MISSING_ENTRY_CHECK_BUSINESS_DAYS
    );
    const windowStart = businessDays[0] ?? null;
    const windowEnd = businessDays[businessDays.length - 1] ?? null;

    const [dailyHours, schedules, lastRecordDates] = await Promise.all([
      windowStart && windowEnd
        ? this.workRecordRepository.findDailyHoursByUsers(userIds, windowStart, windowEnd)
        : Promise.resolve([]),
      windowStart && windowEnd
        ? this.userScheduleRepository.findByUsersAndDateRange(userIds, windowStart, windowEnd)
        : Promise.resolve([]),
      this.workRecordRepository.findLastRecordDateByUsers(userIds, today),
    ]);

    return {
      windowStart: windowStart?.toISOString() ?? null,
      windowEnd: windowEnd?.toISOString() ?? null,
      assignees: assignees.map((assignee) => {
        const missingDates = findMissingWorkEntryDates({
          businessDays,
          plannedPeriods: this.plannedPeriodsOf(tasks, assignee.userId),
          recordedDateKeys: new Set(
            dailyHours
              .filter((row) => row.userId === assignee.userId && row.hours > 0)
              .map((row) => utcDateKey(row.date))
          ),
          dayOffDateKeys: new Set(
            schedules
              .filter(
                (schedule) =>
                  schedule.userId === assignee.userId && isFullDayOffTitle(schedule.title)
              )
              .map((schedule) => utcDateKey(schedule.date))
          ),
        });
        return {
          userId: assignee.userId,
          name: assignee.name,
          lastRecordDate: lastRecordDates.get(assignee.userId)?.toISOString() ?? null,
          missingDates: missingDates.map((date) => date.toISOString()),
        };
      }),
    };
  }

  private plannedPeriodsOf(tasks: Task[], userId: string): PlannedPeriod[] {
    const periods: PlannedPeriod[] = [];
    for (const task of tasks) {
      if (task.assignee?.userId !== userId) continue;
      const start = task.getYoteiStart();
      const end = task.getYoteiEnd();
      if (start && end) periods.push({ start, end });
    }
    return periods;
  }

  private countTaskIssues(tasks: Task[]): DataFreshnessDto['taskIssues'] {
    return {
      noAssigneeCount: tasks.filter((task) => !task.assignee).length,
      // 基準（KIJUN）未設定のタスクは EVM の BAC が予定工数にフォールバックする
      noBaselineCount: tasks.filter((task) => !task.getKijunKosus()).length,
      zeroProgressInProgressCount: tasks.filter(
        (task) => task.getStatus() === 'IN_PROGRESS' && !task.progressRate
      ).length,
    };
  }
}
