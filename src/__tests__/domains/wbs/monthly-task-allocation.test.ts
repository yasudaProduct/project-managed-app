import { MonthlyTaskAllocation, TaskForAllocation, formatYearMonth } from '@/domains/wbs/monthly-task-allocation';
import { BusinessDayPeriod } from '@/domains/calendar/business-day-period';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { getDefaultStandardWorkingHours } from '@/__tests__/helpers/system-settings-helper';

describe('MonthlyTaskAllocation', () => {
  describe('createSingleMonth', () => {
    it('単月タスクの按分結果を生成できる', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        phase: 'フェーズA',
        yoteiStart: new Date('2025-01-10'),
        yoteiEnd: new Date('2025-01-20'),
        yoteiKosu: 10.0,
        jissekiKosu: 8.0
      };

      const yearMonth = '2025/01';
      const allocation = MonthlyTaskAllocation.createSingleMonth(task, yearMonth);

      expect(allocation.task).toBe(task);
      expect(allocation.getMonths()).toEqual(['2025/01']);

      const detail = allocation.getAllocation('2025/01');
      expect(detail).toBeDefined();
      expect(detail!.plannedHours).toBe(10.0);
      expect(detail!.actualHours).toBe(8.0);
      expect(detail!.workingDays).toBe(1);
      expect(detail!.availableHours).toBe(7.5);
      expect(detail!.allocationRatio).toBe(1.0);
    });

    it('実績工数がない場合は0として扱う', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-10'),
        yoteiKosu: 10.0
      };

      const yearMonth = '2025/01';
      const allocation = MonthlyTaskAllocation.createSingleMonth(task, yearMonth);

      const detail = allocation.getAllocation('2025/01');
      expect(detail!.actualHours).toBe(0);
    });
  });

  describe('createMultiMonth', () => {
    it('複数月タスクの按分結果を生成できる', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        phase: 'フェーズA',
        yoteiStart: new Date('2025-01-15'),
        yoteiEnd: new Date('2025-03-15'),
        yoteiKosu: 30.0,
        jissekiKosu: 10.0
      };

      const allocatedHours = new Map<string, number>([
        ['2025/01', 10.0],
        ['2025/02', 15.0],
        ['2025/03', 5.0]
      ]);

      // モックの BusinessDayPeriod を作成
      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });
      const companyCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), []);
      const period = new BusinessDayPeriod(
        task.yoteiStart,
        task.yoteiEnd!,
        assignee,
        companyCalendar,
        []
      );

      const allocation = MonthlyTaskAllocation.createMultiMonth(task, allocatedHours, period);

      expect(allocation.task).toBe(task);
      expect(allocation.getMonths()).toEqual(['2025/01', '2025/02', '2025/03']);

      // 開始月の実績工数は計上される
      const jan = allocation.getAllocation('2025/01');
      expect(jan!.plannedHours).toBe(10.0);
      expect(jan!.actualHours).toBe(10.0); // 開始月のみ実績工数が計上

      // その他の月の実績工数は0
      const feb = allocation.getAllocation('2025/02');
      expect(feb!.plannedHours).toBe(15.0);
      expect(feb!.actualHours).toBe(0);

      const mar = allocation.getAllocation('2025/03');
      expect(mar!.plannedHours).toBe(5.0);
      expect(mar!.actualHours).toBe(0);
    });

    it('実績工数は開始月のみに計上される（ビジネスルール）', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-02-10'),
        yoteiEnd: new Date('2025-04-10'),
        yoteiKosu: 30.0,
        jissekiKosu: 12.0
      };

      const allocatedHours = new Map<string, number>([
        ['2025/02', 10.0],
        ['2025/03', 15.0],
        ['2025/04', 5.0]
      ]);

      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });
      const companyCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), []);
      const period = new BusinessDayPeriod(
        task.yoteiStart,
        task.yoteiEnd!,
        assignee,
        companyCalendar,
        []
      );

      const allocation = MonthlyTaskAllocation.createMultiMonth(task, allocatedHours, period);

      // 開始月（2025/02）のみ実績工数が計上される
      expect(allocation.getAllocation('2025/02')!.actualHours).toBe(12.0);
      expect(allocation.getAllocation('2025/03')!.actualHours).toBe(0);
      expect(allocation.getAllocation('2025/04')!.actualHours).toBe(0);
    });
  });

  describe('getMonths', () => {
    it('すべての月を昇順で取得できる', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-10'),
        yoteiKosu: 10.0
      };

      const allocatedHours = new Map<string, number>([
        ['2025/03', 5.0],
        ['2025/01', 10.0],
        ['2025/02', 15.0]
      ]);

      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });
      const companyCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), []);
      const period = new BusinessDayPeriod(
        task.yoteiStart,
        new Date('2025-03-31'),
        assignee,
        companyCalendar,
        []
      );

      const allocation = MonthlyTaskAllocation.createMultiMonth(task, allocatedHours, period);

      // 昇順でソートされて返される
      expect(allocation.getMonths()).toEqual(['2025/01', '2025/02', '2025/03']);
    });
  });

  describe('getAllocation', () => {
    it('指定月の按分データを取得できる', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-10'),
        yoteiKosu: 10.0
      };

      const allocation = MonthlyTaskAllocation.createSingleMonth(task, '2025/01');

      const detail = allocation.getAllocation('2025/01');
      expect(detail).toBeDefined();
      expect(detail!.plannedHours).toBe(10.0);
    });

    it('存在しない月を指定した場合はundefinedを返す', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-10'),
        yoteiKosu: 10.0
      };

      const allocation = MonthlyTaskAllocation.createSingleMonth(task, '2025/01');

      const detail = allocation.getAllocation('2025/02');
      expect(detail).toBeUndefined();
    });
  });

  describe('getTotalPlannedHours', () => {
    it('予定工数の合計を取得できる', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-10'),
        yoteiEnd: new Date('2025-03-10'),
        yoteiKosu: 30.0
      };

      const allocatedHours = new Map<string, number>([
        ['2025/01', 10.0],
        ['2025/02', 15.0],
        ['2025/03', 5.0]
      ]);

      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });
      const companyCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), []);
      const period = new BusinessDayPeriod(
        task.yoteiStart,
        task.yoteiEnd!,
        assignee,
        companyCalendar,
        []
      );

      const allocation = MonthlyTaskAllocation.createMultiMonth(task, allocatedHours, period);

      expect(allocation.getTotalPlannedHours()).toBe(30.0);
    });
  });

  describe('getTotalActualHours', () => {
    it('実績工数の合計を取得できる', () => {
      const task: TaskForAllocation = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-10'),
        yoteiEnd: new Date('2025-03-10'),
        yoteiKosu: 30.0,
        jissekiKosu: 12.0
      };

      const allocatedHours = new Map<string, number>([
        ['2025/01', 10.0],
        ['2025/02', 15.0],
        ['2025/03', 5.0]
      ]);

      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });
      const companyCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), []);
      const period = new BusinessDayPeriod(
        task.yoteiStart,
        task.yoteiEnd!,
        assignee,
        companyCalendar,
        []
      );

      const allocation = MonthlyTaskAllocation.createMultiMonth(task, allocatedHours, period);

      // 実績工数は開始月のみに計上されるため、合計は12.0
      expect(allocation.getTotalActualHours()).toBe(12.0);
    });
  });
});

describe('formatYearMonth', () => {
  it('日付を年月フォーマットに変換できる', () => {
    expect(formatYearMonth(new Date('2025-01-10'))).toBe('2025/01');
    expect(formatYearMonth(new Date('2025-12-31'))).toBe('2025/12');
    expect(formatYearMonth(new Date('2024-03-15'))).toBe('2024/03');
  });

  it('1桁の月をゼロパディングする', () => {
    expect(formatYearMonth(new Date('2025-01-10'))).toBe('2025/01');
    expect(formatYearMonth(new Date('2025-02-10'))).toBe('2025/02');
    expect(formatYearMonth(new Date('2025-09-10'))).toBe('2025/09');
  });
});
