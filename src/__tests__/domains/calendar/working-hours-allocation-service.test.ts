import { WorkingHoursAllocationService, TaskForAllocation } from '@/domains/calendar/working-hours-allocation.service';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';

describe('WorkingHoursAllocationService', () => {
  let companyCalendar: CompanyCalendar;
  let service: WorkingHoursAllocationService;
  let assignee: WbsAssignee;

  beforeEach(() => {
    companyCalendar = new CompanyCalendar(8);
    service = new WorkingHoursAllocationService(companyCalendar);
    assignee = WbsAssignee.create({ wbsId: 1, userId: 'user-1', rate: 1.0 });
  });

  describe('allocateTaskHoursByAssigneeWorkingDays', () => {
    it('単月タスクの工数が正しく按分される', () => {
      const task: TaskForAllocation = {
        yoteiStart: new Date(2026, 4, 25), // 月曜
        yoteiEnd: new Date(2026, 4, 29),   // 金曜
        yoteiKosu: 40,
      };

      const result = service.allocateTaskHoursByAssigneeWorkingDays(task, assignee, []);

      expect(result.size).toBe(1);
      expect(result.get('2026/05')).toBe(40);
    });

    it('複数月にまたがるタスクが稼働可能時間比率で按分される', () => {
      const task: TaskForAllocation = {
        yoteiStart: new Date(2026, 4, 25), // 5/25（月）
        yoteiEnd: new Date(2026, 5, 5),    // 6/5（金）
        yoteiKosu: 100,
      };

      const result = service.allocateTaskHoursByAssigneeWorkingDays(task, assignee, []);

      expect(result.size).toBe(2);
      const total = Array.from(result.values()).reduce((sum, h) => sum + h, 0);
      expect(total).toBeCloseTo(100, 2);
    });

    it('終了日が未設定の場合は開始日と同じとして扱う', () => {
      const task: TaskForAllocation = {
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: undefined as unknown as Date,
        yoteiKosu: 10,
      };

      const result = service.allocateTaskHoursByAssigneeWorkingDays(task, assignee, []);

      expect(result.size).toBe(1);
      expect(result.get('2026/05')).toBe(10);
    });
  });

  describe('allocateMultipleTasksHours', () => {
    it('複数タスクの月別按分が正しく集計される', () => {
      const tasks: TaskForAllocation[] = [
        {
          yoteiStart: new Date(2026, 4, 25),
          yoteiEnd: new Date(2026, 4, 29),
          yoteiKosu: 20,
        },
        {
          yoteiStart: new Date(2026, 4, 25),
          yoteiEnd: new Date(2026, 4, 29),
          yoteiKosu: 30,
        },
      ];

      const result = service.allocateMultipleTasksHours(tasks, assignee, []);

      expect(result.has('2026/05')).toBe(true);
      const mayAllocations = result.get('2026/05')!;
      expect(mayAllocations.size).toBe(2);

      // 各タスクの工数が正しく設定されている
      const allocatedValues = Array.from(mayAllocations.values());
      expect(allocatedValues).toContain(20);
      expect(allocatedValues).toContain(30);
    });

    it('異なる月のタスクが別々に管理される', () => {
      const tasks: TaskForAllocation[] = [
        {
          yoteiStart: new Date(2026, 4, 25),
          yoteiEnd: new Date(2026, 4, 29),
          yoteiKosu: 20,
        },
        {
          yoteiStart: new Date(2026, 5, 1),
          yoteiEnd: new Date(2026, 5, 5),
          yoteiKosu: 30,
        },
      ];

      const result = service.allocateMultipleTasksHours(tasks, assignee, []);

      expect(result.has('2026/05')).toBe(true);
      expect(result.has('2026/06')).toBe(true);
      expect(result.get('2026/05')!.size).toBe(1);
      expect(result.get('2026/06')!.size).toBe(1);
    });
  });

  describe('getTotalAllocatedHoursByMonth', () => {
    it('月別合計工数が正しく集計される', () => {
      const tasks: TaskForAllocation[] = [
        {
          yoteiStart: new Date(2026, 4, 25),
          yoteiEnd: new Date(2026, 4, 29),
          yoteiKosu: 20,
        },
        {
          yoteiStart: new Date(2026, 4, 25),
          yoteiEnd: new Date(2026, 4, 29),
          yoteiKosu: 30,
        },
      ];

      const result = service.getTotalAllocatedHoursByMonth(tasks, assignee, []);

      expect(result.get('2026/05')).toBe(50);
    });

    it('空のタスクリストは空のMapを返す', () => {
      const result = service.getTotalAllocatedHoursByMonth([], assignee, []);
      expect(result.size).toBe(0);
    });
  });

  describe('allocateTaskWithDetails', () => {
    it('単月タスクはcreateSingleMonthで生成される', () => {
      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: new Date(2026, 4, 29),
        yoteiKosu: 40,
      };

      const result = service.allocateTaskWithDetails(task, assignee, []);
      const allocations = result.getMonthlyAllocations();

      expect(allocations).toHaveLength(1);
      expect(allocations[0].month).toBe('2026/05');
      expect(allocations[0].allocatedPlannedHours).toBe(40);
    });

    it('yoteiEndが未設定の場合は単月タスクとして扱われる', () => {
      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiKosu: 10,
      };

      const result = service.allocateTaskWithDetails(task, assignee, []);
      const allocations = result.getMonthlyAllocations();

      expect(allocations).toHaveLength(1);
      expect(allocations[0].allocatedPlannedHours).toBe(10);
    });

    it('複数月タスクの予定工数が按分される', () => {
      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: new Date(2026, 5, 5),
        yoteiKosu: 100,
      };

      const result = service.allocateTaskWithDetails(task, assignee, []);
      const allocations = result.getMonthlyAllocations();

      expect(allocations.length).toBeGreaterThan(1);
      const total = allocations.reduce((sum, a) => sum + a.allocatedPlannedHours, 0);
      expect(total).toBeCloseTo(100, 2);
    });

    it('見通し工数が設定されている場合は按分される', () => {
      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: new Date(2026, 5, 5),
        yoteiKosu: 100,
        forecastKosu: 120,
      };

      const result = service.allocateTaskWithDetails(task, assignee, []);
      const allocations = result.getMonthlyAllocations();

      const totalForecast = allocations.reduce((sum, a) => sum + a.allocatedForecastHours, 0);
      expect(totalForecast).toBeCloseTo(120, 2);
    });

    it('見通し工数が0の場合は按分されない', () => {
      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: new Date(2026, 5, 5),
        yoteiKosu: 100,
        forecastKosu: 0,
      };

      const result = service.allocateTaskWithDetails(task, assignee, []);
      const allocations = result.getMonthlyAllocations();

      allocations.forEach((a) => {
        expect(a.allocatedForecastHours).toBe(0);
      });
    });

    it('基準工数が設定されている場合は按分される', () => {
      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: new Date(2026, 5, 5),
        yoteiKosu: 100,
        kijunStart: new Date(2026, 4, 1),
        kijunEnd: new Date(2026, 5, 30),
        kijunKosu: 80,
      };

      const result = service.allocateTaskWithDetails(task, assignee, []);
      const allocations = result.getMonthlyAllocations();

      const totalBaseline = allocations.reduce((sum, a) => sum + a.allocatedBaselineHours, 0);
      expect(totalBaseline).toBeCloseTo(80, 2);
    });

    it('基準期間が単月の場合はその月に全額計上される', () => {
      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: new Date(2026, 5, 5),
        yoteiKosu: 100,
        kijunStart: new Date(2026, 4, 1),
        kijunEnd: new Date(2026, 4, 31),
        kijunKosu: 80,
      };

      const result = service.allocateTaskWithDetails(task, assignee, []);
      const mayAllocation = result.getAllocation('2026/05');

      expect(mayAllocation?.baselineHours).toBe(80);
    });

    it('担当者未割当の場合はダミー担当者で按分される', () => {
      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: new Date(2026, 5, 5),
        yoteiKosu: 100,
      };

      const result = service.allocateTaskWithDetails(task, undefined, []);
      const allocations = result.getMonthlyAllocations();

      const total = allocations.reduce((sum, a) => sum + a.allocatedPlannedHours, 0);
      expect(total).toBeCloseTo(100, 2);
    });

    it('個人予定がある場合に按分比率が調整される', () => {
      const schedule: UserSchedule = {
        id: 1,
        userId: 'user-1',
        date: new Date(2026, 4, 26), // 5/26（火）
        startTime: '09:00',
        endTime: '17:00',
        title: '有給',
      };

      const task = {
        wbsId: 1,
        taskId: 'TASK-001',
        taskName: 'テスト',
        yoteiStart: new Date(2026, 4, 25),
        yoteiEnd: new Date(2026, 5, 5),
        yoteiKosu: 100,
      };

      const resultWithSchedule = service.allocateTaskWithDetails(task, assignee, [schedule]);
      const resultWithout = service.allocateTaskWithDetails(task, assignee, []);

      const mayWithSchedule = resultWithSchedule.getAllocation('2026/05');
      const mayWithout = resultWithout.getAllocation('2026/05');

      // 有給で5月の稼働可能時間が減るため、5月の按分比率が小さくなる
      expect(mayWithSchedule!.plannedHours).toBeLessThan(mayWithout!.plannedHours);
    });
  });
});
