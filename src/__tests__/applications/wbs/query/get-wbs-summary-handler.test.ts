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
    { id: 1, name: 'Phase 1' },
    { id: 2, name: 'Phase 2' }
  ];

  beforeEach(() => {
    mockWbsQueryRepository = {
      getWbsTasks: jest.fn(),
      getPhases: jest.fn(),
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
    mockCompanyHolidayRepository.findAll.mockResolvedValue([]);
    mockUserScheduleRepository.findByUserIdAndDateRange.mockResolvedValue([]);
    mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);
  });

  describe('execute', () => {
    it('should calculate phase summaries correctly', async () => {
      const query = new GetWbsSummaryQuery('project-1', 1);
      
      const result = await handler.execute(query);

      expect(result.phaseSummaries).toHaveLength(2);
      
      const phase1Summary = result.phaseSummaries.find(p => p.phase === 'Phase 1');
      expect(phase1Summary).toEqual({
        phase: 'Phase 1',
        taskCount: 2,
        plannedHours: 70, // Task 1: 40 + Task 3: 30
        actualHours: 67,  // Task 1: 35 + Task 3: 32
        difference: -3    // 67 - 70
      });

      const phase2Summary = result.phaseSummaries.find(p => p.phase === 'Phase 2');
      expect(phase2Summary).toEqual({
        phase: 'Phase 2',
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
        taskCount: 2,
        plannedHours: 100, // Task 1: 40 + Task 2: 60
        actualHours: 90,   // Task 1: 35 + Task 2: 55
        difference: -10    // 90 - 100
      });

      const janeSummary = result.assigneeSummaries.find(a => a.assignee === 'Jane Smith');
      expect(janeSummary).toEqual({
        assignee: 'Jane Smith',
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
        
        await expect(handler.execute(query)).rejects.toThrow('Unknown calculation mode: INVALID_MODE');
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

      // 担当者がいないタスクは月別担当者別集計から除外される
      expect(result.monthlyAssigneeSummary.data).toHaveLength(0);
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

      // 開始日がないタスクは月別担当者別集計から除外される
      expect(result.monthlyAssigneeSummary.data).toHaveLength(0);
    });
  });
});