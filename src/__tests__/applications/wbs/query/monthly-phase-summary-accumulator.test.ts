import { MonthlyPhaseSummaryAccumulator } from '@/applications/wbs/query/monthly-phase-summary-accumulator';
import { TaskAllocationDetail } from '@/applications/wbs/query/wbs-summary-result';

const createTaskDetail = (taskId: string, overrides?: Partial<TaskAllocationDetail>): TaskAllocationDetail => ({
  taskId,
  taskName: `タスク${taskId}`,
  phase: '設計',
  assignee: '田中',
  startDate: '2025-01-10',
  endDate: '2025-01-20',
  totalPlannedHours: 10.0,
  totalActualHours: 8.0,
  monthlyAllocations: [],
  ...overrides,
});

describe('MonthlyPhaseSummaryAccumulator', () => {
  describe('addTaskAllocation', () => {
    it('タスク配分結果を追加できる', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();
      const taskDetail = createTaskDetail('1');

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, taskDetail);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(1);
      expect(result.data[0].phase).toBe('設計');
      expect(result.data[0].month).toBe('2025/01');
      expect(result.data[0].plannedHours).toBe(10.0);
      expect(result.data[0].actualHours).toBe(8.0);
      expect(result.data[0].difference).toBe(-2.0);
      expect(result.data[0].taskCount).toBe(1);
    });

    it('同一キー（月-工程）のデータは自動的にマージされる', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();
      const taskDetail1 = createTaskDetail('1');
      const taskDetail2 = createTaskDetail('2');

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, taskDetail1);
      accumulator.addTaskAllocation('設計', '2025/01', 5.0, 4.0, 0, taskDetail2);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(1);
      expect(result.data[0].plannedHours).toBe(15.0);
      expect(result.data[0].actualHours).toBe(12.0);
      expect(result.data[0].difference).toBe(-3.0);
      expect(result.data[0].taskCount).toBe(2);
      expect(result.data[0].taskDetails?.length).toBe(2);
    });

    it('異なる工程のデータは別々に管理される', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();
      const taskDetail1 = createTaskDetail('1', { phase: '設計' });
      const taskDetail2 = createTaskDetail('2', { phase: '実装' });

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, taskDetail1);
      accumulator.addTaskAllocation('実装', '2025/01', 5.0, 4.0, 0, taskDetail2);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(2);
      const phaseKeys = result.phases.map(p => p.key);
      expect(phaseKeys).toContain('設計');
      expect(phaseKeys).toContain('実装');
    });

    it('異なる月のデータは別々に管理される', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();
      const taskDetail1 = createTaskDetail('1');
      const taskDetail2 = createTaskDetail('2');

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, taskDetail1);
      accumulator.addTaskAllocation('設計', '2025/02', 5.0, 4.0, 0, taskDetail2);

      const result = accumulator.getTotals();

      expect(result.data.length).toBe(2);
      expect(result.months).toEqual(['2025/01', '2025/02']);
    });
  });

  describe('getTotals', () => {
    it('月別合計を正しく計算できる', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));
      accumulator.addTaskAllocation('実装', '2025/01', 15.0, 12.0, 0, createTaskDetail('2'));

      const result = accumulator.getTotals();

      expect(result.monthlyTotals['2025/01'].taskCount).toBe(2);
      expect(result.monthlyTotals['2025/01'].plannedHours).toBe(25.0);
      expect(result.monthlyTotals['2025/01'].actualHours).toBe(20.0);
      expect(result.monthlyTotals['2025/01'].difference).toBe(-5.0);
    });

    it('工程別合計を正しく計算できる', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));
      accumulator.addTaskAllocation('設計', '2025/02', 15.0, 12.0, 0, createTaskDetail('2'));

      const result = accumulator.getTotals();

      expect(result.phaseTotals['設計'].taskCount).toBe(2);
      expect(result.phaseTotals['設計'].plannedHours).toBe(25.0);
      expect(result.phaseTotals['設計'].actualHours).toBe(20.0);
      expect(result.phaseTotals['設計'].difference).toBe(-5.0);
    });

    it('全体合計を正しく計算できる', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));
      accumulator.addTaskAllocation('実装', '2025/01', 15.0, 12.0, 0, createTaskDetail('2'));
      accumulator.addTaskAllocation('設計', '2025/02', 5.0, 4.0, 0, createTaskDetail('3'));

      const result = accumulator.getTotals();

      expect(result.grandTotal.taskCount).toBe(3);
      expect(result.grandTotal.plannedHours).toBe(30.0);
      expect(result.grandTotal.actualHours).toBe(24.0);
      expect(result.grandTotal.difference).toBe(-6.0);
    });

    it('データがない場合は空の集計を返す', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      const result = accumulator.getTotals();

      expect(result.data).toEqual([]);
      expect(result.months).toEqual([]);
      expect(result.phases).toEqual([]);
      expect(result.grandTotal.taskCount).toBe(0);
      expect(result.grandTotal.plannedHours).toBe(0);
      expect(result.grandTotal.actualHours).toBe(0);
      expect(result.grandTotal.difference).toBe(0);
    });

    it('複数工程×複数月の複雑なケースを正しく集計できる', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      // 設計: 2025/01 に 2タスク、2025/02 に 1タスク
      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));
      accumulator.addTaskAllocation('設計', '2025/01', 5.0, 4.0, 0, createTaskDetail('2'));
      accumulator.addTaskAllocation('設計', '2025/02', 15.0, 12.0, 0, createTaskDetail('3'));

      // 実装: 2025/01 に 1タスク、2025/02 に 1タスク
      accumulator.addTaskAllocation('実装', '2025/01', 20.0, 16.0, 0, createTaskDetail('4'));
      accumulator.addTaskAllocation('実装', '2025/02', 10.0, 8.0, 0, createTaskDetail('5'));

      const result = accumulator.getTotals();

      // 全体
      expect(result.data.length).toBe(4); // 設計×2月 + 実装×2月
      expect(result.months).toEqual(['2025/01', '2025/02']);

      // 月別合計
      expect(result.monthlyTotals['2025/01'].taskCount).toBe(3); // 設計2 + 実装1
      expect(result.monthlyTotals['2025/01'].plannedHours).toBe(35.0); // 10+5+20
      expect(result.monthlyTotals['2025/02'].taskCount).toBe(2); // 設計1 + 実装1
      expect(result.monthlyTotals['2025/02'].plannedHours).toBe(25.0); // 15+10

      // 工程別合計
      expect(result.phaseTotals['設計'].taskCount).toBe(3);
      expect(result.phaseTotals['設計'].plannedHours).toBe(30.0); // 10+5+15
      expect(result.phaseTotals['実装'].taskCount).toBe(2);
      expect(result.phaseTotals['実装'].plannedHours).toBe(30.0); // 20+10

      // 全体合計
      expect(result.grandTotal.taskCount).toBe(5);
      expect(result.grandTotal.plannedHours).toBe(60.0);
      expect(result.grandTotal.actualHours).toBe(48.0);
      expect(result.grandTotal.difference).toBe(-12.0);
    });
  });

  describe('phaseSeqMap によるソート', () => {
    it('phaseSeqMap に基づいて工程がソートされる', () => {
      const phaseSeqMap = new Map<string, number>([
        ['実装', 1],
        ['設計', 2],
      ]);
      const accumulator = new MonthlyPhaseSummaryAccumulator(phaseSeqMap);

      // 設計→実装の順で追加（逆順）
      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));
      accumulator.addTaskAllocation('実装', '2025/01', 5.0, 4.0, 0, createTaskDetail('2'));

      const result = accumulator.getTotals();

      expect(result.phases).toEqual([
        { key: '実装', seq: 1 },
        { key: '設計', seq: 2 },
      ]);
    });

    it('同一 seq 値の工程は名前の localeCompare でソートされる', () => {
      const phaseSeqMap = new Map<string, number>([
        ['テスト', 1],
        ['設計', 1],
      ]);
      const accumulator = new MonthlyPhaseSummaryAccumulator(phaseSeqMap);

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));
      accumulator.addTaskAllocation('テスト', '2025/01', 5.0, 4.0, 0, createTaskDetail('2'));

      const result = accumulator.getTotals();

      // localeCompare 順で比較
      const expectedOrder = ['テスト', '設計'].sort((a, b) => a.localeCompare(b));
      expect(result.phases.map(p => p.key)).toEqual(expectedOrder);
    });

    it('phaseSeqMap に登録されていない工程は MAX_SAFE_INTEGER として末尾に配置される', () => {
      const phaseSeqMap = new Map<string, number>([
        ['設計', 1],
      ]);
      const accumulator = new MonthlyPhaseSummaryAccumulator(phaseSeqMap);

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));
      accumulator.addTaskAllocation('実装', '2025/01', 5.0, 4.0, 0, createTaskDetail('2'));

      const result = accumulator.getTotals();

      expect(result.phases).toEqual([
        { key: '設計', seq: 1 },
        { key: '実装', seq: Number.MAX_SAFE_INTEGER },
      ]);
    });
  });

  describe('baselineHours の集計', () => {
    it('baselineHours が addTaskAllocation で正しく累積される', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 10, createTaskDetail('1'));
      accumulator.addTaskAllocation('設計', '2025/01', 5.0, 4.0, 15, createTaskDetail('2'));

      const result = accumulator.getTotals();

      expect(result.data[0].baselineHours).toBe(25);
    });

    it('baselineHours が月別合計・工程別合計・全体合計に反映される', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 10, createTaskDetail('1'));
      accumulator.addTaskAllocation('実装', '2025/02', 5.0, 4.0, 20, createTaskDetail('2'));

      const result = accumulator.getTotals();

      expect(result.monthlyTotals['2025/01'].baselineHours).toBe(10);
      expect(result.monthlyTotals['2025/02'].baselineHours).toBe(20);
      expect(result.phaseTotals['設計'].baselineHours).toBe(10);
      expect(result.phaseTotals['実装'].baselineHours).toBe(20);
      expect(result.grandTotal.baselineHours).toBe(30);
    });

    it('baselineHours=0 の場合の集計動作を検証する', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      // 工程A に baselineHours=0、工程B に baselineHours=5（同月）
      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));
      accumulator.addTaskAllocation('実装', '2025/01', 5.0, 4.0, 5, createTaskDetail('2'));

      const result = accumulator.getTotals();

      // baselineHours=0 のデータも含め、合計は 0+5=5 であるべき
      expect(result.monthlyTotals['2025/01'].baselineHours).toBe(5);
      expect(result.grandTotal.baselineHours).toBe(5);
    });
  });

  describe('forecastHours の集計', () => {
    it('forecastHours が addTaskAllocation で正しく累積される', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'), 9.5);
      accumulator.addTaskAllocation('設計', '2025/01', 5.0, 4.0, 0, createTaskDetail('2'), 4.8);

      const result = accumulator.getTotals();

      expect(result.data[0].forecastHours).toBe(14.3);
    });

    it('forecastHours が未指定の場合は 0 として扱われる', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'));

      const result = accumulator.getTotals();

      expect(result.data[0].forecastHours).toBe(0);
      expect(result.monthlyTotals['2025/01'].forecastHours).toBe(0);
      expect(result.phaseTotals['設計'].forecastHours).toBe(0);
      expect(result.grandTotal.forecastHours).toBe(0);
    });

    it('forecastHours=0 の場合の集計動作を検証する', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      // 工程A に forecastHours=0、工程B に forecastHours=10（同月）
      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, createTaskDetail('1'), 0);
      accumulator.addTaskAllocation('実装', '2025/01', 5.0, 4.0, 0, createTaskDetail('2'), 10);

      const result = accumulator.getTotals();

      // forecastHours=0 のデータも含め、合計は 0+10=10 であるべき
      expect(result.monthlyTotals['2025/01'].forecastHours).toBe(10);
      expect(result.grandTotal.forecastHours).toBe(10);
    });
  });

  describe('taskDetails の包含', () => {
    it('getTotals の data に taskDetails が正しく含まれる', () => {
      const accumulator = new MonthlyPhaseSummaryAccumulator();

      const taskDetail1 = createTaskDetail('task-A', { taskName: 'タスクA' });
      const taskDetail2 = createTaskDetail('task-B', { taskName: 'タスクB' });

      accumulator.addTaskAllocation('設計', '2025/01', 10.0, 8.0, 0, taskDetail1);
      accumulator.addTaskAllocation('設計', '2025/01', 5.0, 4.0, 0, taskDetail2);

      const result = accumulator.getTotals();

      expect(result.data[0].taskDetails).toHaveLength(2);
      const taskIds = result.data[0].taskDetails!.map(t => t.taskId);
      expect(taskIds).toContain('task-A');
      expect(taskIds).toContain('task-B');
    });
  });
});
