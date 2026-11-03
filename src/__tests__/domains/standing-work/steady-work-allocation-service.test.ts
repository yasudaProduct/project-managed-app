import { SteadyWorkAllocationService } from '@/domains/standing-work/steady-work-allocation-service';
import { SteadyWorkPlan } from '@/domains/standing-work/steady-work-plan';
import { WorkloadCalculationService } from '@/domains/assignee-workload/workload-calculation-service';
import { DailyWorkAllocation } from '@/domains/assignee-workload/daily-work-allocation';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';

/**
 * 定常枠から日別負荷への展開（docs/plans/non-project-work-management.md §6.4, §11.1）。
 * - PER_DAY: 稼働日（会社休日・全日休暇でない日）に固定値。半休などで稼働が減っても減らさない
 * - PER_MONTH: 月額 × 当日の稼働可能時間 ÷ その月の稼働可能時間合計
 * - 参画率は見ない（rate=1 のカレンダー）
 * - 通常タスク分（WorkloadCalculationService）の日別配分に合流できる
 */
describe('SteadyWorkAllocationService', () => {
  // 2026-05-25(月)〜2026-05-29(金)。5月の祝日は 5/4〜5/6（GW）のみ。土日: 23,24,30,31
  const MON = new Date(2026, 4, 25);
  const TUE = new Date(2026, 4, 26);
  const WED = new Date(2026, 4, 27);
  const THU = new Date(2026, 4, 28);
  const FRI = new Date(2026, 4, 29);
  const SAT = new Date(2026, 4, 30);
  const SUN = new Date(2026, 4, 31);

  let service: SteadyWorkAllocationService;
  let companyCalendar: CompanyCalendar;

  beforeEach(() => {
    service = new SteadyWorkAllocationService();
    companyCalendar = new CompanyCalendar(7.5);
  });

  const assignee = (rate = 1, userId = 'user-1') => WbsAssignee.create({ wbsId: 1, userId, rate });

  const plan = (args: {
    taskId?: number;
    unit: 'PER_DAY' | 'PER_MONTH';
    hours: number;
    validFrom?: Date;
    validTo?: Date;
  }) =>
    SteadyWorkPlan.create({
      taskId: args.taskId ?? 10,
      unit: args.unit,
      hours: args.hours,
      validFrom: args.validFrom ?? new Date(2026, 0, 1),
      validTo: args.validTo,
    });

  const steadyTask = (args: { taskId?: number; name?: string; plans: SteadyWorkPlan[] }) => ({
    taskId: args.taskId ?? 10,
    taskName: args.name ?? '保守対応',
    plans: args.plans,
  });

  const schedule = (overrides: Partial<UserSchedule> & { date: Date }): UserSchedule => ({
    id: 1,
    userId: 'user-1',
    startTime: '09:00',
    endTime: '10:00',
    title: '会議',
    ...overrides,
  });

  const hoursOf = (daily: DailyWorkAllocation[], date: Date) =>
    daily.find((item) => item.date.toDateString() === date.toDateString())!.allocatedHours;

  describe('calculateDailyAllocations（PER_DAY）', () => {
    it('期間の日数分を返し、稼働日に固定値を配分し、土日は0になること', () => {
      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 1 })] })],
        assignee(),
        [],
        companyCalendar,
        MON,
        SUN
      );

      expect(result).toHaveLength(7);
      expect(hoursOf(result, MON)).toBe(1);
      expect(hoursOf(result, FRI)).toBe(1);
      expect(hoursOf(result, SAT)).toBe(0);
      expect(hoursOf(result, SUN)).toBe(0);
      const sat = result.find((item) => item.date.toDateString() === SAT.toDateString())!;
      expect(sat.isWeekend).toBe(true);
      expect(sat.availableHours).toBe(0);
      expect(sat.taskAllocations).toHaveLength(0);
    });

    it('タスク配分にタスクID・名前・枠の時間と有効期間を載せること', () => {
      const result = service.calculateDailyAllocations(
        [
          steadyTask({
            taskId: 42,
            name: '社内雑務',
            plans: [plan({ taskId: 42, unit: 'PER_DAY', hours: 0.5, validFrom: new Date(2026, 3, 1), validTo: new Date(2027, 2, 31) })],
          }),
        ],
        assignee(),
        [],
        companyCalendar,
        MON,
        MON
      );

      const allocation = result[0].taskAllocations[0];
      expect(allocation.taskId).toBe('42');
      expect(allocation.taskName).toBe('社内雑務');
      expect(allocation.allocatedHours).toBe(0.5);
      expect(allocation.totalHours).toBe(0.5);
      expect(allocation.periodStart).toEqual(new Date(2026, 3, 1));
      expect(allocation.periodEnd).toEqual(new Date(2027, 2, 31));
      expect(allocation.projectName).toBeUndefined();
    });

    it('会社休日は配分しないこと', () => {
      companyCalendar.addCompanyHoliday({ date: WED, name: '創立記念日', type: 'COMPANY' });

      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 1 })] })],
        assignee(),
        [],
        companyCalendar,
        MON,
        FRI
      );

      expect(hoursOf(result, WED)).toBe(0);
      expect(result.find((item) => item.date.toDateString() === WED.toDateString())!.isCompanyHoliday).toBe(true);
      expect(hoursOf(result, THU)).toBe(1);
    });

    it('全日休暇の日は配分しないこと', () => {
      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 1 })] })],
        assignee(),
        [schedule({ date: TUE, title: '休暇', startTime: '00:00', endTime: '00:00' })],
        companyCalendar,
        MON,
        FRI
      );

      expect(hoursOf(result, TUE)).toBe(0);
      expect(hoursOf(result, MON)).toBe(1);
    });

    it('半休や会議で稼働が減る日でも固定値のまま配分し、稼働可能時間は個人予定を控除すること', () => {
      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 1 })] })],
        assignee(),
        [schedule({ date: TUE, title: '会議', startTime: '13:00', endTime: '15:00' })],
        companyCalendar,
        TUE,
        TUE
      );

      expect(result[0].allocatedHours).toBe(1);
      expect(result[0].availableHours).toBe(5.5);
      expect(result[0].userSchedules).toEqual([
        { title: '会議', startTime: '13:00', endTime: '15:00', durationHours: 2 },
      ]);
    });

    it('参画率は見ない（参画率0.5でも固定値をそのまま配分し、稼働可能時間は標準勤務時間）こと', () => {
      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 1 })] })],
        assignee(0.5),
        [],
        companyCalendar,
        MON,
        MON
      );

      expect(result[0].allocatedHours).toBe(1);
      expect(result[0].availableHours).toBe(7.5);
    });

    it('有効期間外の日には配分しないこと（開始日・終了日は含む）', () => {
      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 1, validFrom: TUE, validTo: THU })] })],
        assignee(),
        [],
        companyCalendar,
        MON,
        FRI
      );

      expect(hoursOf(result, MON)).toBe(0);
      expect(hoursOf(result, TUE)).toBe(1);
      expect(hoursOf(result, THU)).toBe(1);
      expect(hoursOf(result, FRI)).toBe(0);
    });

    it('同じタスクの連続する枠は、日付に応じて有効な枠の値を使うこと', () => {
      const result = service.calculateDailyAllocations(
        [
          steadyTask({
            plans: [
              plan({ unit: 'PER_DAY', hours: 2, validFrom: new Date(2026, 0, 1), validTo: TUE }),
              plan({ unit: 'PER_DAY', hours: 1, validFrom: WED }),
            ],
          }),
        ],
        assignee(),
        [],
        companyCalendar,
        MON,
        FRI
      );

      expect(hoursOf(result, MON)).toBe(2);
      expect(hoursOf(result, TUE)).toBe(2);
      expect(hoursOf(result, WED)).toBe(1);
      expect(hoursOf(result, FRI)).toBe(1);
    });

    it('複数の定常タスクは別々のタスク配分として合計されること', () => {
      const result = service.calculateDailyAllocations(
        [
          steadyTask({ taskId: 10, name: '保守', plans: [plan({ taskId: 10, unit: 'PER_DAY', hours: 1 })] }),
          steadyTask({ taskId: 11, name: '雑務', plans: [plan({ taskId: 11, unit: 'PER_DAY', hours: 0.5 })] }),
        ],
        assignee(),
        [],
        companyCalendar,
        MON,
        MON
      );

      expect(result[0].taskAllocations.map((item) => item.taskId)).toEqual(['10', '11']);
      expect(result[0].allocatedHours).toBe(1.5);
    });

    it('時間 0 の枠はタスク配分を作らないこと', () => {
      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 0 })] })],
        assignee(),
        [],
        companyCalendar,
        MON,
        MON
      );

      expect(result[0].taskAllocations).toHaveLength(0);
    });
  });

  describe('calculateDailyAllocations（PER_MONTH）', () => {
    it('月額をその月の稼働可能時間の比で日別に按分すること', () => {
      // 2026年5月の稼働日は18日（土日10日・祝日 5/4〜5/6 を除く）→ 稼働可能時間 135h
      expect(companyCalendar.countWorkingDays(new Date(2026, 4, 1), new Date(2026, 4, 31))).toBe(18);

      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_MONTH', hours: 27 })] })],
        assignee(),
        [],
        companyCalendar,
        MON,
        SUN
      );

      // 27h × 7.5 ÷ 135 = 1.5h/日
      expect(hoursOf(result, MON)).toBeCloseTo(1.5, 6);
      expect(hoursOf(result, FRI)).toBeCloseTo(1.5, 6);
      expect(hoursOf(result, SAT)).toBe(0);
      expect(result.find((item) => item.date.toDateString() === MON.toDateString())!.taskAllocations[0].totalHours).toBe(27);
    });

    it('全日休暇の日は0になり、その分は同じ月の他の稼働日に多く配分されること', () => {
      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_MONTH', hours: 27 })] })],
        assignee(),
        [schedule({ date: TUE, title: '休暇', startTime: '00:00', endTime: '00:00' })],
        companyCalendar,
        MON,
        FRI
      );

      // 稼働可能時間合計 = 135 − 7.5 = 127.5h → 27 × 7.5 ÷ 127.5
      expect(hoursOf(result, TUE)).toBe(0);
      expect(hoursOf(result, MON)).toBeCloseTo((27 * 7.5) / 127.5, 6);
    });

    it('有効期間が月の途中から始まる場合も分母は月全体のまま按分すること', () => {
      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_MONTH', hours: 27, validFrom: WED })] })],
        assignee(),
        [],
        companyCalendar,
        MON,
        FRI
      );

      expect(hoursOf(result, TUE)).toBe(0);
      expect(hoursOf(result, WED)).toBeCloseTo(1.5, 6);
    });

    it('月をまたぐ範囲では月ごとに分母を計算すること', () => {
      // 2026年6月: 30日、土日 8日、祝日なし → 稼働日22日 → 165h。6/1(月)
      const JUN1 = new Date(2026, 5, 1);
      expect(companyCalendar.countWorkingDays(JUN1, new Date(2026, 5, 30))).toBe(22);

      const result = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_MONTH', hours: 33 })] })],
        assignee(),
        [],
        companyCalendar,
        FRI,
        JUN1
      );

      expect(hoursOf(result, FRI)).toBeCloseTo((33 * 7.5) / 135, 6);
      expect(hoursOf(result, JUN1)).toBeCloseTo((33 * 7.5) / 165, 6);
    });
  });

  describe('mergeDailyAllocations', () => {
    const task = (args: { id: number; startDate: Date; endDate: Date; kosu: number }): Task =>
      Task.create({
        taskNo: TaskNo.reconstruct(`TASK-${args.id}`),
        wbsId: 1,
        name: `タスク${args.id}`,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [
          Period.create({
            startDate: args.startDate,
            endDate: args.endDate,
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({ kosu: args.kosu, type: new ManHourType({ type: 'NORMAL' }) })],
          }),
        ],
      });

    it('通常タスクの日別配分に定常枠の配分を日付ごとに合流させ、元の配列は変更しないこと', () => {
      const base = new WorkloadCalculationService().calculateDailyAllocations(
        [task({ id: 1, startDate: MON, endDate: FRI, kosu: 10 })],
        assignee(),
        [],
        companyCalendar,
        MON,
        FRI
      );
      const steady = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 1 })] })],
        assignee(),
        [],
        companyCalendar,
        MON,
        FRI
      );

      const merged = service.mergeDailyAllocations(base, steady);

      expect(merged).toHaveLength(5);
      expect(hoursOf(merged, MON)).toBeCloseTo(3, 6);
      expect(merged[0].taskAllocations.map((item) => item.taskId)).toEqual(['0', '10']);
      expect(merged[0].availableHours).toBe(7.5);
      // 元の配列は変更されない
      expect(hoursOf(base, MON)).toBeCloseTo(2, 6);
      expect(base[0].taskAllocations).toHaveLength(1);
    });

    it('通常タスク側に無い日の定常配分は無視し、定常側に無い日はそのまま残すこと', () => {
      const base = new WorkloadCalculationService().calculateDailyAllocations(
        [],
        assignee(),
        [],
        companyCalendar,
        MON,
        WED
      );
      const steady = service.calculateDailyAllocations(
        [steadyTask({ plans: [plan({ unit: 'PER_DAY', hours: 1 })] })],
        assignee(),
        [],
        companyCalendar,
        TUE,
        FRI
      );

      const merged = service.mergeDailyAllocations(base, steady);

      expect(merged).toHaveLength(3);
      expect(hoursOf(merged, MON)).toBe(0);
      expect(hoursOf(merged, TUE)).toBe(1);
      expect(hoursOf(merged, WED)).toBe(1);
    });
  });
});
