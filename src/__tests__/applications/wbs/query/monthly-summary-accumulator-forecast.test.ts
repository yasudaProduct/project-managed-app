import { describe, it, expect } from '@jest/globals';
import { MonthlySummaryAccumulator } from '@/applications/wbs/query/monthly-summary-accumulator';
import { TaskAllocationDetail } from '@/applications/wbs/query/wbs-summary-result';

describe('MonthlySummaryAccumulator - 見通し集計機能', () => {
  describe('見通し工数の集計', () => {
    it('見通し工数が正しく累積されて集計される', () => {
      const accumulator = new MonthlySummaryAccumulator();

      // 1月のタスク詳細1
      const taskDetail1: TaskAllocationDetail = {
        taskId: 'TASK-001',
        taskName: 'タスクA',
        phase: '要件定義',
        assignee: '田中',
        plannedHours: 40,
        actualHours: 35,
        monthlyAllocations: [
          {
            month: '2024/01',
            allocatedPlannedHours: 40,
            allocatedActualHours: 35,
            allocatedForecastHours: 42,
            workingDays: 20,
            availableHours: 160,
            allocationRatio: 0.25,
          }
        ]
      };

      // 1月のタスク詳細2（同じ担当者・同じ月）
      const taskDetail2: TaskAllocationDetail = {
        taskId: 'TASK-002',
        taskName: 'タスクB',
        phase: '設計',
        assignee: '田中',
        plannedHours: 60,
        actualHours: 50,
        monthlyAllocations: [
          {
            month: '2024/01',
            allocatedPlannedHours: 60,
            allocatedActualHours: 50,
            allocatedForecastHours: 65,
            workingDays: 20,
            availableHours: 160,
            allocationRatio: 0.375,
          }
        ]
      };

      // 2月のタスク詳細（同じ担当者・異なる月）
      const taskDetail3: TaskAllocationDetail = {
        taskId: 'TASK-003',
        taskName: 'タスクC',
        phase: '実装',
        assignee: '田中',
        plannedHours: 80,
        actualHours: 0,
        monthlyAllocations: [
          {
            month: '2024/02',
            allocatedPlannedHours: 80,
            allocatedActualHours: 0,
            allocatedForecastHours: 85,
            workingDays: 20,
            availableHours: 160,
            allocationRatio: 0.5,
          }
        ]
      };

      // タスク配分を追加
      accumulator.addTaskAllocation('田中', '2024/01', 40, 35, 0, taskDetail1, 42);
      accumulator.addTaskAllocation('田中', '2024/01', 60, 50, 0, taskDetail2, 65);
      accumulator.addTaskAllocation('田中', '2024/02', 80, 0, 0, taskDetail3, 85);

      const result = accumulator.getTotals();

      // 1月分の集計確認
      const jan2024Data = result.data.find(d => d.month === '2024/01' && d.assignee === '田中');
      expect(jan2024Data).toBeDefined();
      expect(jan2024Data!.forecastHours).toBe(107); // 42 + 65 = 107

      // 2月分の集計確認
      const feb2024Data = result.data.find(d => d.month === '2024/02' && d.assignee === '田中');
      expect(feb2024Data).toBeDefined();
      expect(feb2024Data!.forecastHours).toBe(85);

      // 月別合計の確認
      expect(result.monthlyTotals['2024/01'].forecastHours).toBe(107);
      expect(result.monthlyTotals['2024/02'].forecastHours).toBe(85);

      // 担当者別合計の確認
      expect(result.assigneeTotals['田中'].forecastHours).toBe(192); // 107 + 85

      // 全体合計の確認
      expect(result.grandTotal.forecastHours).toBe(192);
    });

    it('見通し工数が未指定の場合は0として扱われる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail: TaskAllocationDetail = {
        taskId: 'TASK-001',
        taskName: 'タスクA',
        phase: '要件定義',
        assignee: '田中',
        plannedHours: 40,
        actualHours: 35,
        monthlyAllocations: [
          {
            month: '2024/01',
            allocatedPlannedHours: 40,
            allocatedActualHours: 35,
            workingDays: 20,
            availableHours: 160,
            allocationRatio: 0.25,
          }
        ]
      };

      // 見通し工数を未指定で追加
      accumulator.addTaskAllocation('田中', '2024/01', 40, 35, 0, taskDetail);

      const result = accumulator.getTotals();
      
      const data = result.data.find(d => d.month === '2024/01' && d.assignee === '田中');
      expect(data).toBeDefined();
      expect(data!.forecastHours).toBe(0);
    });

    it('複数担当者の見通し工数が正しく集計される', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail1: TaskAllocationDetail = {
        taskId: 'TASK-001',
        taskName: 'タスクA',
        phase: '要件定義',
        assignee: '田中',
        plannedHours: 40,
        actualHours: 35,
        monthlyAllocations: [
          {
            month: '2024/01',
            allocatedPlannedHours: 40,
            allocatedActualHours: 35,
            allocatedForecastHours: 42,
            workingDays: 20,
            availableHours: 160,
            allocationRatio: 0.25,
          }
        ]
      };

      const taskDetail2: TaskAllocationDetail = {
        taskId: 'TASK-002',
        taskName: 'タスクB',
        phase: '設計',
        assignee: '佐藤',
        plannedHours: 60,
        actualHours: 50,
        monthlyAllocations: [
          {
            month: '2024/01',
            allocatedPlannedHours: 60,
            allocatedActualHours: 50,
            allocatedForecastHours: 65,
            workingDays: 20,
            availableHours: 160,
            allocationRatio: 0.375,
          }
        ]
      };

      accumulator.addTaskAllocation('田中', '2024/01', 40, 35, 0, taskDetail1, 42);
      accumulator.addTaskAllocation('佐藤', '2024/01', 60, 50, 0, taskDetail2, 65);

      const result = accumulator.getTotals();

      // 各担当者の見通し工数確認
      const tanaka = result.data.find(d => d.assignee === '田中');
      expect(tanaka!.forecastHours).toBe(42);
      
      const sato = result.data.find(d => d.assignee === '佐藤');
      expect(sato!.forecastHours).toBe(65);

      // 月別合計（担当者横断）の確認
      expect(result.monthlyTotals['2024/01'].forecastHours).toBe(107); // 42 + 65

      // 全体合計の確認
      expect(result.grandTotal.forecastHours).toBe(107);
    });

    it('見通し工数とその他工数の独立性が確保されている', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail: TaskAllocationDetail = {
        taskId: 'TASK-001',
        taskName: 'タスクA',
        phase: '要件定義',
        assignee: '田中',
        plannedHours: 50,
        actualHours: 60, // 実績が予定を超過
        monthlyAllocations: [
          {
            month: '2024/01',
            allocatedPlannedHours: 50,
            allocatedActualHours: 60,
            allocatedForecastHours: 55, // 見通しは予定より少し多め
            workingDays: 20,
            availableHours: 160,
            allocationRatio: 0.3125,
          }
        ]
      };

      accumulator.addTaskAllocation('田中', '2024/01', 50, 60, 40, taskDetail, 55);

      const result = accumulator.getTotals();
      const data = result.data.find(d => d.month === '2024/01' && d.assignee === '田中');
      
      expect(data).toBeDefined();
      expect(data!.plannedHours).toBe(50);
      expect(data!.actualHours).toBe(60);
      expect(data!.forecastHours).toBe(55); // 独立して管理されている
      expect(data!.baselineHours).toBe(40);
      expect(data!.difference).toBe(10); // actual - planned
    });
  });
});