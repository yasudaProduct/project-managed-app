import { WorkloadCalculationService } from '@/domains/assignee-workload/workload-calculation.service';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { UserSchedule, AssigneeWorkingCalendar } from '@/domains/calendar/assignee-working-calendar';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { DailyWorkAllocation } from '@/domains/assignee-workload/daily-work-allocation';
import { TaskAllocation } from '@/domains/assignee-workload/task-allocation';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/project-status';
import { Period } from '@/domains/task/period';
import { getDefaultStandardWorkingHours } from "@/__tests__/helpers/system-settings-helper";

describe('WorkloadCalculationService', () => {
  let service: WorkloadCalculationService;
  let mockTask: Task;
  let mockAssignee: WbsAssignee;
  let mockCompanyCalendar: CompanyCalendar;

  beforeEach(() => {
    service = new WorkloadCalculationService();

    // モックタスクの作成
    mockTask = Task.reconstruct({
      id: 1,
      taskNo: new TaskNo('TASK-001'),
      wbsId: 1,
      name: 'Test Task',
      assigneeId: 1,
      status: new TaskStatus({ status: 'NOT_STARTED' }),
      periods: [
        Period.reconstruct({
          id: 1,
          periodType: 'YOTEI',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          kosuu: 40
        })
      ]
    });

    // モック担当者の作成
    mockAssignee = WbsAssignee.reconstruct({
      id: 1,
      wbsId: 1,
      userId: 'user1',
      userName: 'Test User',
      rate: 0.8
    });

    // モック会社カレンダーの作成
    mockCompanyCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), []);
  });

  describe('calculateDailyAllocations', () => {
    it('期間内の日別作業配分を正しく計算する', () => {
      const tasks = [mockTask];
      const userSchedules: UserSchedule[] = [];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-05');

      const result = service.calculateDailyAllocations(
        tasks,
        mockAssignee,
        userSchedules,
        mockCompanyCalendar,
        startDate,
        endDate
      );

      expect(result).toHaveLength(5); // 5日間
      expect(result[0].date.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(result[4].date.toISOString().split('T')[0]).toBe('2024-01-05');
    });

    it('週末を正しく識別する', () => {
      const tasks: Task[] = [];
      const userSchedules: UserSchedule[] = [];
      const startDate = new Date('2024-01-06'); // 土曜日
      const endDate = new Date('2024-01-07'); // 日曜日

      const result = service.calculateDailyAllocations(
        tasks,
        mockAssignee,
        userSchedules,
        mockCompanyCalendar,
        startDate,
        endDate
      );

      expect(result[0].isWeekend).toBe(true); // 土曜日
      expect(result[1].isWeekend).toBe(true); // 日曜日
    });

    it('個人予定を考慮して稼働可能時間を計算する', () => {
      const tasks = [mockTask];
      const userSchedules: UserSchedule[] = [
        {
          userId: 'user1',
          date: new Date('2024-01-02'),
          title: '会議',
          startTime: '10:00',
          endTime: '12:00'
        }
      ];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-05');

      const result = service.calculateDailyAllocations(
        tasks,
        mockAssignee,
        userSchedules,
        mockCompanyCalendar,
        startDate,
        endDate
      );

      const dayWithSchedule = result[1]; // 1月2日
      expect(dayWithSchedule.userSchedules).toHaveLength(1);
      expect(dayWithSchedule.userSchedules[0].durationHours).toBe(2); // 2時間の会議
    });
  });

  describe('calculateTaskAllocationsForDate', () => {
    it('アクティブなタスクの工数を正しく配分する', () => {
      const tasks = [mockTask];
      const date = new Date('2024-01-03');
      const availableHours = 6; // 稼働可能時間6時間

      // モックのworkingCalendarを作成
      const mockWorkingCalendar = new AssigneeWorkingCalendar(
        mockAssignee,
        mockCompanyCalendar,
        []
      );

      // getAvailableHoursをモック化
      jest.spyOn(mockWorkingCalendar, 'getAvailableHours').mockReturnValue(6);

      const result = service.calculateTaskAllocationsForDate(
        tasks,
        date,
        availableHours,
        mockWorkingCalendar
      );

      expect(result).toHaveLength(1);
      expect(result[0].taskName).toBe('Test Task');
      expect(result[0].totalHours).toBe(40);
    });

    it('稼働可能時間が0の場合は空配列を返す', () => {
      const tasks = [mockTask];
      const date = new Date('2024-01-03');
      const availableHours = 0;

      const mockWorkingCalendar = new AssigneeWorkingCalendar(
        mockAssignee,
        mockCompanyCalendar,
        []
      );

      const result = service.calculateTaskAllocationsForDate(
        tasks,
        date,
        availableHours,
        mockWorkingCalendar
      );

      expect(result).toHaveLength(0);
    });

    it('タスクが期間外の場合は配分しない', () => {
      const tasks = [mockTask];
      const date = new Date('2024-02-01'); // タスク期間外
      const availableHours = 6;

      const mockWorkingCalendar = new AssigneeWorkingCalendar(
        mockAssignee,
        mockCompanyCalendar,
        []
      );

      const result = service.calculateTaskAllocationsForDate(
        tasks,
        date,
        availableHours,
        mockWorkingCalendar
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('isTaskActiveOnDate', () => {
    it('タスク期間内の日付の場合trueを返す', () => {
      const date = new Date('2024-01-03');
      const result = service.isTaskActiveOnDate(mockTask, date);
      expect(result).toBe(true);
    });

    it('タスク開始日の場合trueを返す', () => {
      const date = new Date('2024-01-01');
      const result = service.isTaskActiveOnDate(mockTask, date);
      expect(result).toBe(true);
    });

    it('タスク終了日の場合trueを返す', () => {
      const date = new Date('2024-01-05');
      const result = service.isTaskActiveOnDate(mockTask, date);
      expect(result).toBe(true);
    });

    it('タスク期間前の日付の場合falseを返す', () => {
      const date = new Date('2023-12-31');
      const result = service.isTaskActiveOnDate(mockTask, date);
      expect(result).toBe(false);
    });

    it('タスク期間後の日付の場合falseを返す', () => {
      const date = new Date('2024-01-06');
      const result = service.isTaskActiveOnDate(mockTask, date);
      expect(result).toBe(false);
    });

    it('予定期間が設定されていない場合falseを返す', () => {
      const taskWithoutPeriod = Task.reconstruct({
        id: 2,
        taskNo: new TaskNo('TASK-002'),
        wbsId: 1,
        name: 'Task without period',
        status: new TaskStatus({ status: 'NOT_STARTED' })
      });

      const date = new Date('2024-01-03');
      const result = service.isTaskActiveOnDate(taskWithoutPeriod, date);
      expect(result).toBe(false);
    });
  });

  describe('calculateScheduleDuration', () => {
    it('時間範囲から正しく期間を計算する', () => {
      const result = service.calculateScheduleDuration('09:00', '17:30');
      expect(result).toBe(8.5); // 8.5時間
    });

    it('午前中のみの予定を正しく計算する', () => {
      const result = service.calculateScheduleDuration('09:00', '12:00');
      expect(result).toBe(3); // 3時間
    });

    it('午後のみの予定を正しく計算する', () => {
      const result = service.calculateScheduleDuration('13:00', '18:00');
      expect(result).toBe(5); // 5時間
    });

    it('分単位の予定を正しく計算する', () => {
      const result = service.calculateScheduleDuration('09:30', '11:15');
      expect(result).toBe(1.75); // 1時間45分
    });

    it('同じ時刻の場合0を返す', () => {
      const result = service.calculateScheduleDuration('10:00', '10:00');
      expect(result).toBe(0);
    });
  });

  describe('複数タスクの配分計算', () => {
    it('複数タスクの工数を正しく配分する', () => {
      const task1 = Task.reconstruct({
        id: 1,
        taskNo: new TaskNo('TASK-001'),
        wbsId: 1,
        name: 'Task 1',
        assigneeId: 1,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [
          Period.reconstruct({
            id: 1,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-03'),
            kosuu: 24
          })
        ]
      });

      const task2 = Task.reconstruct({
        id: 2,
        taskNo: new TaskNo('TASK-002'),
        wbsId: 1,
        name: 'Task 2',
        assigneeId: 1,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.reconstruct({
            id: 2,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-02'),
            endDate: new Date('2024-01-04'),
            kosuu: 18
          })
        ]
      });

      const tasks = [task1, task2];
      const userSchedules: UserSchedule[] = [];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-04');

      const result = service.calculateDailyAllocations(
        tasks,
        mockAssignee,
        userSchedules,
        mockCompanyCalendar,
        startDate,
        endDate
      );

      // 1月1日: Task1のみアクティブ
      expect(result[0].taskAllocations).toHaveLength(1);
      expect(result[0].taskAllocations[0].taskName).toBe('Task 1');

      // 1月2日: Task1とTask2の両方がアクティブ
      expect(result[1].taskAllocations).toHaveLength(2);

      // 1月3日: Task1とTask2の両方がアクティブ
      expect(result[2].taskAllocations).toHaveLength(2);

      // 1月4日: Task2のみアクティブ
      expect(result[3].taskAllocations).toHaveLength(1);
      expect(result[3].taskAllocations[0].taskName).toBe('Task 2');
    });
  });
});