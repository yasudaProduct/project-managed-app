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

import { getCrossProjectAssigneeWorkloads, getTargetWbsList } from '@/app/assignee-gantt/actions';
import { container } from '@/lib/inversify.config';

describe('cross-project assignee-gantt actions', () => {
  const mockService = {
    getCrossProjectUserWorkloads: jest.fn(),
    resolveTargetWbs: jest.fn(),
  };

  beforeEach(() => {
    (container.get as jest.Mock).mockReturnValue(mockService);
    mockService.getCrossProjectUserWorkloads.mockReset();
    mockService.resolveTargetWbs.mockReset();
  });

  describe('getCrossProjectAssigneeWorkloads', () => {
    it('ユーザー単位の負荷をDTOへ変換して返す(projectNameラベル・ISO日付)', async () => {
      // Arrange
      mockService.getCrossProjectUserWorkloads.mockResolvedValue([{
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        assigneeRate: 1,
        dailyAllocations: [{
          date: new Date('2024-01-15'),
          availableHours: 7.5,
          isWeekend: false,
          isCompanyHoliday: false,
          userSchedules: [],
          taskAllocations: [{
            taskId: 'task-1',
            taskName: 'タスクA',
            allocatedHours: 5.0,
            totalHours: 5.0,
            projectName: 'PJ-A',
          }],
          get allocatedHours() { return 5.0; }
        }],
      }]);

      // Act
      const result = await getCrossProjectAssigneeWorkloads('2024-01-15', '2024-01-19');

      // Assert
      expect(result.success).toBe(true);
      expect(mockService.getCrossProjectUserWorkloads).toHaveBeenCalledWith(
        new Date('2024-01-15'),
        new Date('2024-01-19')
      );
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assigneeRate).toBe(1);
      const daily = result.data![0].dailyAllocations[0];
      expect(daily.date).toBe(new Date('2024-01-15').toISOString());
      expect(daily.taskAllocations[0].projectName).toBe('PJ-A');
      expect(result.warnings).toEqual([]);
    });

    it('日付形式が不正な場合はエラーレスポンスを返す', async () => {
      // Act
      const result = await getCrossProjectAssigneeWorkloads('2024/01/15', '2024-01-19');

      // Assert
      expect(result.success).toBe(false);
      expect(mockService.getCrossProjectUserWorkloads).not.toHaveBeenCalled();
    });

    it('サービスがエラーを投げる場合はエラーレスポンスを返す', async () => {
      // Arrange
      mockService.getCrossProjectUserWorkloads.mockRejectedValue(new Error('Service error'));

      // Act
      const result = await getCrossProjectAssigneeWorkloads('2024-01-15', '2024-01-19');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });
  });

  describe('getTargetWbsList', () => {
    it('対象WBS一覧を返す', async () => {
      // Arrange
      mockService.resolveTargetWbs.mockResolvedValue([
        { wbsId: 11, wbsName: 'WBS-A', projectId: 'p1', projectName: 'PJ-A' },
      ]);

      // Act
      const result = await getTargetWbsList();

      // Assert
      expect(result).toEqual([
        { wbsId: 11, wbsName: 'WBS-A', projectId: 'p1', projectName: 'PJ-A' },
      ]);
    });
  });
});
