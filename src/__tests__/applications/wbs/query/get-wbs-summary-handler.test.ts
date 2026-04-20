// Prismaモジュールをモック化（インポート前にモックする必要がある）
jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    projectSettings: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

import { GetWbsSummaryHandler } from '@/applications/wbs/query/get-wbs-summary-handler';
import { GetWbsSummaryQuery } from '@/applications/wbs/query/get-wbs-summary-query';
import { AllocationCalculationMode } from '@/applications/wbs/query/allocation-calculation-mode';
import { WbsTaskData, PhaseData } from '@/applications/wbs/query/wbs-query-repository';
import type { IWbsQueryRepository } from '@/applications/wbs/query/wbs-query-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';

describe('GetWbsSummaryHandler', () => {
  let handler: GetWbsSummaryHandler;
  let mockWbsQueryRepository: jest.Mocked<IWbsQueryRepository>;
  let mockCompanyHolidayRepository: jest.Mocked<ICompanyHolidayRepository>;
  let mockUserScheduleRepository: jest.Mocked<IUserScheduleRepository>;
  let mockWbsAssigneeRepository: jest.Mocked<IWbsAssigneeRepository>;
  let mockSystemSettingsRepository: jest.Mocked<ISystemSettingsRepository>;

  const mockTasks: WbsTaskData[] = [
    {
      id: 1,
      name: 'Task 1',
      yoteiStart: new Date('2024-01-15'),
      yoteiEnd: new Date('2024-01-20'),
      yoteiKosu: 40,
      jissekiKosu: 35,
      assignee: {
        id: '1',
        displayName: 'John Doe'
      },
      phase: {
        id: 1,
        name: 'Phase 1'
      }
    },
    {
      id: 2,
      name: 'Task 2',
      yoteiStart: new Date('2024-01-25'),
      yoteiEnd: new Date('2024-02-05'),
      yoteiKosu: 60,
      jissekiKosu: 55,
      assignee: {
        id: '1',
        displayName: 'John Doe'
      },
      phase: {
        id: 2,
        name: 'Phase 2'
      }
    },
    {
      id: 3,
      name: 'Task 3',
      yoteiStart: new Date('2024-02-01'),
      yoteiEnd: new Date('2024-02-10'),
      yoteiKosu: 30,
      jissekiKosu: 32,
      assignee: {
        id: '2',
        displayName: 'Jane Smith'
      },
      phase: {
        id: 1,
        name: 'Phase 1'
      }
    }
  ];

  const mockPhases: PhaseData[] = [
    { id: 1, name: 'Phase 1', seq: 1 },
    { id: 2, name: 'Phase 2', seq: 2 }
  ];

  beforeEach(() => {
    mockWbsQueryRepository = {
      getWbsTasks: jest.fn(),
      getPhases: jest.fn(),
      getTaskActualHoursByMonth: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<IWbsQueryRepository>;

    mockCompanyHolidayRepository = {
      findAll: jest.fn(),
    } as jest.Mocked<ICompanyHolidayRepository>;

    mockUserScheduleRepository = {
      findByUserIdAndDateRange: jest.fn(),
    } as jest.Mocked<IUserScheduleRepository>;

    mockWbsAssigneeRepository = {
      findByWbsId: jest.fn(),
    } as jest.Mocked<IWbsAssigneeRepository>;

    mockSystemSettingsRepository = {
      get: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<ISystemSettingsRepository>;

    handler = new GetWbsSummaryHandler(
      mockWbsQueryRepository,
      mockCompanyHolidayRepository,
      mockUserScheduleRepository,
      mockWbsAssigneeRepository,
      mockSystemSettingsRepository
    );

    // デフォルトのモック設定
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue(mockTasks);
    mockWbsQueryRepository.getPhases.mockResolvedValue(mockPhases);
    mockWbsQueryRepository.getTaskActualHoursByMonth.mockResolvedValue([]);
    mockCompanyHolidayRepository.findAll.mockResolvedValue([]);
    mockUserScheduleRepository.findByUserIdAndDateRange.mockResolvedValue([]);
    mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);
    // SystemSettingsにデフォルト値を設定
    mockSystemSettingsRepository.get.mockResolvedValue({
      standardWorkingHours: 7.5,
      roundToQuarter: false,
    });
  });

  describe('execute', () => {
    it('should calculate phase summaries correctly', async () => {
      const query = new GetWbsSummaryQuery('project-1', 1);
      
      const result = await handler.execute(query);

      expect(result.phaseSummaries).toHaveLength(2);
      
      const phase1Summary = result.phaseSummaries.find(p => p.phase === 'Phase 1');
      expect(phase1Summary).toEqual({
        phase: 'Phase 1',
        seq: 1,
        taskCount: 2,
        plannedHours: 70, // Task 1: 40 + Task 3: 30
        actualHours: 67,  // Task 1: 35 + Task 3: 32
        difference: -3    // 67 - 70
      });

      const phase2Summary = result.phaseSummaries.find(p => p.phase === 'Phase 2');
      expect(phase2Summary).toEqual({
        phase: 'Phase 2',
        seq: 2,
        taskCount: 1,
        plannedHours: 60,
        actualHours: 55,
        difference: -5
      });
    });

    it('should calculate assignee summaries correctly', async () => {
      const query = new GetWbsSummaryQuery('project-1', 1);
      
      const result = await handler.execute(query);

      expect(result.assigneeSummaries).toHaveLength(2);
      
      const johnSummary = result.assigneeSummaries.find(a => a.assignee === 'John Doe');
      expect(johnSummary).toEqual({
        assignee: 'John Doe',
        seq: Number.MAX_SAFE_INTEGER,
        taskCount: 2,
        plannedHours: 100, // Task 1: 40 + Task 2: 60
        actualHours: 90,   // Task 1: 35 + Task 2: 55
        difference: -10    // 90 - 100
      });

      const janeSummary = result.assigneeSummaries.find(a => a.assignee === 'Jane Smith');
      expect(janeSummary).toEqual({
        assignee: 'Jane Smith',
        seq: Number.MAX_SAFE_INTEGER,
        taskCount: 1,
        plannedHours: 30,
        actualHours: 32,
        difference: 2
      });
    });

    describe('Monthly assignee summary with different calculation modes', () => {
      it('should use START_DATE_BASED calculation mode when specified', async () => {
        const query = new GetWbsSummaryQuery('project-1', 1, AllocationCalculationMode.START_DATE_BASED);
        
        const result = await handler.execute(query);

        // START_DATE_BASEDモードでは、すべての工数が開始日の月に計上される
        const monthlyData = result.monthlyAssigneeSummary.data;
        
        // John Doeの1月のタスク（Task 1は1月開始、Task 2は1月開始）
        const johnJan = monthlyData.find(d => d.assignee === 'John Doe' && d.month === '2024/01');
        expect(johnJan?.plannedHours).toBe(100); // 40 + 60（全工数が1月に計上）
        
        // Jane Smithの2月のタスク（Task 3は2月開始）
        const janeFeb = monthlyData.find(d => d.assignee === 'Jane Smith' && d.month === '2024/02');
        expect(janeFeb?.plannedHours).toBe(30);
      });

      it('should use BUSINESS_DAY_ALLOCATION calculation mode by default', async () => {
        const query = new GetWbsSummaryQuery('project-1', 1); // デフォルト
        
        const result = await handler.execute(query);

        // BUSINESS_DAY_ALLOCATIONモードでは営業日案分が適用される
        // ただし、WbsAssigneeが見つからない場合は開始日基準になる
        expect(result.monthlyAssigneeSummary.data.length).toBeGreaterThan(0);
      });

      it('should throw error for unknown calculation mode', async () => {
        // @ts-expect-error - テスト用に無効な値を設定
        const query = new GetWbsSummaryQuery('project-1', 1, 'INVALID_MODE' as AllocationCalculationMode);

        await expect(handler.execute(query)).rejects.toThrow('不明な計算モード: INVALID_MODE');
      });
    });

    it('should calculate totals correctly', async () => {
      const query = new GetWbsSummaryQuery('project-1', 1);
      
      const result = await handler.execute(query);

      expect(result.phaseTotal).toEqual({
        taskCount: 3,
        plannedHours: 130, // 40 + 60 + 30
        actualHours: 122,  // 35 + 55 + 32
        difference: -8     // 122 - 130
      });

      expect(result.assigneeTotal).toEqual({
        taskCount: 3,
        plannedHours: 130,
        actualHours: 122,
        difference: -8
      });
    });

    it('should handle tasks without assignees', async () => {
      const tasksWithoutAssignee = [
        {
          ...mockTasks[0],
          assignee: null
        }
      ];

      mockWbsQueryRepository.getWbsTasks.mockResolvedValue(tasksWithoutAssignee);

      const query = new GetWbsSummaryQuery('project-1', 1);
      const result = await handler.execute(query);

      // 担当者がいないタスクは「未割当」として月別担当者別集計に含まれる
      expect(result.monthlyAssigneeSummary.data).toHaveLength(1);
      expect(result.monthlyAssigneeSummary.data[0].assignee).toBe('未割当');
    });

    it('should handle tasks without start dates', async () => {
      const tasksWithoutStartDate = [
        {
          ...mockTasks[0],
          yoteiStart: null
        }
      ];

      mockWbsQueryRepository.getWbsTasks.mockResolvedValue(tasksWithoutStartDate);

      const query = new GetWbsSummaryQuery('project-1', 1);
      const result = await handler.execute(query);

      // 開始日がないタスクは月別担当者別集計から除外される（work_records が無い場合）
      expect(result.monthlyAssigneeSummary.data).toHaveLength(0);
    });

    describe('work_records based actual hours aggregation', () => {
      it('実績工数は work_records の作業月に計上される（タスク予定開始月ではない）', async () => {
        // Task 1: yoteiStart = 2024/01/15, yoteiEnd = 2024/01/20
        // work_records: 2024/03 に 35 時間作業
        mockWbsQueryRepository.getTaskActualHoursByMonth.mockResolvedValue([
          {
            taskId: '1',
            userId: '1',
            userDisplayName: 'John Doe',
            yearMonth: '2024/03',
            hoursWorked: 35,
          },
        ]);
        // タスクを 1 件に絞る
        mockWbsQueryRepository.getWbsTasks.mockResolvedValue([mockTasks[0]]);

        const query = new GetWbsSummaryQuery('project-1', 1, AllocationCalculationMode.START_DATE_BASED);
        const result = await handler.execute(query);

        // 予定開始月(2024/01)ではなく、作業月(2024/03)に実績が計上される
        const john0124 = result.monthlyAssigneeSummary.data.find(
          d => d.assignee === 'John Doe' && d.month === '2024/01'
        );
        expect(john0124?.actualHours ?? 0).toBe(0);

        const john0324 = result.monthlyAssigneeSummary.data.find(
          d => d.assignee === 'John Doe' && d.month === '2024/03'
        );
        expect(john0324?.actualHours).toBe(35);
      });

      it('タスク予定期間外の月に work_records がある場合、その月が集計表に追加される', async () => {
        mockWbsQueryRepository.getWbsTasks.mockResolvedValue([mockTasks[0]]);
        mockWbsQueryRepository.getTaskActualHoursByMonth.mockResolvedValue([
          {
            taskId: '1',
            userId: '1',
            userDisplayName: 'John Doe',
            yearMonth: '2024/05',
            hoursWorked: 10,
          },
        ]);

        const query = new GetWbsSummaryQuery('project-1', 1, AllocationCalculationMode.START_DATE_BASED);
        const result = await handler.execute(query);

        expect(result.monthlyAssigneeSummary.months).toContain('2024/05');
        const may = result.monthlyAssigneeSummary.monthlyTotals['2024/05'];
        expect(may?.actualHours).toBe(10);
      });

      it('実績工数は work_records の実作業者に紐付く（タスク担当者ではない）', async () => {
        // Task 1 は John Doe に割当られているが、実際に作業したのは別のユーザー
        mockWbsQueryRepository.getWbsTasks.mockResolvedValue([mockTasks[0]]);
        mockWbsQueryRepository.getTaskActualHoursByMonth.mockResolvedValue([
          {
            taskId: '1',
            userId: '99',
            userDisplayName: 'Helper User',
            yearMonth: '2024/01',
            hoursWorked: 8,
          },
        ]);

        const query = new GetWbsSummaryQuery('project-1', 1, AllocationCalculationMode.START_DATE_BASED);
        const result = await handler.execute(query);

        // John Doe の 1 月: 予定 40h / 実績 0h（タスク担当だが実作業せず）
        const john = result.monthlyAssigneeSummary.data.find(
          d => d.assignee === 'John Doe' && d.month === '2024/01'
        );
        expect(john?.plannedHours).toBe(40);
        expect(john?.actualHours).toBe(0);

        // Helper User の 1 月: 予定 0h / 実績 8h
        const helper = result.monthlyAssigneeSummary.data.find(
          d => d.assignee === 'Helper User' && d.month === '2024/01'
        );
        expect(helper?.plannedHours ?? 0).toBe(0);
        expect(helper?.actualHours).toBe(8);
      });

      it('月別・工程別集計でも work_records ベースで実績が計上される', async () => {
        mockWbsQueryRepository.getWbsTasks.mockResolvedValue([mockTasks[0]]);
        mockWbsQueryRepository.getTaskActualHoursByMonth.mockResolvedValue([
          {
            taskId: '1',
            userId: '1',
            userDisplayName: 'John Doe',
            yearMonth: '2024/04',
            hoursWorked: 25,
          },
        ]);

        const query = new GetWbsSummaryQuery('project-1', 1, AllocationCalculationMode.START_DATE_BASED);
        const result = await handler.execute(query);

        // Task 1 は Phase 1。予定開始月 2024/01、作業月 2024/04
        const phase1Apr = result.monthlyPhaseSummary!.data.find(
          d => d.phase === 'Phase 1' && d.month === '2024/04'
        );
        expect(phase1Apr?.actualHours).toBe(25);

        const phase1Jan = result.monthlyPhaseSummary!.data.find(
          d => d.phase === 'Phase 1' && d.month === '2024/01'
        );
        expect(phase1Jan?.actualHours ?? 0).toBe(0);
      });

      it('yoteiStart が null のタスクでも work_records があれば集計に含まれる', async () => {
        const tasksWithoutStartDate = [
          {
            ...mockTasks[0],
            yoteiStart: null,
            yoteiEnd: null,
          }
        ];
        mockWbsQueryRepository.getWbsTasks.mockResolvedValue(tasksWithoutStartDate);
        mockWbsQueryRepository.getTaskActualHoursByMonth.mockResolvedValue([
          {
            taskId: '1',
            userId: '1',
            userDisplayName: 'John Doe',
            yearMonth: '2024/06',
            hoursWorked: 12,
          },
        ]);

        const query = new GetWbsSummaryQuery('project-1', 1, AllocationCalculationMode.START_DATE_BASED);
        const result = await handler.execute(query);

        expect(result.monthlyAssigneeSummary.months).toContain('2024/06');
        const jun = result.monthlyAssigneeSummary.monthlyTotals['2024/06'];
        expect(jun?.actualHours).toBe(12);
      });
    });
  });
});