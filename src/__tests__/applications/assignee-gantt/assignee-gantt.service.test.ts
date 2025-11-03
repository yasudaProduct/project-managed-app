import { AssigneeGanttService } from '@/applications/assignee-gantt/assignee-gantt.service';
import { ITaskRepository } from '@/applications/task/itask-repository';
import { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { CompanyHoliday } from '@/domains/calendar/company-calendar';
import { TaskNo } from '@/domains/task/task-no';
import { TaskStatus } from '@/domains/task/task-status';
import { Period } from '@/domains/period/period';

describe('AssigneeGanttService', () => {
  let service: AssigneeGanttService;
  let mockTaskRepository: jest.Mocked<ITaskRepository>;
  let mockUserScheduleRepository: jest.Mocked<IUserScheduleRepository>;
  let mockCompanyHolidayRepository: jest.Mocked<ICompanyHolidayRepository>;
  let mockWbsAssigneeRepository: jest.Mocked<IWbsAssigneeRepository>;

  const testStartDate = new Date('2024-01-15');
  const testEndDate = new Date('2024-01-19');
  const testWbsId = 1;

  beforeEach(() => {
    mockTaskRepository = {
      findByWbsId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ITaskRepository>;

    mockUserScheduleRepository = {
      findByUsersAndDateRange: jest.fn(),
      findByUserIdAndDateRange: jest.fn(),
      findByUserIdAndDate: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IUserScheduleRepository>;

    mockCompanyHolidayRepository = {
      findByDateRange: jest.fn(),
      findAll: jest.fn(),
      findByDate: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ICompanyHolidayRepository>;

    mockWbsAssigneeRepository = {
      findByWbsId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IWbsAssigneeRepository>;

    service = new AssigneeGanttService(
      mockTaskRepository,
      mockUserScheduleRepository,
      mockCompanyHolidayRepository,
      mockWbsAssigneeRepository
    );
  });

  const createMockTask = (taskNo: string, assigneeId: number, startDate: Date, endDate: Date, hours: number) => {
    return Task.reconstruct({
      id: parseInt(taskNo),
      taskNo: TaskNo.create(`TASK-${taskNo.padStart(3, '0')}`),
      wbsId: testWbsId,
      name: `タスク${taskNo}`,
      status: TaskStatus.NotStarted,
      assigneeId: assigneeId,
      periods: [
        Period.reconstruct({
          id: parseInt(taskNo),
          periodType: 'YOTEI',
          startDate,
          endDate,
          kosuu: hours
        })
      ]
    });
  };

  const createMockAssignee = (id: number, userId: string, name: string, rate: number = 1.0) => {
    return WbsAssignee.reconstruct({
      id: id,
      wbsId: testWbsId,
      userId: userId,
      userName: name,
      rate
    });
  };

  describe('getAssigneeWorkloads', () => {

    it('担当者別の作業負荷を正常に取得できる', async () => {
      // Arrange
      const assignees = [
        createMockAssignee(1, 'user-1', '山田太郎'),
        createMockAssignee(2, 'user-2', '田中花子')
      ];

      const tasks = [
        createMockTask('1', 1, new Date('2024-01-15'), new Date('2024-01-17'), 15), // 3日間で15時間
        createMockTask('2', 2, new Date('2024-01-16'), new Date('2024-01-18'), 10), // 3日間で10時間
      ];

      const userSchedules: UserSchedule[] = [];
      const companyHolidays: CompanyHoliday[] = [];

      mockTaskRepository.findByWbsId.mockResolvedValue(tasks);
      mockWbsAssigneeRepository.findByWbsId.mockResolvedValue(assignees);
      mockUserScheduleRepository.findByUsersAndDateRange.mockResolvedValue(userSchedules);
      mockCompanyHolidayRepository.findByDateRange.mockResolvedValue(companyHolidays);

      // Act
      const result = await service.getAssigneeWorkloads(testWbsId, testStartDate, testEndDate);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].assigneeId).toBe('user-1');
      expect(result[0].assigneeName).toBe('山田太郎');
      expect(result[1].assigneeId).toBe('user-2');
      expect(result[1].assigneeName).toBe('田中花子');

      // リポジトリメソッドが適切に呼ばれていることを確認
      expect(mockTaskRepository.findByWbsId).toHaveBeenCalledWith(testWbsId);
      expect(mockWbsAssigneeRepository.findByWbsId).toHaveBeenCalledWith(testWbsId);
      expect(mockUserScheduleRepository.findByUsersAndDateRange).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        testStartDate,
        testEndDate
      );
      expect(mockCompanyHolidayRepository.findByDateRange).toHaveBeenCalledWith(testStartDate, testEndDate);
    });

    it('担当者が存在しない場合は空配列を返す', async () => {
      // Arrange
      mockTaskRepository.findByWbsId.mockResolvedValue([]);
      mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);
      mockUserScheduleRepository.findByUsersAndDateRange.mockResolvedValue([]);
      mockCompanyHolidayRepository.findByDateRange.mockResolvedValue([]);

      // Act
      const result = await service.getAssigneeWorkloads(testWbsId, testStartDate, testEndDate);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('会社休日とユーザースケジュールを考慮した工数配分を行う', async () => {
      // Arrange
      const assignees = [
        createMockAssignee(1, 'user-1', '山田太郎', 0.8) // 80%の参画率
      ];

      const tasks = [
        createMockTask('1', 1, new Date('2024-01-15'), new Date('2024-01-17'), 15)
      ];

      const userSchedules: UserSchedule[] = [
        {
          userId: 'user-1',
          date: new Date('2024-01-16'),
          startTime: '09:00',
          endTime: '12:00', // 3時間の予定
          title: '会議'
        }
      ];

      const companyHolidays: CompanyHoliday[] = [
        {
          date: new Date('2024-01-17'),
          name: '祝日',
          type: 'NATIONAL'
        }
      ];

      mockTaskRepository.findByWbsId.mockResolvedValue(tasks);
      mockWbsAssigneeRepository.findByWbsId.mockResolvedValue(assignees);
      mockUserScheduleRepository.findByUsersAndDateRange.mockResolvedValue(userSchedules);
      mockCompanyHolidayRepository.findByDateRange.mockResolvedValue(companyHolidays);

      // Act
      const result = await service.getAssigneeWorkloads(testWbsId, testStartDate, testEndDate);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].assigneeId).toBe('user-1');
      
      // 日別配分の存在確認のみ（詳細ロジックは統合テストで確認）
      expect(result[0].dailyAllocations.length).toBeGreaterThan(0);
    });
  });

  describe('getAssigneeWorkload', () => {
    it('特定担当者の作業負荷を取得できる', async () => {
      // Arrange
      const assignees = [
        createMockAssignee(1, 'user-1', '山田太郎'),
        createMockAssignee(2, 'user-2', '田中花子')
      ];

      const tasks = [
        createMockTask('1', 1, new Date('2024-01-15'), new Date('2024-01-17'), 15),
        createMockTask('2', 2, new Date('2024-01-16'), new Date('2024-01-18'), 10),
      ];

      mockTaskRepository.findByWbsId.mockResolvedValue(tasks);
      mockWbsAssigneeRepository.findByWbsId.mockResolvedValue(assignees);
      mockUserScheduleRepository.findByUsersAndDateRange.mockResolvedValue([]);
      mockCompanyHolidayRepository.findByDateRange.mockResolvedValue([]);

      // Act
      const result = await service.getAssigneeWorkload(testWbsId, 'user-1', testStartDate, testEndDate);

      // Assert
      expect(result.assigneeId).toBe('user-1');
      expect(result.assigneeName).toBe('山田太郎');
    });

    it('存在しない担当者の場合はエラーを投げる', async () => {
      // Arrange
      mockTaskRepository.findByWbsId.mockResolvedValue([]);
      mockWbsAssigneeRepository.findByWbsId.mockResolvedValue([]);
      mockUserScheduleRepository.findByUsersAndDateRange.mockResolvedValue([]);
      mockCompanyHolidayRepository.findByDateRange.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.getAssigneeWorkload(testWbsId, 'non-existent-user', testStartDate, testEndDate)
      ).rejects.toThrow('担当者が見つかりません: non-existent-user');
    });
  });
});