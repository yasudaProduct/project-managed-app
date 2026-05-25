import { WorkloadWarningService } from '@/domains/assignee-workload/workload-warning.service';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/project-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';

describe('WorkloadWarningService', () => {
  let service: WorkloadWarningService;
  let companyCalendar: CompanyCalendar;

  beforeEach(() => {
    service = new WorkloadWarningService();
    companyCalendar = new CompanyCalendar(7.5);
  });

  const createAssignee = (rate = 1.0, userId = 'user-1', userName = '山田太郎') =>
    WbsAssignee.createFromDb({ id: 1, wbsId: 1, userId, userName, rate, costPerHour: 5000, seq: 1 });

  const createTask = (args: {
    id?: number;
    taskNo?: string;
    name?: string;
    assigneeId?: number;
    startDate: Date;
    endDate: Date;
    kosu?: number;
  }): Task => {
    return Task.create({
      id: args.id ?? 1,
      taskNo: TaskNo.reconstruct(args.taskNo ?? 'TASK-1'),
      wbsId: 1,
      name: args.name ?? 'テストタスク',
      assigneeId: args.assigneeId ?? 1,
      status: new TaskStatus({ status: 'IN_PROGRESS' }),
      periods: [
        Period.create({
          startDate: args.startDate,
          endDate: args.endDate,
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [
            ManHour.create({ kosu: args.kosu ?? 10, type: new ManHourType({ type: 'NORMAL' }) }),
          ],
        }),
      ],
    });
  };

  const createSchedule = (overrides: Partial<UserSchedule> & { date: Date }): UserSchedule => ({
    id: 1,
    userId: 'user-1',
    startTime: '09:00',
    endTime: '17:30',
    title: '会議',
    ...overrides,
  });

  describe('validateTaskFeasibility', () => {
    it('平日のタスクは警告なし（null）を返す', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-25(月) 平日
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
      });

      const result = service.validateTaskFeasibility(task, assignee, companyCalendar, []);
      expect(result).toBeNull();
    });

    it('土日のみのタスクは警告を返す', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-23(土)〜2026-05-24(日)
      const task = createTask({
        id: 5,
        taskNo: 'WARN-1',
        name: '週末タスク',
        startDate: new Date(2026, 4, 23),
        endDate: new Date(2026, 4, 24),
      });

      const result = service.validateTaskFeasibility(task, assignee, companyCalendar, []);

      expect(result).not.toBeNull();
      expect(result!.taskId).toBe(5);
      expect(result!.taskNo).toBe('WARN-1');
      expect(result!.taskName).toBe('週末タスク');
      expect(result!.reason).toBe('NO_WORKING_DAYS');
      expect(result!.assigneeName).toBe('山田太郎');
    });

    it('会社休日のみのタスクは警告を返す', () => {
      const calendar = new CompanyCalendar(7.5, [
        { date: new Date(2026, 4, 25), name: '創立記念日', type: 'COMPANY' },
      ]);
      const assignee = createAssignee(1.0);
      // 2026-05-25(月) だが会社休日
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
      });

      const result = service.validateTaskFeasibility(task, assignee, calendar, []);
      expect(result).not.toBeNull();
      expect(result!.reason).toBe('NO_WORKING_DAYS');
    });

    it('稼働率0の担当者はすべての日が非稼働→警告を返す', () => {
      const assignee = createAssignee(0);
      // 2026-05-25(月) 平日だが稼働率0
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
      });

      const result = service.validateTaskFeasibility(task, assignee, companyCalendar, []);
      expect(result).not.toBeNull();
      expect(result!.reason).toBe('NO_WORKING_DAYS');
    });

    it('全日休暇で埋まったタスクは警告を返す', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-25(月)
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
      });
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        title: '有給',
      });

      const result = service.validateTaskFeasibility(task, assignee, companyCalendar, [schedule]);
      expect(result).not.toBeNull();
      expect(result!.reason).toBe('NO_WORKING_DAYS');
    });

    it('一部稼働可能な日がある場合は警告なし', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-23(土)〜2026-05-25(月) → 月曜は稼働可能
      const task = createTask({
        startDate: new Date(2026, 4, 23),
        endDate: new Date(2026, 4, 25),
      });

      const result = service.validateTaskFeasibility(task, assignee, companyCalendar, []);
      expect(result).toBeNull();
    });

    it('予定期間がないタスクは警告なし（null）を返す', () => {
      const assignee = createAssignee(1.0);
      const task = Task.create({
        id: 1,
        taskNo: TaskNo.reconstruct('TASK-1'),
        wbsId: 1,
        name: 'タスク',
        assigneeId: 1,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [],
      });

      const result = service.validateTaskFeasibility(task, assignee, companyCalendar, []);
      expect(result).toBeNull();
    });

    it('担当者未割当の場合は会社休日のみで判定する', () => {
      // 2026-05-25(月) 平日 → 担当者なしでも稼働日
      const task = createTask({
        assigneeId: undefined,
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
      });

      const result = service.validateTaskFeasibility(task, undefined, companyCalendar, []);
      expect(result).toBeNull();
    });

    it('担当者未割当かつ全日が会社休日の場合は警告を返す', () => {
      // 2026-05-23(土)〜2026-05-24(日) 全日が土日
      const task = createTask({
        id: 3,
        taskNo: 'WARN-3',
        name: '週末タスク',
        assigneeId: undefined,
        startDate: new Date(2026, 4, 23),
        endDate: new Date(2026, 4, 24),
      });

      const result = service.validateTaskFeasibility(task, undefined, companyCalendar, []);
      expect(result).not.toBeNull();
      expect(result!.reason).toBe('NO_WORKING_DAYS');
      expect(result!.assigneeId).toBeUndefined();
      expect(result!.assigneeName).toBeUndefined();
    });

    it('警告にperiodStart/periodEndが含まれる', () => {
      const assignee = createAssignee(1.0);
      const start = new Date(2026, 4, 23);
      const end = new Date(2026, 4, 24);
      const task = createTask({
        startDate: start,
        endDate: end,
      });

      const result = service.validateTaskFeasibility(task, assignee, companyCalendar, []);
      expect(result!.periodStart).toEqual(start);
      expect(result!.periodEnd).toEqual(end);
    });
  });

  describe('validateTasksFeasibility', () => {
    it('複数タスクを一括検証し、問題のあるタスクのみ警告を返す', () => {
      const assignee = createAssignee(1.0);
      const assigneeMap = new Map<number, WbsAssignee>([[1, assignee]]);
      const userSchedulesMap = new Map<string, UserSchedule[]>();

      // 正常タスク: 平日
      const normalTask = createTask({
        id: 1,
        taskNo: 'TASK-1',
        name: '正常タスク',
        assigneeId: 1,
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
      });
      // 問題タスク: 土日のみ
      const problemTask = createTask({
        id: 2,
        taskNo: 'TASK-2',
        name: '問題タスク',
        assigneeId: 1,
        startDate: new Date(2026, 4, 23),
        endDate: new Date(2026, 4, 24),
      });

      const result = service.validateTasksFeasibility(
        [normalTask, problemTask], assigneeMap, companyCalendar, userSchedulesMap
      );

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe(2);
      expect(result[0].taskName).toBe('問題タスク');
    });

    it('担当者がassigneeMapにない場合はundefinedとして処理される', () => {
      const assigneeMap = new Map<number, WbsAssignee>();
      const userSchedulesMap = new Map<string, UserSchedule[]>();

      // assigneeId=99 だが assigneeMap にない
      const task = createTask({
        id: 1,
        assigneeId: 99,
        startDate: new Date(2026, 4, 25), // 平日
        endDate: new Date(2026, 4, 25),
      });

      // 担当者未割当扱い → 会社休日のみで判定 → 平日なので警告なし
      const result = service.validateTasksFeasibility(
        [task], assigneeMap, companyCalendar, userSchedulesMap
      );

      expect(result).toHaveLength(0);
    });

    it('全タスクが正常な場合は空配列を返す', () => {
      const assignee = createAssignee(1.0);
      const assigneeMap = new Map<number, WbsAssignee>([[1, assignee]]);
      const userSchedulesMap = new Map<string, UserSchedule[]>();

      const tasks = [
        createTask({ id: 1, assigneeId: 1, startDate: new Date(2026, 4, 25), endDate: new Date(2026, 4, 25) }),
        createTask({ id: 2, assigneeId: 1, startDate: new Date(2026, 4, 26), endDate: new Date(2026, 4, 26) }),
      ];

      const result = service.validateTasksFeasibility(
        tasks, assigneeMap, companyCalendar, userSchedulesMap
      );

      expect(result).toHaveLength(0);
    });

    it('個人予定をuserSchedulesMapから取得して判定に使用する', () => {
      const assignee = createAssignee(1.0, 'user-1', '山田太郎');
      const assigneeMap = new Map<number, WbsAssignee>([[1, assignee]]);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        userId: 'user-1',
        title: '有給', // 全日休暇
      });
      const userSchedulesMap = new Map<string, UserSchedule[]>([['user-1', [schedule]]]);

      // 2026-05-25(月) 平日だが有給で全日非稼働
      const task = createTask({
        id: 1,
        assigneeId: 1,
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
      });

      const result = service.validateTasksFeasibility(
        [task], assigneeMap, companyCalendar, userSchedulesMap
      );

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe('NO_WORKING_DAYS');
    });
  });
});
