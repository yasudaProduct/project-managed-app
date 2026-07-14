import { CrossWbsWorkloadService } from '@/applications/cross-wbs-workload/cross-wbs-workload-service';
import { ITargetWbsQueryRepository } from '@/applications/cross-wbs-workload/itarget-wbs-query-repository';
import { ITaskRepository } from '@/applications/task/itask-repository';
import { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { Wbs } from '@/domains/wbs/wbs';
import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';

// 2024-01-15(月)〜2024-01-19(金)。祝日なしの平常週。
const MON = new Date(2024, 0, 15);
const TUE = new Date(2024, 0, 16);
const FRI = new Date(2024, 0, 19);

describe('CrossWbsWorkloadService', () => {
  let service: CrossWbsWorkloadService;
  let mockTargetWbsQueryRepository: jest.Mocked<ITargetWbsQueryRepository>;
  let mockTaskRepository: jest.Mocked<ITaskRepository>;
  let mockWbsAssigneeRepository: jest.Mocked<IWbsAssigneeRepository>;
  let mockUserScheduleRepository: jest.Mocked<IUserScheduleRepository>;
  let mockCompanyHolidayRepository: jest.Mocked<ICompanyHolidayRepository>;
  let mockSystemSettingsRepository: jest.Mocked<ISystemSettingsRepository>;
  let mockWbsRepository: jest.Mocked<IWbsRepository>;

  beforeEach(() => {
    mockTargetWbsQueryRepository = {
      findTargetWbs: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ITargetWbsQueryRepository>;
    mockTaskRepository = {
      findByWbsId: jest.fn().mockResolvedValue([]),
      findActiveByWbsIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ITaskRepository>;
    mockWbsAssigneeRepository = {
      findByWbsId: jest.fn().mockResolvedValue([]),
      findByWbsIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IWbsAssigneeRepository>;
    mockUserScheduleRepository = {
      findByUsersAndDateRange: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IUserScheduleRepository>;
    mockCompanyHolidayRepository = {
      findByDateRange: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ICompanyHolidayRepository>;
    mockSystemSettingsRepository = {
      get: jest.fn().mockResolvedValue({
        standardWorkingHours: 7.5,
        roundToQuarter: false,
      }),
    } as unknown as jest.Mocked<ISystemSettingsRepository>;
    mockWbsRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IWbsRepository>;

    service = new CrossWbsWorkloadService(
      mockTargetWbsQueryRepository,
      mockTaskRepository,
      mockWbsAssigneeRepository,
      mockUserScheduleRepository,
      mockCompanyHolidayRepository,
      mockSystemSettingsRepository,
      mockWbsRepository
    );
  });

  const createTask = (args: {
    id: number;
    wbsId: number;
    assigneeId: number;
    startDate: Date;
    endDate: Date;
    kosu: number;
    name?: string;
  }): Task =>
    Task.createFromDb({
      id: args.id,
      taskNo: TaskNo.reconstruct(`TASK-${args.id}`),
      wbsId: args.wbsId,
      name: args.name ?? `タスク${args.id}`,
      status: new TaskStatus({ status: 'NOT_STARTED' }),
      assigneeId: args.assigneeId,
      periods: [
        Period.createFromDb({
          id: args.id,
          startDate: args.startDate,
          endDate: args.endDate,
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [
            ManHour.createFromDb({
              id: args.id,
              kosu: args.kosu,
              type: new ManHourType({ type: 'NORMAL' }),
            }),
          ],
        }),
      ],
    });

  const createAssignee = (args: {
    id: number;
    wbsId: number;
    userId: string;
    name: string;
    rate?: number;
  }): WbsAssignee =>
    WbsAssignee.createFromDb({
      id: args.id,
      wbsId: args.wbsId,
      userId: args.userId,
      userName: args.name,
      rate: args.rate ?? 1.0,
      costPerHour: 5000,
      seq: args.id,
    });

  const createSchedule = (overrides: Partial<UserSchedule> & { date: Date; userId: string }): UserSchedule => ({
    id: 1,
    startTime: '09:00',
    endTime: '10:00',
    title: '会議',
    ...overrides,
  });

  const dayOf = (workload: AssigneeWorkload, date: Date) =>
    workload.dailyAllocations.find(
      d => d.date.getFullYear() === date.getFullYear() &&
        d.date.getMonth() === date.getMonth() &&
        d.date.getDate() === date.getDate()
    )!;

  describe('resolveTargetWbs', () => {
    it('対象WBS一覧を返し、excludeProjectId指定でそのプロジェクトを除外する', async () => {
      mockTargetWbsQueryRepository.findTargetWbs.mockResolvedValue([
        { wbsId: 11, wbsName: 'WBS-A', projectId: 'p1', projectName: 'PJ-A' },
        { wbsId: 22, wbsName: 'WBS-B', projectId: 'p2', projectName: 'PJ-B' },
      ]);

      const all = await service.resolveTargetWbs();
      expect(all).toHaveLength(2);

      const excluded = await service.resolveTargetWbs('p1');
      expect(excluded).toEqual([
        { wbsId: 22, wbsName: 'WBS-B', projectId: 'p2', projectName: 'PJ-B' },
      ]);
    });
  });

  describe('getCrossProjectUserWorkloads', () => {
    it('複数WBS掛け持ちユーザーの負荷を合算し、按分は各WBSの参画率カレンダーで行う', async () => {
      mockTargetWbsQueryRepository.findTargetWbs.mockResolvedValue([
        { wbsId: 11, wbsName: 'WBS-A', projectId: 'p1', projectName: 'PJ-A' },
        { wbsId: 22, wbsName: 'WBS-B', projectId: 'p2', projectName: 'PJ-B' },
      ]);
      mockWbsAssigneeRepository.findByWbsIds.mockResolvedValue([
        createAssignee({ id: 101, wbsId: 11, userId: 'user-1', name: '山田太郎', rate: 1.0 }),
        createAssignee({ id: 202, wbsId: 22, userId: 'user-1', name: '山田太郎', rate: 0.5 }),
        createAssignee({ id: 203, wbsId: 22, userId: 'user-2', name: '田中花子', rate: 1.0 }),
      ]);
      mockTaskRepository.findActiveByWbsIds.mockResolvedValue([
        createTask({ id: 1, wbsId: 11, assigneeId: 101, startDate: MON, endDate: MON, kosu: 5 }),
        createTask({ id: 2, wbsId: 22, assigneeId: 202, startDate: MON, endDate: TUE, kosu: 6 }),
        createTask({ id: 3, wbsId: 22, assigneeId: 203, startDate: TUE, endDate: TUE, kosu: 4 }),
      ]);
      // user-1 は月曜に2hの個人予定(参画率0.5のWBS按分では rate cap 3.75 が効く)
      mockUserScheduleRepository.findByUsersAndDateRange.mockResolvedValue([
        createSchedule({ date: MON, userId: 'user-1', startTime: '10:00', endTime: '12:00' }),
      ]);

      const result = await service.getCrossProjectUserWorkloads(MON, FRI);

      expect(result).toHaveLength(2);
      const user1 = result.find(w => w.assigneeId === 'user-1')!;
      const user2 = result.find(w => w.assigneeId === 'user-2')!;

      // 合算行は participation-rate を使わない(rate=1)
      expect(user1.assigneeRate).toBe(1);
      expect(user2.assigneeRate).toBe(1);

      // user-1 月曜: PJ-A 5h + PJ-B 3h(=6h × 3.75/7.5 rate0.5カレンダー按分) = 8h
      const user1Mon = dayOf(user1, MON);
      expect(user1Mon.allocatedHours).toBeCloseTo(8, 5);
      expect(user1Mon.taskAllocations.map(t => t.projectName).sort()).toEqual(['PJ-A', 'PJ-B']);
      // 分母は標準7.5−個人予定2h=5.5(参画率キャップなし)
      expect(user1Mon.availableHours).toBe(5.5);

      // user-1 火曜: PJ-B 残り3h
      expect(dayOf(user1, TUE).allocatedHours).toBeCloseTo(3, 5);

      // user-2 火曜: 4h
      expect(dayOf(user2, TUE).allocatedHours).toBeCloseTo(4, 5);

      // バッチ取得(N+1なし)
      expect(mockTaskRepository.findActiveByWbsIds).toHaveBeenCalledTimes(1);
      expect(mockTaskRepository.findActiveByWbsIds).toHaveBeenCalledWith(
        [11, 22],
        { periodOverlaps: { start: MON, end: FRI } }
      );
      expect(mockWbsAssigneeRepository.findByWbsIds).toHaveBeenCalledTimes(1);
      expect(mockWbsAssigneeRepository.findByWbsIds).toHaveBeenCalledWith([11, 22]);
      expect(mockUserScheduleRepository.findByUsersAndDateRange).toHaveBeenCalledTimes(1);
      expect(mockUserScheduleRepository.findByUsersAndDateRange).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        MON,
        FRI
      );
      expect(mockCompanyHolidayRepository.findByDateRange).toHaveBeenCalledTimes(1);
    });

    it('タスクを持たない担当者も行として返す(配分0)', async () => {
      mockTargetWbsQueryRepository.findTargetWbs.mockResolvedValue([
        { wbsId: 11, wbsName: 'WBS-A', projectId: 'p1', projectName: 'PJ-A' },
      ]);
      mockWbsAssigneeRepository.findByWbsIds.mockResolvedValue([
        createAssignee({ id: 101, wbsId: 11, userId: 'user-1', name: '山田太郎' }),
      ]);
      mockTaskRepository.findActiveByWbsIds.mockResolvedValue([]);

      const result = await service.getCrossProjectUserWorkloads(MON, FRI);

      expect(result).toHaveLength(1);
      expect(result[0].assigneeId).toBe('user-1');
      expect(result[0].dailyAllocations.every(d => d.allocatedHours === 0)).toBe(true);
      // 平日の分母は標準勤務時間
      expect(dayOf(result[0], MON).availableHours).toBe(7.5);
    });

    it('対象WBSが無い場合は空配列を返し、タスク取得を行わない', async () => {
      mockTargetWbsQueryRepository.findTargetWbs.mockResolvedValue([]);

      const result = await service.getCrossProjectUserWorkloads(MON, FRI);

      expect(result).toEqual([]);
      expect(mockTaskRepository.findActiveByWbsIds).not.toHaveBeenCalled();
      expect(mockWbsAssigneeRepository.findByWbsIds).not.toHaveBeenCalled();
    });
  });

  describe('getWbsWorkloadsWithExternal', () => {
    const CURRENT_WBS_ID = 10;

    beforeEach(() => {
      mockWbsRepository.findById.mockResolvedValue(
        Wbs.createFromDb({ id: CURRENT_WBS_ID, name: '現WBS', projectId: 'p-cur' })
      );
    });

    it('現WBS担当者の行に他プロジェクトの負荷を合算する(現プロジェクトのWBSは対象から除外)', async () => {
      // 対象集合には現プロジェクトのWBS(10)も含まれるが、除外される
      mockTargetWbsQueryRepository.findTargetWbs.mockResolvedValue([
        { wbsId: CURRENT_WBS_ID, wbsName: '現WBS', projectId: 'p-cur', projectName: '現PJ' },
        { wbsId: 22, wbsName: 'WBS-B', projectId: 'p2', projectName: 'PJ-B' },
      ]);
      mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([
        createAssignee({ id: 100, wbsId: CURRENT_WBS_ID, userId: 'user-1', name: '山田太郎' }),
        createAssignee({ id: 110, wbsId: CURRENT_WBS_ID, userId: 'user-3', name: '佐藤次郎' }),
      ]);
      mockTaskRepository.findByWbsId.mockResolvedValue([
        createTask({ id: 1, wbsId: CURRENT_WBS_ID, assigneeId: 100, startDate: MON, endDate: MON, kosu: 5 }),
      ]);
      // 外部WBSの担当者: user-1(現WBSと掛け持ち) と user-9(現WBSに居ない → 行に追加しない)
      mockWbsAssigneeRepository.findByWbsIds.mockResolvedValue([
        createAssignee({ id: 202, wbsId: 22, userId: 'user-1', name: '山田太郎' }),
        createAssignee({ id: 209, wbsId: 22, userId: 'user-9', name: '外部ユーザー' }),
      ]);
      mockTaskRepository.findActiveByWbsIds.mockResolvedValue([
        createTask({ id: 2, wbsId: 22, assigneeId: 202, startDate: MON, endDate: MON, kosu: 2 }),
        createTask({ id: 9, wbsId: 22, assigneeId: 209, startDate: MON, endDate: MON, kosu: 8 }),
      ]);

      const result = await service.getWbsWorkloadsWithExternal(CURRENT_WBS_ID, MON, FRI);

      // 行は現WBSの担当者のみ(user-9は含まれない)
      expect(result).toHaveLength(2);
      expect(result.map(w => w.assigneeId).sort()).toEqual(['user-1', 'user-3']);

      const user1 = result.find(w => w.assigneeId === 'user-1')!;
      const user1Mon = dayOf(user1, MON);
      // 現WBS 5h + PJ-B 2h
      expect(user1Mon.allocatedHours).toBeCloseTo(7, 5);
      // 現WBS分はラベルなし・外部分はプロジェクト名ラベル付き
      expect(user1Mon.taskAllocations.map(t => t.projectName)).toEqual([undefined, 'PJ-B']);
      expect(user1.assigneeRate).toBe(1);

      // タスクを持たない現WBS担当者も行になる
      const user3 = result.find(w => w.assigneeId === 'user-3')!;
      expect(user3.dailyAllocations.every(d => d.allocatedHours === 0)).toBe(true);

      // 外部タスクは現プロジェクトを除外した対象WBSのみから一括取得
      expect(mockTaskRepository.findActiveByWbsIds).toHaveBeenCalledTimes(1);
      expect(mockTaskRepository.findActiveByWbsIds).toHaveBeenCalledWith(
        [22],
        { periodOverlaps: { start: MON, end: FRI } }
      );
      // 個人予定は現WBS担当者分を1回で取得
      expect(mockUserScheduleRepository.findByUsersAndDateRange).toHaveBeenCalledTimes(1);
      expect(mockUserScheduleRepository.findByUsersAndDateRange).toHaveBeenCalledWith(
        ['user-1', 'user-3'],
        MON,
        FRI
      );
    });

    it('対象WBSが無くても(現プロジェクトが完了等)現WBSのタスクは表示される', async () => {
      mockTargetWbsQueryRepository.findTargetWbs.mockResolvedValue([]);
      mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([
        createAssignee({ id: 100, wbsId: CURRENT_WBS_ID, userId: 'user-1', name: '山田太郎' }),
      ]);
      mockTaskRepository.findByWbsId.mockResolvedValue([
        createTask({ id: 1, wbsId: CURRENT_WBS_ID, assigneeId: 100, startDate: MON, endDate: MON, kosu: 5 }),
      ]);

      const result = await service.getWbsWorkloadsWithExternal(CURRENT_WBS_ID, MON, FRI);

      expect(result).toHaveLength(1);
      expect(dayOf(result[0], MON).allocatedHours).toBeCloseTo(5, 5);
      expect(mockTaskRepository.findActiveByWbsIds).not.toHaveBeenCalled();
    });

    it('WBSが存在しない場合はエラーを投げる', async () => {
      mockWbsRepository.findById.mockResolvedValue(null);

      await expect(
        service.getWbsWorkloadsWithExternal(999, MON, FRI)
      ).rejects.toThrow('WBSが見つかりません');
    });
  });

  describe('getExternalAllocationSets', () => {
    it('ユーザーIDごとにプロジェクト名ラベル付きの配分セットを返す(userIds/excludeProjectIdで絞り込み)', async () => {
      mockTargetWbsQueryRepository.findTargetWbs.mockResolvedValue([
        { wbsId: 11, wbsName: 'WBS-A', projectId: 'p1', projectName: 'PJ-A' },
        { wbsId: 22, wbsName: 'WBS-B', projectId: 'p2', projectName: 'PJ-B' },
      ]);
      mockWbsAssigneeRepository.findByWbsIds.mockResolvedValue([
        createAssignee({ id: 101, wbsId: 11, userId: 'user-1', name: '山田太郎' }),
        createAssignee({ id: 102, wbsId: 11, userId: 'user-2', name: '田中花子' }),
      ]);
      mockTaskRepository.findActiveByWbsIds.mockResolvedValue([
        createTask({ id: 1, wbsId: 11, assigneeId: 101, startDate: MON, endDate: MON, kosu: 5 }),
        createTask({ id: 2, wbsId: 11, assigneeId: 102, startDate: MON, endDate: MON, kosu: 3 }),
      ]);

      const result = await service.getExternalAllocationSets({
        startDate: MON,
        endDate: FRI,
        userIds: ['user-1'],
        excludeProjectId: 'p2',
      });

      // userIds指定によりuser-1のみ
      expect([...result.keys()]).toEqual(['user-1']);
      const sets = result.get('user-1')!;
      expect(sets).toHaveLength(1);
      expect(sets[0].wbsId).toBe(11);
      expect(sets[0].projectId).toBe('p1');
      expect(sets[0].projectName).toBe('PJ-A');
      const monAllocation = sets[0].dailyAllocations.find(
        d => d.date.getDate() === MON.getDate() && d.date.getMonth() === MON.getMonth()
      )!;
      expect(monAllocation.allocatedHours).toBeCloseTo(5, 5);

      // excludeProjectId p2 → WBS 22 は取得対象外
      expect(mockTaskRepository.findActiveByWbsIds).toHaveBeenCalledWith(
        [11],
        { periodOverlaps: { start: MON, end: FRI } }
      );
    });

    it('userIdsが空配列の場合は何も取得せず空Mapを返す', async () => {
      mockTargetWbsQueryRepository.findTargetWbs.mockResolvedValue([
        { wbsId: 11, wbsName: 'WBS-A', projectId: 'p1', projectName: 'PJ-A' },
      ]);

      const result = await service.getExternalAllocationSets({
        startDate: MON,
        endDate: FRI,
        userIds: [],
      });

      expect(result.size).toBe(0);
      expect(mockTaskRepository.findActiveByWbsIds).not.toHaveBeenCalled();
    });
  });
});
