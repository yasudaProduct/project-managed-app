/**
 * @jest-environment node
 */

import { getAssigneeWorkloads } from '@/app/actions/assignee-gantt-actions';
import { container } from '@/lib/inversify.config';

// DIコンテナのモック
jest.mock('@/lib/inversify.config', () => ({
  container: {
    get: jest.fn()
  }
}));

describe('assignee-gantt-actions', () => {
  const mockService = {
    getAssigneeWorkloads: jest.fn()
  };

  beforeEach(() => {
    (container.get as jest.Mock).mockReturnValue(mockService);
    mockService.getAssigneeWorkloads.mockClear();
  });

  describe('getAssigneeWorkloads', () => {
    it('正常なデータが返される場合、成功レスポンスを返す', async () => {
      // Arrange
      const mockWorkloads = [{
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations: [{
          date: new Date('2024-01-15'),
          availableHours: 7.5,
          taskAllocations: [{
            taskId: 'task-1',
            taskName: 'サンプルタスク',
            allocatedHours: 4.0,
            getFormattedHours: () => '4.0',
            equals: () => false,
            addHours: () => ({})
          }],
          get allocatedHours() { return 4.0; },
          isOverloaded: () => false,
          getUtilizationRate: () => 0.53,
          getOverloadedHours: () => 0,
          addTaskAllocation: () => {}
        }],
        getOverloadedDays: () => [],
        getTotalHours: () => 4.0,
        getDailyAllocation: () => undefined,
        getDateRange: () => ({ startDate: null, endDate: null })
      }];

      mockService.getAssigneeWorkloads.mockResolvedValue(mockWorkloads);

      // Act
      const result = await getAssigneeWorkloads(1, '2024-01-15', '2024-01-17');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assigneeId).toBe('user-1');
      expect(result.data![0].assigneeName).toBe('山田太郎');
      expect(mockService.getAssigneeWorkloads).toHaveBeenCalledWith(
        1,
        new Date('2024-01-15'),
        new Date('2024-01-17')
      );
    });

    it('必須パラメータが不足している場合、エラーレスポンスを返す', async () => {
      // Act
      const result = await getAssigneeWorkloads(0, '', '2024-01-17');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('wbsId, startDate, endDate are required');
      expect(mockService.getAssigneeWorkloads).not.toHaveBeenCalled();
    });

    it('サービスがエラーを投げる場合、エラーレスポンスを返す', async () => {
      // Arrange
      mockService.getAssigneeWorkloads.mockRejectedValue(new Error('Service error'));

      // Act
      const result = await getAssigneeWorkloads(1, '2024-01-15', '2024-01-17');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });
  });
});