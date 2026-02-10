import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkingHoursAllocationService } from '@/domains/calendar/working-hours-allocation.service';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { TaskForAllocation as ExtendedTaskForAllocation } from '@/domains/wbs/monthly-task-allocation';

describe('WorkingHoursAllocationService - 見通し按分機能', () => {
  let service: WorkingHoursAllocationService;
  let mockCompanyCalendar: CompanyCalendar;

  beforeEach(() => {
    // モックのCompanyCalendar作成
    mockCompanyCalendar = {
      isBusinessDay: jest.fn().mockReturnValue(true),
      isCompanyHoliday: jest.fn().mockReturnValue(false),
      getBusinessDaysInMonth: jest.fn().mockReturnValue(20),
      getAvailableHoursInMonth: jest.fn().mockReturnValue(160),
      getStandardWorkingHours: jest.fn().mockReturnValue(7.5),
    } as unknown as CompanyCalendar;

    service = new WorkingHoursAllocationService(mockCompanyCalendar);
  });

  describe('見通し工数の按分機能', () => {
    it('見通し工数が設定されたタスクで月別按分が正しく実行される', () => {
      const task: ExtendedTaskForAllocation = {
        taskId: 'TASK-001',
        wbsId: 'WBS-001',
        yoteiStart: new Date('2024-01-01'),
        yoteiEnd: new Date('2024-03-31'), // 3月末まで延長
        yoteiKosu: 100,
        forecastKosu: 120, // 見通し工数を追加
        actualKosu: 0,
        progressRate: 0.0,
      };

      const assignee = WbsAssignee.create({
        wbsId: 'WBS-001',
        assigneeId: 'USR-001',
        assigneeName: '田中太郎',
        yoteiKosu: 8,
      });

      const allocation = service.allocateTaskWithDetails(task, assignee, []);

      // MonthlyTaskAllocationのmonthlyAllocationsに見通し工数按分が含まれることを確認
      const monthlyAllocations = allocation.getMonthlyAllocations();
      
      // 1つ以上の月で按分されることを確認
      expect(monthlyAllocations.length).toBeGreaterThan(0);
      
      // 見通し工数按分の合計が元の見通し工数と一致することを確認
      const totalAllocatedForecast = monthlyAllocations
        .reduce((sum, ma) => sum + (ma.allocatedForecastHours || 0), 0);
      expect(totalAllocatedForecast).toBeCloseTo(120, 2);
    });

    it('見通し工数が未設定(undefined)の場合は按分されない', () => {
      const task: ExtendedTaskForAllocation = {
        taskId: 'TASK-002',
        wbsId: 'WBS-001',
        yoteiStart: new Date('2024-01-01'),
        yoteiEnd: new Date('2024-02-29'),
        yoteiKosu: 100,
        forecastKosu: undefined, // 見通し工数未設定
        actualKosu: 0,
        progressRate: 0.0,
      };

      const assignee = WbsAssignee.create({
        wbsId: 'WBS-001',
        assigneeId: 'USR-001',
        assigneeName: '田中太郎',
        yoteiKosu: 8,
      });

      const allocation = service.allocateTaskWithDetails(task, assignee, []);
      const monthlyAllocations = allocation.getMonthlyAllocations();
      
      // 見通し工数按分がすべて0またはundefinedであることを確認
      monthlyAllocations.forEach(ma => {
        expect(ma.allocatedForecastHours || 0).toBe(0);
      });
    });

    it('見通し工数が0の場合は按分されない', () => {
      const task: ExtendedTaskForAllocation = {
        taskId: 'TASK-003',
        wbsId: 'WBS-001',
        yoteiStart: new Date('2024-01-01'),
        yoteiEnd: new Date('2024-02-29'),
        yoteiKosu: 100,
        forecastKosu: 0, // 見通し工数が0
        actualKosu: 0,
        progressRate: 0.0,
      };

      const assignee = WbsAssignee.create({
        wbsId: 'WBS-001',
        assigneeId: 'USR-001',
        assigneeName: '田中太郎',
        yoteiKosu: 8,
      });

      const allocation = service.allocateTaskWithDetails(task, assignee, []);
      const monthlyAllocations = allocation.getMonthlyAllocations();
      
      // 見通し工数按分がすべて0であることを確認
      monthlyAllocations.forEach(ma => {
        expect(ma.allocatedForecastHours || 0).toBe(0);
      });
    });

    it('単月タスクで見通し工数が正しく按分される', () => {
      const task: ExtendedTaskForAllocation = {
        taskId: 'TASK-004',
        wbsId: 'WBS-001',
        yoteiStart: new Date('2024-01-15'),
        yoteiEnd: new Date('2024-01-25'),
        yoteiKosu: 50,
        forecastKosu: 60, // 見通し工数
        actualKosu: 0,
        progressRate: 0.0,
      };

      const assignee = WbsAssignee.create({
        wbsId: 'WBS-001',
        assigneeId: 'USR-001',
        assigneeName: '田中太郎',
        yoteiKosu: 8,
      });

      const allocation = service.allocateTaskWithDetails(task, assignee, []);
      const monthlyAllocations = allocation.getMonthlyAllocations();
      
      // 単月なので1月分のみ
      expect(monthlyAllocations.length).toBe(1);
      expect(monthlyAllocations[0].month).toBe('2024/01');
      expect(monthlyAllocations[0].allocatedForecastHours).toBe(60);
    });

    it('量子化器適用時も見通し工数が正しく按分される', () => {
      const task: ExtendedTaskForAllocation = {
        taskId: 'TASK-005',
        wbsId: 'WBS-001',
        yoteiStart: new Date('2024-01-01'),
        yoteiEnd: new Date('2024-02-29'),
        yoteiKosu: 100,
        forecastKosu: 120,
        actualKosu: 0,
        progressRate: 0.0,
      };

      const assignee = WbsAssignee.create({
        wbsId: 'WBS-001',
        assigneeId: 'USR-001',
        assigneeName: '田中太郎',
        yoteiKosu: 8,
      });

      // 量子化器のモック（0.5時間単位で量子化）
      const mockQuantizer = {
        quantize: jest.fn().mockImplementation((hoursMap: Map<string, number>) => {
          const quantized = new Map<string, number>();
          hoursMap.forEach((hours, month) => {
            quantized.set(month, Math.round(hours * 2) / 2); // 0.5時間単位
          });
          return quantized;
        })
      };

      service.allocateTaskWithDetails(task, assignee, [], mockQuantizer);
      
      // 量子化器が見通し工数にも適用されることを確認
      expect(mockQuantizer.quantize).toHaveBeenCalledTimes(2); // 予定工数と見通し工数で2回
    });
  });
});