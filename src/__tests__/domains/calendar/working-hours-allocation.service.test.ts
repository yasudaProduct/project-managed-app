import { WorkingHoursAllocationService } from "@/domains/calendar/working-hours-allocation.service";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";

describe('WorkingHoursAllocationService', () => {
  let service: WorkingHoursAllocationService;
  let companyCalendar: CompanyCalendar;

  beforeEach(() => {
    companyCalendar = new CompanyCalendar([]);
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
});