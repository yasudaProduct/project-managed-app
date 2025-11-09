import { MonthlySummaryAccumulator } from '@/applications/wbs/query/monthly-summary-accumulator';
import { TaskAllocationDetail } from '@/applications/wbs/query/wbs-summary-result';

describe('MonthlySummaryAccumulator', () => {
  describe('addTaskAllocation', () => {
    it('タスク配分結果を追加できる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail: TaskAllocationDetail = {
        taskId: 'task-1',
        taskName: 'タスク1',
        phase: 'フェーズA',
        assignee: '田中',
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: [{
          month: '2025/01',
          workingDays: 1,
          availableHours: 7.5,
          allocatedPlannedHours: 10.0,
          allocatedActualHours: 8.0,
          allocationRatio: 1.0
        }]
      };

      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, taskDetail);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(1);
      expect(result.data[0].assignee).toBe('田中');
      expect(result.data[0].month).toBe('2025/01');
      expect(result.data[0].plannedHours).toBe(10.0);
      expect(result.data[0].actualHours).toBe(8.0);
      expect(result.data[0].difference).toBe(-2.0);
      expect(result.data[0].taskCount).toBe(1);
    });

    it('同一キー（月-担当者）のデータは自動的にマージされる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail1: TaskAllocationDetail = {
        taskId: 'task-1',
        taskName: 'タスク1',
        assignee: '田中',
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      };

      const taskDetail2: TaskAllocationDetail = {
        taskId: 'task-2',
        taskName: 'タスク2',
        assignee: '田中',
        startDate: '2025-01-15',
        endDate: '2025-01-25',
        totalPlannedHours: 5.0,
        totalActualHours: 4.0,
        monthlyAllocations: []
      };

      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, taskDetail1);
      accumulator.addTaskAllocation('田中', '2025/01', 5.0, 4.0, taskDetail2);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(1);
      expect(result.data[0].plannedHours).toBe(15.0);
      expect(result.data[0].actualHours).toBe(12.0);
      expect(result.data[0].difference).toBe(-3.0);
      expect(result.data[0].taskCount).toBe(2);
      expect(result.data[0].taskDetails?.length).toBe(2);
    });

    it('異なる担当者のデータは別々に管理される', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail1: TaskAllocationDetail = {
        taskId: 'task-1',
        taskName: 'タスク1',
        assignee: '田中',
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      };

      const taskDetail2: TaskAllocationDetail = {
        taskId: 'task-2',
        taskName: 'タスク2',
        assignee: '佐藤',
        startDate: '2025-01-15',
        endDate: '2025-01-25',
        totalPlannedHours: 5.0,
        totalActualHours: 4.0,
        monthlyAllocations: []
      };

      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, taskDetail1);
      accumulator.addTaskAllocation('佐藤', '2025/01', 5.0, 4.0, taskDetail2);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(2);
      expect(result.assignees).toEqual(['佐藤', '田中']); // ソートされている
    });

    it('異なる月のデータは別々に管理される', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail1: TaskAllocationDetail = {
        taskId: 'task-1',
        taskName: 'タスク1',
        assignee: '田中',
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      };

      const taskDetail2: TaskAllocationDetail = {
        taskId: 'task-2',
        taskName: 'タスク2',
        assignee: '田中',
        startDate: '2025-02-10',
        endDate: '2025-02-20',
        totalPlannedHours: 5.0,
        totalActualHours: 4.0,
        monthlyAllocations: []
      };

      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, taskDetail1);
      accumulator.addTaskAllocation('田中', '2025/02', 5.0, 4.0, taskDetail2);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(2);
      expect(result.months).toEqual(['2025/01', '2025/02']); // ソートされている
    });
  });

  describe('getTotals', () => {
    it('月別合計を正しく計算できる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const createTaskDetail = (taskId: string, assignee: string): TaskAllocationDetail => ({
        taskId,
        taskName: `タスク${taskId}`,
        assignee,
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      });

      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, createTaskDetail('1', '田中'));
      accumulator.addTaskAllocation('佐藤', '2025/01', 15.0, 12.0, createTaskDetail('2', '佐藤'));

      const result = accumulator.getTotals();

      expect(result.monthlyTotals['2025/01'].taskCount).toBe(2);
      expect(result.monthlyTotals['2025/01'].plannedHours).toBe(25.0);
      expect(result.monthlyTotals['2025/01'].actualHours).toBe(20.0);
      expect(result.monthlyTotals['2025/01'].difference).toBe(-5.0);
    });

    it('担当者別合計を正しく計算できる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const createTaskDetail = (taskId: string, assignee: string): TaskAllocationDetail => ({
        taskId,
        taskName: `タスク${taskId}`,
        assignee,
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      });

      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, createTaskDetail('1', '田中'));
      accumulator.addTaskAllocation('田中', '2025/02', 15.0, 12.0, createTaskDetail('2', '田中'));

      const result = accumulator.getTotals();

      expect(result.assigneeTotals['田中'].taskCount).toBe(2);
      expect(result.assigneeTotals['田中'].plannedHours).toBe(25.0);
      expect(result.assigneeTotals['田中'].actualHours).toBe(20.0);
      expect(result.assigneeTotals['田中'].difference).toBe(-5.0);
    });

    it('全体合計を正しく計算できる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const createTaskDetail = (taskId: string, assignee: string): TaskAllocationDetail => ({
        taskId,
        taskName: `タスク${taskId}`,
        assignee,
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      });

      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, createTaskDetail('1', '田中'));
      accumulator.addTaskAllocation('佐藤', '2025/01', 15.0, 12.0, createTaskDetail('2', '佐藤'));
      accumulator.addTaskAllocation('田中', '2025/02', 5.0, 4.0, createTaskDetail('3', '田中'));

      const result = accumulator.getTotals();

      expect(result.grandTotal.taskCount).toBe(3);
      expect(result.grandTotal.plannedHours).toBe(30.0);
      expect(result.grandTotal.actualHours).toBe(24.0);
      expect(result.grandTotal.difference).toBe(-6.0);
    });

    it('データがない場合は空の集計を返す', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const result = accumulator.getTotals();

      expect(result.data).toEqual([]);
      expect(result.months).toEqual([]);
      expect(result.assignees).toEqual([]);
      expect(result.grandTotal.taskCount).toBe(0);
      expect(result.grandTotal.plannedHours).toBe(0);
      expect(result.grandTotal.actualHours).toBe(0);
      expect(result.grandTotal.difference).toBe(0);
    });

    it('複数担当者・複数月の複雑なケースを正しく集計できる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const createTaskDetail = (taskId: string, assignee: string): TaskAllocationDetail => ({
        taskId,
        taskName: `タスク${taskId}`,
        assignee,
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      });

      // 田中: 2025/01 に 2タスク、2025/02 に 1タスク
      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, createTaskDetail('1', '田中'));
      accumulator.addTaskAllocation('田中', '2025/01', 5.0, 4.0, createTaskDetail('2', '田中'));
      accumulator.addTaskAllocation('田中', '2025/02', 15.0, 12.0, createTaskDetail('3', '田中'));

      // 佐藤: 2025/01 に 1タスク、2025/02 に 1タスク
      accumulator.addTaskAllocation('佐藤', '2025/01', 20.0, 16.0, createTaskDetail('4', '佐藤'));
      accumulator.addTaskAllocation('佐藤', '2025/02', 10.0, 8.0, createTaskDetail('5', '佐藤'));

      const result = accumulator.getTotals();

      // 全体
      expect(result.data.length).toBe(4); // 田中×2月 + 佐藤×2月
      expect(result.months).toEqual(['2025/01', '2025/02']);
      expect(result.assignees).toEqual(['佐藤', '田中']);

      // 月別合計
      expect(result.monthlyTotals['2025/01'].taskCount).toBe(3); // 田中2 + 佐藤1
      expect(result.monthlyTotals['2025/01'].plannedHours).toBe(35.0); // 10+5+20
      expect(result.monthlyTotals['2025/02'].taskCount).toBe(2); // 田中1 + 佐藤1
      expect(result.monthlyTotals['2025/02'].plannedHours).toBe(25.0); // 15+10

      // 担当者別合計
      expect(result.assigneeTotals['田中'].taskCount).toBe(3);
      expect(result.assigneeTotals['田中'].plannedHours).toBe(30.0); // 10+5+15
      expect(result.assigneeTotals['佐藤'].taskCount).toBe(2);
      expect(result.assigneeTotals['佐藤'].plannedHours).toBe(30.0); // 20+10

      // 全体合計
      expect(result.grandTotal.taskCount).toBe(5);
      expect(result.grandTotal.plannedHours).toBe(60.0);
      expect(result.grandTotal.actualHours).toBe(48.0);
      expect(result.grandTotal.difference).toBe(-12.0);
    });
  });

  describe('見通し工数の集計', () => {
    it('見通し工数を追加できる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail: TaskAllocationDetail = {
        taskId: 'task-1',
        taskName: 'タスク1',
        assignee: '田中',
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      };

      // 見通し工数を含めて追加
      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, taskDetail, 9.5);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(1);
      expect(result.data[0].forecastHours).toBe(9.5);
    });

    it('見通し工数が月別・担当者別に正しく集計される', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const createTaskDetail = (taskId: string): TaskAllocationDetail => ({
        taskId,
        taskName: `タスク${taskId}`,
        assignee: '田中',
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      });

      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, createTaskDetail('1'), 9.5);
      accumulator.addTaskAllocation('田中', '2025/01', 5.0, 4.0, createTaskDetail('2'), 4.8);

      const result = accumulator.getTotals();

      expect(result.data[0].forecastHours).toBe(14.3); // 9.5 + 4.8
      expect(result.monthlyTotals['2025/01'].forecastHours).toBe(14.3);
      expect(result.assigneeTotals['田中'].forecastHours).toBe(14.3);
      expect(result.grandTotal.forecastHours).toBe(14.3);
    });

    it('複数担当者・複数月の見通し工数を正しく集計できる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const createTaskDetail = (taskId: string, assignee: string): TaskAllocationDetail => ({
        taskId,
        taskName: `タスク${taskId}`,
        assignee,
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      });

      // 田中: 2025/01 に 2タスク、2025/02 に 1タスク
      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, createTaskDetail('1', '田中'), 9.5);
      accumulator.addTaskAllocation('田中', '2025/01', 5.0, 4.0, createTaskDetail('2', '田中'), 4.8);
      accumulator.addTaskAllocation('田中', '2025/02', 15.0, 12.0, createTaskDetail('3', '田中'), 14.0);

      // 佐藤: 2025/01 に 1タスク
      accumulator.addTaskAllocation('佐藤', '2025/01', 20.0, 16.0, createTaskDetail('4', '佐藤'), 18.5);

      const result = accumulator.getTotals();

      // 月別合計
      expect(result.monthlyTotals['2025/01'].forecastHours).toBe(32.8); // 9.5 + 4.8 + 18.5
      expect(result.monthlyTotals['2025/02'].forecastHours).toBe(14.0);

      // 担当者別合計
      expect(result.assigneeTotals['田中'].forecastHours).toBe(28.3); // 9.5 + 4.8 + 14.0
      expect(result.assigneeTotals['佐藤'].forecastHours).toBe(18.5);

      // 全体合計
      expect(result.grandTotal.forecastHours).toBe(46.8); // 28.3 + 18.5
    });

    it('見通し工数が指定されていない場合は0として扱われる', () => {
      const accumulator = new MonthlySummaryAccumulator();

      const taskDetail: TaskAllocationDetail = {
        taskId: 'task-1',
        taskName: 'タスク1',
        assignee: '田中',
        startDate: '2025-01-10',
        endDate: '2025-01-20',
        totalPlannedHours: 10.0,
        totalActualHours: 8.0,
        monthlyAllocations: []
      };

      // 見通し工数を指定せずに追加
      accumulator.addTaskAllocation('田中', '2025/01', 10.0, 8.0, taskDetail);

      const result = accumulator.getTotals();

      expect(result.data[0].forecastHours).toBe(0);
      expect(result.monthlyTotals['2025/01'].forecastHours).toBe(0);
      expect(result.assigneeTotals['田中'].forecastHours).toBe(0);
      expect(result.grandTotal.forecastHours).toBe(0);
    });
  });
});
