import { DataFreshnessApplicationService } from '@/applications/data-freshness/data-freshness-application-service';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { IWorkRecordRepository } from '@/applications/work-record/repositories/iwork-record-repository';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import type { ISyncLogRepository } from '@/applications/wbs-sync/isync-log-repository';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { Assignee } from '@/domains/task/assignee';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import type { TaskStatus as TaskStatusType } from '@/types/wbs';

/**
 * データの鮮度（この数字は信用できるか）。
 * - WBSの最終同期
 * - 担当者ごとの実績の最終入力日と、直近10営業日の入力漏れ
 * - タスクデータの不備（担当者未設定・基準未設定・着手中で進捗率0%）
 */
describe('DataFreshnessApplicationService', () => {
  // JST 2026-10-31(土) 12:00 → 前日（10/30 金）までの直近10営業日 = 10/19〜10/30
  const now = new Date('2026-10-31T03:00:00.000Z');
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

  const period = (type: 'YOTEI' | 'KIJUN', start: string, end: string) =>
    Period.create({
      startDate: d(start),
      endDate: d(end),
      type: new PeriodType({ type }),
      manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
    });

  const makeTask = (args: {
    id: number;
    status: TaskStatusType;
    userId?: string;
    periods: Period[];
    progressRate?: number;
  }): Task =>
    Task.createFromDb({
      id: args.id,
      taskNo: TaskNo.reconstruct(`D1-000${args.id}`),
      wbsId: 1,
      name: `タスク${args.id}`,
      status: new TaskStatus({ status: args.status }),
      assignee: args.userId
        ? Assignee.createFromDb({ id: 1, name: args.userId, displayName: args.userId, userId: args.userId })
        : undefined,
      periods: args.periods,
      progressRate: args.progressRate,
    });

  // 10/19〜10/30 の平日（10/28 だけ除く）
  const u1RecordedDays = [
    '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23',
    '2026-10-26', '2026-10-27', '2026-10-29', '2026-10-30',
  ];

  let taskRepository: { findActiveByWbsId: jest.Mock };
  let wbsAssigneeRepository: { findByWbsId: jest.Mock };
  let workRecordRepository: { findDailyHoursByUsers: jest.Mock; findLastRecordDateByUsers: jest.Mock };
  let userScheduleRepository: { findByUsersAndDateRange: jest.Mock };
  let companyHolidayRepository: { findByDateRange: jest.Mock };
  let systemSettingsRepository: { get: jest.Mock };
  let syncLogRepository: { getLastSync: jest.Mock };
  let service: DataFreshnessApplicationService;

  beforeEach(() => {
    taskRepository = {
      findActiveByWbsId: jest.fn().mockResolvedValue([
        makeTask({
          id: 1,
          status: 'IN_PROGRESS',
          userId: 'u1',
          periods: [period('KIJUN', '2026-10-01', '2026-11-30'), period('YOTEI', '2026-10-01', '2026-11-30')],
          progressRate: 40,
        }),
        makeTask({
          id: 2,
          status: 'IN_PROGRESS',
          userId: 'u2',
          periods: [period('YOTEI', '2026-10-26', '2026-10-30')],
          progressRate: 0,
        }),
        makeTask({
          id: 3,
          status: 'NOT_STARTED',
          periods: [period('KIJUN', '2026-11-01', '2026-11-30'), period('YOTEI', '2026-11-01', '2026-11-30')],
        }),
      ]),
    };
    wbsAssigneeRepository = {
      findByWbsId: jest.fn().mockResolvedValue([
        WbsAssignee.createFromDb({ id: 1, wbsId: 1, userId: 'u1', userName: '山田', rate: 1, costPerHour: 5000, seq: 1 }),
        WbsAssignee.createFromDb({ id: 2, wbsId: 1, userId: 'u2', userName: '佐藤', rate: 1, costPerHour: 5000, seq: 2 }),
      ]),
    };
    workRecordRepository = {
      findDailyHoursByUsers: jest.fn().mockResolvedValue([
        ...u1RecordedDays.map((day) => ({ userId: 'u1', date: d(day), hours: 7.5 })),
        { userId: 'u2', date: d('2026-10-26'), hours: 8 },
        { userId: 'u2', date: d('2026-10-27'), hours: 8 },
        // 0時間の記録は入力していないのと同じ扱い
        { userId: 'u2', date: d('2026-10-30'), hours: 0 },
      ]),
      findLastRecordDateByUsers: jest.fn().mockResolvedValue(
        new Map([
          ['u1', d('2026-10-30')],
          ['u2', d('2026-10-27')],
        ])
      ),
    };
    userScheduleRepository = {
      findByUsersAndDateRange: jest.fn().mockResolvedValue([
        { id: 1, userId: 'u2', date: d('2026-10-29'), startTime: '09:00', endTime: '18:00', title: '休暇' },
        { id: 2, userId: 'u2', date: d('2026-10-28'), startTime: '10:00', endTime: '11:00', title: '定例' },
      ]),
    };
    companyHolidayRepository = { findByDateRange: jest.fn().mockResolvedValue([]) };
    systemSettingsRepository = { get: jest.fn().mockResolvedValue({ standardWorkingHours: 7.5 }) };
    syncLogRepository = {
      getLastSync: jest.fn().mockResolvedValue({
        id: 1,
        projectId: 'p1',
        syncStatus: 'SUCCESS',
        syncedAt: new Date('2026-10-31T00:00:00.000Z'),
      }),
    };
    service = new DataFreshnessApplicationService(
      taskRepository as unknown as ITaskRepository,
      wbsAssigneeRepository as unknown as IWbsAssigneeRepository,
      workRecordRepository as unknown as IWorkRecordRepository,
      userScheduleRepository as unknown as IUserScheduleRepository,
      companyHolidayRepository as unknown as ICompanyHolidayRepository,
      systemSettingsRepository as unknown as ISystemSettingsRepository,
      syncLogRepository as unknown as ISyncLogRepository
    );
  });

  it('WBSの最終同期日時と結果を返す', async () => {
    const result = await service.getDataFreshness(1, 'p1', { now });

    expect(syncLogRepository.getLastSync).toHaveBeenCalledWith('p1');
    expect(result.lastWbsSync).toEqual({
      syncedAt: '2026-10-31T00:00:00.000Z',
      status: 'SUCCESS',
    });
  });

  it('前日までの直近10営業日を入力漏れの確認期間にする', async () => {
    const result = await service.getDataFreshness(1, 'p1', { now });

    expect(result.entryCheck.windowStart).toBe('2026-10-19T00:00:00.000Z');
    expect(result.entryCheck.windowEnd).toBe('2026-10-30T00:00:00.000Z');
    expect(workRecordRepository.findDailyHoursByUsers).toHaveBeenCalledWith(
      ['u1', 'u2'],
      d('2026-10-19'),
      d('2026-10-30')
    );
    expect(workRecordRepository.findLastRecordDateByUsers).toHaveBeenCalledWith(
      ['u1', 'u2'],
      d('2026-10-31')
    );
  });

  it('担当者ごとに最終入力日と入力漏れの日を返す（休暇・予定タスクのない日は除く）', async () => {
    const result = await service.getDataFreshness(1, 'p1', { now });

    expect(result.entryCheck.assignees).toEqual([
      {
        userId: 'u1',
        name: '山田',
        lastRecordDate: '2026-10-30T00:00:00.000Z',
        missingDates: ['2026-10-28T00:00:00.000Z'],
      },
      {
        userId: 'u2',
        name: '佐藤',
        lastRecordDate: '2026-10-27T00:00:00.000Z',
        missingDates: ['2026-10-28T00:00:00.000Z', '2026-10-30T00:00:00.000Z'],
      },
    ]);
  });

  it('タスクデータの不備を数える', async () => {
    const result = await service.getDataFreshness(1, 'p1', { now });

    expect(result.taskIssues).toEqual({
      noAssigneeCount: 1,
      noBaselineCount: 1,
      zeroProgressInProgressCount: 1,
    });
  });

  it('同期履歴がなければ lastWbsSync は null', async () => {
    syncLogRepository.getLastSync.mockResolvedValue(null);

    const result = await service.getDataFreshness(1, 'p1', { now });

    expect(result.lastWbsSync).toBeNull();
  });
});
