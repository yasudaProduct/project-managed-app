/**
 * @jest-environment node
 */

// Prismaモジュールをモック化（インポート前にモックする必要がある）
jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {},
}));

// DIコンテナのモック
jest.mock('@/lib/inversify.config', () => ({
  container: {
    get: jest.fn()
  }
}));

import { getAssigneeWorkloads } from '@/app/wbs/[id]/assignee-gantt/assignee-gantt-actions';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';

describe('assignee-gantt-actions', () => {
  const mockAssigneeGanttService = {
    getAssigneeWorkloads: jest.fn(),
    getAssigneeWarnings: jest.fn()
  };
  const mockCrossWbsWorkloadService = {
    getWbsWorkloadsWithExternal: jest.fn()
  };

  const createMockWorkload = (overrides: Record<string, unknown> = {}) => ({
    assigneeId: 'user-1',
    assigneeName: '山田太郎',
    assigneeRate: 1.0,
    dailyAllocations: [{
      date: new Date('2024-01-15'),
      availableHours: 7.5,
      isWeekend: false,
      isCompanyHoliday: false,
      userSchedules: [],
      taskAllocations: [{
        taskId: 'task-1',
        taskName: 'サンプルタスク',
        allocatedHours: 4.0,
        totalHours: 8.0,
        periodStart: new Date('2024-01-15'),
        periodEnd: new Date('2024-01-17')
      }],
      get allocatedHours() { return 4.0; }
    }],
    getOverloadedDays: () => [],
    getTotalHours: () => 4.0,
    getDailyAllocation: () => undefined,
    getDateRange: () => ({ startDate: null, endDate: null }),
    ...overrides,
  });

  beforeEach(() => {
    (container.get as jest.Mock).mockImplementation((symbol: symbol) => {
      if (symbol === SYMBOL.ICrossWbsWorkloadService) return mockCrossWbsWorkloadService;
      return mockAssigneeGanttService;
    });
    mockAssigneeGanttService.getAssigneeWorkloads.mockReset();
    mockAssigneeGanttService.getAssigneeWarnings.mockReset();
    mockCrossWbsWorkloadService.getWbsWorkloadsWithExternal.mockReset();
    // デフォルトのモック値を設定
    mockAssigneeGanttService.getAssigneeWarnings.mockResolvedValue([]);
  });

  describe('getAssigneeWorkloads', () => {
    it('正常なデータが返される場合、成功レスポンスを返す', async () => {
      // Arrange
      mockAssigneeGanttService.getAssigneeWorkloads.mockResolvedValue([createMockWorkload()]);

      // Act
      const result = await getAssigneeWorkloads(1, '2024-01-15', '2024-01-17');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assigneeId).toBe('user-1');
      expect(result.data![0].assigneeName).toBe('山田太郎');
      expect(mockAssigneeGanttService.getAssigneeWorkloads).toHaveBeenCalledWith(
        1,
        new Date('2024-01-15'),
        new Date('2024-01-17')
      );
      expect(mockCrossWbsWorkloadService.getWbsWorkloadsWithExternal).not.toHaveBeenCalled();
    });

    it('必須パラメータが不足している場合、エラーレスポンスを返す', async () => {
      // Act
      const result = await getAssigneeWorkloads(0, '', '2024-01-17');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('wbsid、startdate、enddateが必要です');
      expect(mockAssigneeGanttService.getAssigneeWorkloads).not.toHaveBeenCalled();
    });

    it('日付形式が不正な場合、エラーレスポンスを返す', async () => {
      // Act
      const result = await getAssigneeWorkloads(1, '2024/01/15', '2024-01-17');

      // Assert
      expect(result.success).toBe(false);
      expect(mockAssigneeGanttService.getAssigneeWorkloads).not.toHaveBeenCalled();
      expect(mockCrossWbsWorkloadService.getWbsWorkloadsWithExternal).not.toHaveBeenCalled();
    });

    it('サービスがエラーを投げる場合、エラーレスポンスを返す', async () => {
      // Arrange
      mockAssigneeGanttService.getAssigneeWorkloads.mockRejectedValue(new Error('Service error'));

      // Act
      const result = await getAssigneeWorkloads(1, '2024-01-15', '2024-01-17');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });

    describe('includeOtherWbs オプション', () => {
      it('trueの場合、横断サービスで合算し警告は現WBSのみ取得する', async () => {
        // Arrange
        mockCrossWbsWorkloadService.getWbsWorkloadsWithExternal.mockResolvedValue([
          {
            workload: createMockWorkload({
              assigneeRate: 1,
              dailyAllocations: [{
                date: new Date('2024-01-15'),
                availableHours: 7.5,
                isWeekend: false,
                isCompanyHoliday: false,
                userSchedules: [],
                taskAllocations: [
                  {
                    taskId: 'task-1',
                    taskName: '現WBSタスク',
                    allocatedHours: 4.0,
                    totalHours: 8.0,
                  },
                  {
                    taskId: 'task-2',
                    taskName: '他PJタスク',
                    allocatedHours: 2.0,
                    totalHours: 2.0,
                    projectName: 'PJ-B',
                  },
                ],
                get allocatedHours() { return 6.0; }
              }],
            }),
            rateBasis: { rate: 0.5, standardWorkingHours: 7.5 },
          },
        ]);

        // Act
        const result = await getAssigneeWorkloads(1, '2024-01-15', '2024-01-17', {
          includeOtherWbs: true,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(mockCrossWbsWorkloadService.getWbsWorkloadsWithExternal).toHaveBeenCalledWith(
          1,
          new Date('2024-01-15'),
          new Date('2024-01-17')
        );
        expect(mockAssigneeGanttService.getAssigneeWorkloads).not.toHaveBeenCalled();
        // 警告は従来通り現WBSのみ
        expect(mockAssigneeGanttService.getAssigneeWarnings).toHaveBeenCalledWith(
          1,
          new Date('2024-01-15'),
          new Date('2024-01-17')
        );

        // 合算行: 過負荷判定は合計(6h) vs 稼働可能時間(7.5h) → 適正
        const daily = result.data![0].dailyAllocations[0];
        expect(result.data![0].assigneeRate).toBe(1);
        expect(daily.isOverloaded).toBe(false);
        // Rバッジは現WBS分(ラベルなし4h) > 標準×現WBS参画率(7.5×0.5=3.75) で判定
        expect(daily.rateAllowedHours).toBeCloseTo(3.75, 5);
        expect(daily.isOverRateCapacity).toBe(true);
        expect(daily.overRateHours).toBeCloseTo(0.25, 5);
        // projectNameラベルがDTOへ引き継がれる
        expect(daily.taskAllocations[1].projectName).toBe('PJ-B');
      });

      it('falseまたは省略の場合、従来の現WBSのみのサービスを使用する', async () => {
        // Arrange
        mockAssigneeGanttService.getAssigneeWorkloads.mockResolvedValue([createMockWorkload()]);

        // Act
        await getAssigneeWorkloads(1, '2024-01-15', '2024-01-17', { includeOtherWbs: false });

        // Assert
        expect(mockAssigneeGanttService.getAssigneeWorkloads).toHaveBeenCalledTimes(1);
        expect(mockCrossWbsWorkloadService.getWbsWorkloadsWithExternal).not.toHaveBeenCalled();
      });
    });
  });
});
