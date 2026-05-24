import { WorkloadCalculationService } from '@/domains/assignee-workload/workload-calculation.service';
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

describe('WorkloadCalculationService', () => {
  let service: WorkloadCalculationService;
  let companyCalendar: CompanyCalendar;

  beforeEach(() => {
    service = new WorkloadCalculationService();
    companyCalendar = new CompanyCalendar(7.5);
  });

  const createAssignee = (rate = 1.0, userId = 'user-1') =>
    WbsAssignee.create({ wbsId: 1, userId, rate });

  const createTask = (args: {
    id?: number;
    name?: string;
    startDate: Date;
    endDate: Date;
    kosu: number;
  }): Task => {
    return Task.create({
      id: args.id ?? 1,
      taskNo: TaskNo.reconstruct(`TASK-${args.id ?? 1}`),
      wbsId: 1,
      name: args.name ?? 'テストタスク',
      status: new TaskStatus({ status: 'IN_PROGRESS' }),
      periods: [
        Period.create({
          startDate: args.startDate,
          endDate: args.endDate,
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [
            ManHour.create({ kosu: args.kosu, type: new ManHourType({ type: 'NORMAL' }) }),
          ],
        }),
      ],
    });
  };

  const createSchedule = (overrides: Partial<UserSchedule> & { date: Date }): UserSchedule => ({
    id: 1,
    userId: 'user-1',
    startTime: '09:00',
    endTime: '10:00',
    title: '会議',
    ...overrides,
  });

  describe('calculateDailyAllocations', () => {
    it('指定期間の日数分のDailyWorkAllocationを返す', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-25(月)〜2026-05-27(水) = 3日間
      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 27);

      const result = service.calculateDailyAllocations(
        [], assignee, [], companyCalendar, startDate, endDate
      );

      expect(result).toHaveLength(3);
    });

    it('土日はavailableHours=0かつisWeekend=trueを返す', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-23(土)〜2026-05-24(日)
      const startDate = new Date(2026, 4, 23);
      const endDate = new Date(2026, 4, 24);

      const result = service.calculateDailyAllocations(
        [], assignee, [], companyCalendar, startDate, endDate
      );

      expect(result[0].isWeekend).toBe(true);
      expect(result[0].availableHours).toBe(0);
      expect(result[1].isWeekend).toBe(true);
      expect(result[1].availableHours).toBe(0);
    });

    it('会社休日はisCompanyHoliday=trueを返す', () => {
      const calendar = new CompanyCalendar(7.5, [
        { date: new Date(2026, 4, 25), name: '創立記念日', type: 'COMPANY' },
      ]);
      const assignee = createAssignee(1.0);
      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 25);

      const result = service.calculateDailyAllocations(
        [], assignee, [], calendar, startDate, endDate
      );

      expect(result[0].isCompanyHoliday).toBe(true);
      expect(result[0].availableHours).toBe(0);
    });

    it('個人予定がある日は稼働可能時間が減少する', () => {
      const assignee = createAssignee(1.0);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        startTime: '10:00',
        endTime: '12:00',
        title: '会議',
      });
      // 2026-05-25(月)
      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 25);

      const result = service.calculateDailyAllocations(
        [], assignee, [schedule], companyCalendar, startDate, endDate
      );

      // 7.5 - 2 = 5.5
      expect(result[0].availableHours).toBe(5.5);
      expect(result[0].userSchedules).toHaveLength(1);
      expect(result[0].userSchedules[0].durationHours).toBe(2);
    });

    it('参画率が稼働可能時間に反映される', () => {
      const assignee = createAssignee(0.5);
      // 2026-05-25(月)
      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 25);

      const result = service.calculateDailyAllocations(
        [], assignee, [], companyCalendar, startDate, endDate
      );

      // min(7.5, 7.5 * 0.5) = 3.75
      expect(result[0].availableHours).toBe(3.75);
    });

    it('タスクがある場合はtaskAllocationsに配分される', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-25(月)〜2026-05-26(火) = 平日2日
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 26),
        kosu: 15, // 15時間
      });
      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 26);

      const result = service.calculateDailyAllocations(
        [task], assignee, [], companyCalendar, startDate, endDate
      );

      // 各日7.5h稼働、合計15h → 各日7.5h配分
      expect(result[0].taskAllocations).toHaveLength(1);
      expect(result[1].taskAllocations).toHaveLength(1);
      expect(result[0].taskAllocations[0].allocatedHours).toBe(7.5);
      expect(result[1].taskAllocations[0].allocatedHours).toBe(7.5);
    });

    it('タスク期間が表示期間より広い場合も正しく配分される', () => {
      const assignee = createAssignee(1.0);
      // タスク期間: 2026-05-25(月)〜2026-05-29(金) = 5日間
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 29),
        kosu: 37.5, // 5日×7.5h = 37.5h
      });
      // 表示期間は最初の2日のみ
      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 26);

      const result = service.calculateDailyAllocations(
        [task], assignee, [], companyCalendar, startDate, endDate
      );

      // 5日均等配分→各日7.5h
      expect(result[0].taskAllocations[0].allocatedHours).toBe(7.5);
      expect(result[1].taskAllocations[0].allocatedHours).toBe(7.5);
    });
  });

  describe('calculateTaskAllocationsForDate', () => {
    it('アクティブなタスクがない場合は空配列を返す', () => {
      const assignee = createAssignee(1.0);
      const { AssigneeWorkingCalendar } = require('@/domains/calendar/assignee-working-calendar');
      const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      const result = service.calculateTaskAllocationsForDate(
        [], new Date(2026, 4, 25), 7.5, workingCalendar
      );

      expect(result).toEqual([]);
    });

    it('availableHoursが0の場合は空配列を返す', () => {
      const assignee = createAssignee(1.0);
      const { AssigneeWorkingCalendar } = require('@/domains/calendar/assignee-working-calendar');
      const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
        kosu: 10,
      });

      const result = service.calculateTaskAllocationsForDate(
        [task], new Date(2026, 4, 25), 0, workingCalendar
      );

      expect(result).toEqual([]);
    });

    it('稼働可能時間に比例してタスク工数を配分する', () => {
      const assignee = createAssignee(1.0);
      const { AssigneeWorkingCalendar } = require('@/domains/calendar/assignee-working-calendar');
      const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // タスク期間: 2026-05-25(月)〜2026-05-29(金) = 5日間
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 29),
        kosu: 37.5, // 合計37.5h
      });

      // 月曜日の配分を計算
      const result = service.calculateTaskAllocationsForDate(
        [task], new Date(2026, 4, 25), 7.5, workingCalendar
      );

      // 5日間全て7.5h稼働可能 → 合計37.5h → 当日比率=7.5/37.5=0.2 → 配分=37.5*0.2=7.5h
      expect(result).toHaveLength(1);
      expect(result[0].allocatedHours).toBe(7.5);
    });

    it('複数タスクが同日にある場合はそれぞれ配分される', () => {
      const assignee = createAssignee(1.0);
      const { AssigneeWorkingCalendar } = require('@/domains/calendar/assignee-working-calendar');
      const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // 2日間のタスク2つ (2026-05-25(月)〜2026-05-26(火))
      const task1 = createTask({
        id: 1,
        name: 'タスク1',
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 26),
        kosu: 15, // 2日×7.5h
      });
      const task2 = createTask({
        id: 2,
        name: 'タスク2',
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 26),
        kosu: 7.5, // 2日で7.5h
      });

      const result = service.calculateTaskAllocationsForDate(
        [task1, task2], new Date(2026, 4, 25), 7.5, workingCalendar
      );

      expect(result).toHaveLength(2);
      // task1: 15 * (7.5 / 15) = 7.5
      expect(result[0].allocatedHours).toBe(7.5);
      // task2: 7.5 * (7.5 / 15) = 3.75
      expect(result[1].allocatedHours).toBe(3.75);
    });

    it('予定開始日・終了日がないタスクはスキップされる', () => {
      const assignee = createAssignee(1.0);
      const { AssigneeWorkingCalendar } = require('@/domains/calendar/assignee-working-calendar');
      const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // periods が空のタスク
      const task = Task.create({
        id: 1,
        taskNo: TaskNo.reconstruct('TASK-1'),
        wbsId: 1,
        name: 'タスク',
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [],
      });

      const result = service.calculateTaskAllocationsForDate(
        [task], new Date(2026, 4, 25), 7.5, workingCalendar
      );

      expect(result).toEqual([]);
    });

    it('タスク期間内の稼働可能時間が0の場合はスキップされる', () => {
      const assignee = createAssignee(0); // 稼働率0
      const { AssigneeWorkingCalendar } = require('@/domains/calendar/assignee-working-calendar');
      const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 25),
        kosu: 10,
      });

      // availableHours > 0 だが、workingCalendar.getAvailableHours が全日0
      const result = service.calculateTaskAllocationsForDate(
        [task], new Date(2026, 4, 25), 7.5, workingCalendar
      );

      expect(result).toEqual([]);
    });

    it('TaskAllocationにtaskId, taskName, totalHours, periodStart, periodEndが設定される', () => {
      const assignee = createAssignee(1.0);
      const { AssigneeWorkingCalendar } = require('@/domains/calendar/assignee-working-calendar');
      const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 25);
      const task = createTask({
        id: 42,
        name: '重要タスク',
        startDate,
        endDate,
        kosu: 5,
      });

      const result = service.calculateTaskAllocationsForDate(
        [task], new Date(2026, 4, 25), 7.5, workingCalendar
      );

      expect(result[0].taskId).toBe('42');
      expect(result[0].taskName).toBe('重要タスク');
      expect(result[0].totalHours).toBe(5);
      expect(result[0].periodStart).toEqual(startDate);
      expect(result[0].periodEnd).toEqual(endDate);
    });
  });

  describe('isTaskActiveOnDate', () => {
    it('タスク期間内の日付はtrueを返す', () => {
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 27),
        kosu: 10,
      });

      expect(service.isTaskActiveOnDate(task, new Date(2026, 4, 25))).toBe(true);
      expect(service.isTaskActiveOnDate(task, new Date(2026, 4, 26))).toBe(true);
      expect(service.isTaskActiveOnDate(task, new Date(2026, 4, 27))).toBe(true);
    });

    it('タスク期間外の日付はfalseを返す', () => {
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 27),
        kosu: 10,
      });

      expect(service.isTaskActiveOnDate(task, new Date(2026, 4, 24))).toBe(false);
      expect(service.isTaskActiveOnDate(task, new Date(2026, 4, 28))).toBe(false);
    });

    it('予定期間がないタスクはfalseを返す', () => {
      const task = Task.create({
        id: 1,
        taskNo: TaskNo.reconstruct('TASK-1'),
        wbsId: 1,
        name: 'タスク',
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [],
      });

      expect(service.isTaskActiveOnDate(task, new Date(2026, 4, 25))).toBe(false);
    });

    it('YYYY-MM-DDベースで比較するためタイムゾーン情報に影響されない', () => {
      // 時間部分が異なってもYYYY-MM-DDが同じなら期間内と判定
      const task = createTask({
        startDate: new Date('2026-05-25T00:00:00.000Z'),
        endDate: new Date('2026-05-27T23:59:59.999Z'),
        kosu: 10,
      });

      // ローカル日付が2026-05-26なら期間内
      const testDate = new Date(2026, 4, 26);
      expect(service.isTaskActiveOnDate(task, testDate)).toBe(true);
    });
  });

  describe('calculateScheduleDuration', () => {
    it('時間差を正しく計算する', () => {
      expect(service.calculateScheduleDuration('09:00', '17:00')).toBe(8);
    });

    it('30分単位を正しく計算する', () => {
      expect(service.calculateScheduleDuration('09:30', '10:15')).toBe(0.75);
    });

    it('同時刻の場合は0を返す', () => {
      expect(service.calculateScheduleDuration('10:00', '10:00')).toBe(0);
    });

    it('終了が開始より早い場合は負の値を返す', () => {
      // 実装上負の値を返す（バリデーションはcaller側で行う前提）
      expect(service.calculateScheduleDuration('17:00', '09:00')).toBe(-8);
    });
  });

  describe('営業日按分の正確性', () => {
    it('土日を含む期間では平日のみに工数が配分される', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-22(金)〜2026-05-26(火) = 金,土,日,月,火
      const task = createTask({
        startDate: new Date(2026, 4, 22),
        endDate: new Date(2026, 4, 26),
        kosu: 22.5, // 3平日×7.5h
      });
      const startDate = new Date(2026, 4, 22);
      const endDate = new Date(2026, 4, 26);

      const result = service.calculateDailyAllocations(
        [task], assignee, [], companyCalendar, startDate, endDate
      );

      // 金(22),土(23),日(24),月(25),火(26)
      const friday = result[0];
      const saturday = result[1];
      const sunday = result[2];
      const monday = result[3];
      const tuesday = result[4];

      // 土日は配分なし
      expect(saturday.taskAllocations).toHaveLength(0);
      expect(sunday.taskAllocations).toHaveLength(0);

      // 平日3日に均等配分: 22.5 / 3 = 7.5
      expect(friday.taskAllocations[0].allocatedHours).toBe(7.5);
      expect(monday.taskAllocations[0].allocatedHours).toBe(7.5);
      expect(tuesday.taskAllocations[0].allocatedHours).toBe(7.5);
    });

    it('個人予定がある日は他の日に多く配分される', () => {
      const assignee = createAssignee(1.0);
      // 2026-05-25(月)〜2026-05-26(火)
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 26),
        kosu: 10,
      });
      // 月曜に3時間の会議
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        startTime: '10:00',
        endTime: '13:00',
        title: '会議',
      });
      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 26);

      const result = service.calculateDailyAllocations(
        [task], assignee, [schedule], companyCalendar, startDate, endDate
      );

      const monday = result[0]; // 7.5 - 3 = 4.5h稼働可能
      const tuesday = result[1]; // 7.5h稼働可能

      // 合計稼働: 4.5 + 7.5 = 12h
      // 月曜: 10 * (4.5/12) = 3.75
      // 火曜: 10 * (7.5/12) = 6.25
      expect(monday.taskAllocations[0].allocatedHours).toBeCloseTo(3.75, 5);
      expect(tuesday.taskAllocations[0].allocatedHours).toBeCloseTo(6.25, 5);
    });

    it('全期間の配分工数の合計がタスクの予定工数と一致する', () => {
      const assignee = createAssignee(0.8);
      // 2026-05-25(月)〜2026-05-29(金)
      const task = createTask({
        startDate: new Date(2026, 4, 25),
        endDate: new Date(2026, 4, 29),
        kosu: 20,
      });
      const startDate = new Date(2026, 4, 25);
      const endDate = new Date(2026, 4, 29);

      const result = service.calculateDailyAllocations(
        [task], assignee, [], companyCalendar, startDate, endDate
      );

      const totalAllocated = result.reduce((sum, day) => {
        return sum + day.taskAllocations.reduce((s, t) => s + t.allocatedHours, 0);
      }, 0);

      expect(totalAllocated).toBeCloseTo(20, 5);
    });
  });
});
