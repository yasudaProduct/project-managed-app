import { WorkingHoursAllocationService } from "@/domains/calendar/working-hours-allocation.service";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import { getDefaultStandardWorkingHours } from "@/__tests__/helpers/system-settings-helper";

describe('WorkingHoursAllocationService', () => {
  let service: WorkingHoursAllocationService;
  let companyCalendar: CompanyCalendar;

  beforeEach(() => {
    companyCalendar = new CompanyCalendar(getDefaultStandardWorkingHours(), []);
    service = new WorkingHoursAllocationService(companyCalendar);
  });

  describe('allocateTaskHoursByAssigneeWorkingDays', () => {
    it('単月タスクの場合、開始月に全工数が計上される', () => {
      const assignee = WbsAssignee.create({ userId: 'user1', rate: 1.0 });
      const task = {
        yoteiStart: new Date('2024-01-15'),
        yoteiEnd: new Date('2024-01-25'),
        yoteiKosu: 100
      };

      const result = service.allocateTaskHoursByAssigneeWorkingDays(
        task,
        assignee,
        []
      );

      expect(result.get('2024/01')).toBe(100);
      expect(result.size).toBe(1);
    });

    it('月跨ぎタスクの場合、営業日数で工数が案分される', () => {
      const assignee = WbsAssignee.create({ userId: 'user1', rate: 1.0 });
      const task = {
        yoteiStart: new Date('2024-01-29'), // 月曜日
        yoteiEnd: new Date('2024-02-02'),   // 金曜日
        yoteiKosu: 100
      };

      const result = service.allocateTaskHoursByAssigneeWorkingDays(
        task,
        assignee,
        []
      );

      // 1月29-31日：3営業日、2月1-2日：2営業日の割合で案分
      expect(result.has('2024/01')).toBe(true);
      expect(result.has('2024/02')).toBe(true);
      expect(result.size).toBe(2);
      
      // 合計は元の工数と一致
      const total = Array.from(result.values()).reduce((sum, hours) => sum + hours, 0);
      expect(total).toBeCloseTo(100);
    });

    it('担当者の稼働率0.5の場合、稼働可能時間が半分になる', () => {
      const assignee = WbsAssignee.create({ userId: 'user1', rate: 0.5 });
      const task = {
        yoteiStart: new Date('2024-01-29'),
        yoteiEnd: new Date('2024-02-02'),
        yoteiKosu: 100
      };

      const result = service.allocateTaskHoursByAssigneeWorkingDays(
        task,
        assignee,
        []
      );

      // 稼働率が半分でも総工数は変わらず案分される
      const total = Array.from(result.values()).reduce((sum, hours) => sum + hours, 0);
      expect(total).toBeCloseTo(100);
    });

    it('担当者の有給休暇を考慮した案分計算', () => {
      const assignee = WbsAssignee.create({ userId: 'user1', rate: 1.0 });
      const task = {
        yoteiStart: new Date('2024-01-15'),
        yoteiEnd: new Date('2024-01-25'),
        yoteiKosu: 100
      };

      // 1月20日に有給取得
      const userSchedules = [{
        id: 1,
        userId: 'user1',
        date: new Date('2024-01-20'),
        startTime: '09:00',
        endTime: '18:00',
        title: '有給休暇'
      }];

      const result = service.allocateTaskHoursByAssigneeWorkingDays(
        task,
        assignee,
        userSchedules
      );

      expect(result.get('2024/01')).toBe(100);
      expect(result.size).toBe(1);
    });
  });

  describe('allocateTaskWithDetails', () => {
    it('単月タスクの詳細な按分結果を取得できる', () => {
      const task = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        phase: 'フェーズA',
        yoteiStart: new Date('2025-01-15'),
        yoteiEnd: new Date('2025-01-25'),
        yoteiKosu: 10.0,
        jissekiKosu: 8.0
      };

      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });

      const result = service.allocateTaskWithDetails(task, assignee, []);

      expect(result.getMonths()).toEqual(['2025/01']);
      expect(result.getTotalPlannedHours()).toBe(10.0);
      expect(result.getTotalActualHours()).toBe(8.0);

      const detail = result.getAllocation('2025/01');
      expect(detail).toBeDefined();
      expect(detail!.plannedHours).toBe(10.0);
      expect(detail!.actualHours).toBe(8.0);
    });

    it('複数月タスクの詳細な按分結果を取得できる', () => {
      const task = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-29'),
        yoteiEnd: new Date('2025-02-05'),
        yoteiKosu: 30.0,
        jissekiKosu: 10.0
      };

      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });

      const result = service.allocateTaskWithDetails(task, assignee, []);

      expect(result.getMonths()).toEqual(['2025/01', '2025/02']);

      // 実績工数は開始月のみに計上される
      const jan = result.getAllocation('2025/01');
      expect(jan!.actualHours).toBe(10.0);

      const feb = result.getAllocation('2025/02');
      expect(feb!.actualHours).toBe(0);
    });

    it('担当者未割当の場合はダミー担当者で按分される', () => {
      const task = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-15'),
        yoteiEnd: new Date('2025-02-15'),
        yoteiKosu: 30.0
      };

      // 担当者なし（undefined）
      const result = service.allocateTaskWithDetails(task, undefined, []);

      expect(result.getMonths().length).toBeGreaterThan(0);
      expect(result.getTotalPlannedHours()).toBeCloseTo(30.0, 2);
    });

    it('量子化器を指定すると予定工数が量子化される', () => {
      const task = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-15'),
        yoteiEnd: new Date('2025-03-15'),
        yoteiKosu: 33.3 // 0.25単位で割り切れない
      };

      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });

      // AllocationQuantizer を import してインスタンス作成が必要
      const AllocationQuantizer = require('@/domains/wbs/allocation-quantizer').AllocationQuantizer;
      const quantizer = new AllocationQuantizer(0.25);

      const result = service.allocateTaskWithDetails(task, assignee, [], quantizer);

      // 各月の予定工数が0.25の倍数になっているか確認
      result.getMonths().forEach(month => {
        const detail = result.getAllocation(month);
        const units = detail!.plannedHours / 0.25;
        expect(Math.abs(units - Math.round(units))).toBeLessThan(0.001);
      });

      // 合計が保持されているか確認（誤差範囲内）
      expect(result.getTotalPlannedHours()).toBeCloseTo(33.25, 2); // 四捨五入で33.25になる
    });

    it('予定終了日がない場合は単月として扱う', () => {
      const task = {
        wbsId: 1,
        taskId: 'task-1',
        taskName: 'タスク1',
        yoteiStart: new Date('2025-01-15'),
        // yoteiEnd なし
        yoteiKosu: 10.0,
        jissekiKosu: 8.0
      };

      const assignee = WbsAssignee.create({ wbsId: 1, userId: 'user1', rate: 1.0, seq: 0 });

      const result = service.allocateTaskWithDetails(task, assignee, []);

      expect(result.getMonths()).toEqual(['2025/01']);
      expect(result.getTotalPlannedHours()).toBe(10.0);
    });
  });
});