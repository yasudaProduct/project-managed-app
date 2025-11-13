import { WorkloadWarningService } from '@/domains/assignee-workload/workload-warning.service';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { CompanyCalendar, CompanyHoliday } from '@/domains/calendar/company-calendar';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/project-status';
import { Period } from '@/domains/task/period';
import { getDefaultStandardWorkingHours } from "@/__tests__/helpers/system-settings-helper";

describe('WorkloadWarningService', () => {
  let service: WorkloadWarningService;
  let mockTask: Task;
  let mockAssignee: WbsAssignee;
  let mockCompanyCalendar: CompanyCalendar;

  beforeEach(() => {
    service = new WorkloadWarningService();

    // モックタスクの作成
    mockTask = Task.reconstruct({
      id: 1,
      taskNo: TaskNo.create('TASK-001'),
      wbsId: 1,
      name: 'Test Task',
      assigneeId: 1,
      status: TaskStatus.NotStarted,
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

    // モック会社カレンダーの作成（平日のみ）
    mockCompanyCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), []);
  });

  describe('validateTaskFeasibility', () => {
    it('稼働可能日がある場合はnullを返す', () => {
      const result = service.validateTaskFeasibility(
        mockTask,
        mockAssignee,
        mockCompanyCalendar,
        []
      );

      expect(result).toBeNull();
    });

    it('全日が会社休日の場合は警告を返す', () => {
      // 全日を会社休日に設定
      const holidays: CompanyHoliday[] = [
        { date: new Date('2024-01-01'), name: '元旦', type: 'NATIONAL' },
        { date: new Date('2024-01-02'), name: '休日', type: 'COMPANY' },
        { date: new Date('2024-01-03'), name: '休日', type: 'COMPANY' },
        { date: new Date('2024-01-04'), name: '休日', type: 'COMPANY' },
        { date: new Date('2024-01-05'), name: '休日', type: 'COMPANY' }
      ];
      const holidayCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), holidays);

      const result = service.validateTaskFeasibility(
        mockTask,
        mockAssignee,
        holidayCalendar,
        []
      );

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('NO_WORKING_DAYS');
      expect(result?.taskId).toBe(1);
      expect(result?.taskNo).toBe('TASK-001');
      expect(result?.taskName).toBe('Test Task');
    });

    it('担当者の全日が個人予定で埋まっている場合は警告を返す', () => {
      // 全日を終日予定で埋める
      const userSchedules: UserSchedule[] = [
        { userId: 'user1', date: new Date('2024-01-01'), title: '休暇', startTime: '00:00', endTime: '24:00' },
        { userId: 'user1', date: new Date('2024-01-02'), title: '休暇', startTime: '00:00', endTime: '24:00' },
        { userId: 'user1', date: new Date('2024-01-03'), title: '休暇', startTime: '00:00', endTime: '24:00' },
        { userId: 'user1', date: new Date('2024-01-04'), title: '休暇', startTime: '00:00', endTime: '24:00' },
        { userId: 'user1', date: new Date('2024-01-05'), title: '休暇', startTime: '00:00', endTime: '24:00' }
      ];

      const result = service.validateTaskFeasibility(
        mockTask,
        mockAssignee,
        mockCompanyCalendar,
        userSchedules
      );

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('NO_WORKING_DAYS');
      expect(result?.assigneeId).toBe('user1');
      expect(result?.assigneeName).toBe('Test User');
    });

    it('担当者が未割当の場合は会社休日のみで判定する', () => {
      const result = service.validateTaskFeasibility(
        mockTask,
        undefined,
        mockCompanyCalendar,
        []
      );

      expect(result).toBeNull();
    });

    it('タスクの期間が未設定の場合はnullを返す', () => {
      const taskWithoutPeriod = Task.reconstruct({
        id: 2,
        taskNo: TaskNo.create('TASK-002'),
        wbsId: 1,
        name: 'Task without period',
        status: TaskStatus.NotStarted
      });

      const result = service.validateTaskFeasibility(
        taskWithoutPeriod,
        mockAssignee,
        mockCompanyCalendar,
        []
      );

      expect(result).toBeNull();
    });

    it('週末のみのタスクで会社休日でない場合は警告を返さない', () => {
      const weekendTask = Task.reconstruct({
        id: 3,
        taskNo: TaskNo.create('TASK-003'),
        wbsId: 1,
        name: 'Weekend Task',
        assigneeId: 1,
        status: TaskStatus.NotStarted,
        periods: [
          Period.reconstruct({
            id: 3,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-06'), // 土曜日
            endDate: new Date('2024-01-07'), // 日曜日
            kosuu: 16
          })
        ]
      });

      // 週末を会社休日として設定
      const holidays: CompanyHoliday[] = [
        { date: new Date('2024-01-06'), name: '土曜日', type: 'COMPANY' },
        { date: new Date('2024-01-07'), name: '日曜日', type: 'COMPANY' }
      ];
      const holidayCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), holidays);

      const result = service.validateTaskFeasibility(
        weekendTask,
        mockAssignee,
        holidayCalendar,
        []
      );

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('NO_WORKING_DAYS');
    });
  });

  describe('validateTasksFeasibility', () => {
    it('複数タスクの実現可能性を一括検証する', () => {
      const task1 = Task.reconstruct({
        id: 1,
        taskNo: TaskNo.create('TASK-001'),
        wbsId: 1,
        name: 'Task 1',
        assigneeId: 1,
        status: TaskStatus.NotStarted,
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

      const task2 = Task.reconstruct({
        id: 2,
        taskNo: TaskNo.create('TASK-002'),
        wbsId: 1,
        name: 'Task 2',
        assigneeId: 2,
        status: TaskStatus.NotStarted,
        periods: [
          Period.reconstruct({
            id: 2,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-05'),
            kosuu: 32
          })
        ]
      });

      const tasks = [task1, task2];

      const assignee1 = WbsAssignee.reconstruct({
        id: 1,
        wbsId: 1,
        userId: 'user1',
        userName: 'User 1',
        rate: 0.8
      });

      const assignee2 = WbsAssignee.reconstruct({
        id: 2,
        wbsId: 1,
        userId: 'user2',
        userName: 'User 2',
        rate: 1.0
      });

      const assigneeMap = new Map<number, WbsAssignee>([
        [1, assignee1],
        [2, assignee2]
      ]);

      const userSchedulesMap = new Map<string, UserSchedule[]>([
        ['user1', []],
        ['user2', []]
      ]);

      const result = service.validateTasksFeasibility(
        tasks,
        assigneeMap,
        mockCompanyCalendar,
        userSchedulesMap
      );

      expect(result).toHaveLength(0); // 警告なし
    });

    it('一部のタスクが実現不可能な場合は該当タスクの警告のみ返す', () => {
      const task1 = Task.reconstruct({
        id: 1,
        taskNo: TaskNo.create('TASK-001'),
        wbsId: 1,
        name: 'Feasible Task',
        assigneeId: 1,
        status: TaskStatus.NotStarted,
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

      const task2 = Task.reconstruct({
        id: 2,
        taskNo: TaskNo.create('TASK-002'),
        wbsId: 1,
        name: 'Infeasible Task',
        assigneeId: 2,
        status: TaskStatus.NotStarted,
        periods: [
          Period.reconstruct({
            id: 2,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-06'),
            endDate: new Date('2024-01-07'),
            kosuu: 16
          })
        ]
      });

      const tasks = [task1, task2];

      const assignee1 = WbsAssignee.reconstruct({
        id: 1,
        wbsId: 1,
        userId: 'user1',
        userName: 'User 1',
        rate: 0.8
      });

      const assignee2 = WbsAssignee.reconstruct({
        id: 2,
        wbsId: 1,
        userId: 'user2',
        userName: 'User 2',
        rate: 1.0
      });

      const assigneeMap = new Map<number, WbsAssignee>([
        [1, assignee1],
        [2, assignee2]
      ]);

      // user2の週末を全て休暇にする
      const userSchedulesMap = new Map<string, UserSchedule[]>([
        ['user1', []],
        ['user2', [
          { userId: 'user2', date: new Date('2024-01-06'), title: '休暇', startTime: '00:00', endTime: '24:00' },
          { userId: 'user2', date: new Date('2024-01-07'), title: '休暇', startTime: '00:00', endTime: '24:00' }
        ]]
      ]);

      // 週末を会社休日にする
      const holidays = [
        CompanyHoliday.create(new Date('2024-01-06'), '土曜日'),
        CompanyHoliday.create(new Date('2024-01-07'), '日曜日')
      ];
      const holidayCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), holidays);

      const result = service.validateTasksFeasibility(
        tasks,
        assigneeMap,
        holidayCalendar,
        userSchedulesMap
      );

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe(2);
      expect(result[0].taskNo).toBe('TASK-002');
      expect(result[0].taskName).toBe('Infeasible Task');
      expect(result[0].reason).toBe('NO_WORKING_DAYS');
    });

    it('担当者が見つからない場合でも処理を継続する', () => {
      const task = Task.reconstruct({
        id: 1,
        taskNo: TaskNo.create('TASK-001'),
        wbsId: 1,
        name: 'Task without assignee',
        assigneeId: 999, // 存在しない担当者ID
        status: TaskStatus.NotStarted,
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

      const tasks = [task];
      const assigneeMap = new Map<number, WbsAssignee>();
      const userSchedulesMap = new Map<string, UserSchedule[]>();

      const result = service.validateTasksFeasibility(
        tasks,
        assigneeMap,
        mockCompanyCalendar,
        userSchedulesMap
      );

      expect(result).toHaveLength(0); // 担当者未割当として処理される
    });

    it('個人予定がない担当者でも正しく処理する', () => {
      const task = Task.reconstruct({
        id: 1,
        taskNo: TaskNo.create('TASK-001'),
        wbsId: 1,
        name: 'Task',
        assigneeId: 1,
        status: TaskStatus.NotStarted,
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

      const tasks = [task];

      const assignee = WbsAssignee.reconstruct({
        id: 1,
        wbsId: 1,
        userId: 'user1',
        userName: 'User 1',
        rate: 0.8
      });

      const assigneeMap = new Map<number, WbsAssignee>([[1, assignee]]);
      const userSchedulesMap = new Map<string, UserSchedule[]>(); // 個人予定なし

      const result = service.validateTasksFeasibility(
        tasks,
        assigneeMap,
        mockCompanyCalendar,
        userSchedulesMap
      );

      expect(result).toHaveLength(0); // 警告なし
    });
  });
});