import { EvmService } from '@/applications/evm/evm-service';
import type {
  IWbsEvmRepository,
  WbsEvmData,
  TaskProgressSnapshotRecord,
} from '@/applications/evm/iwbs-evm-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';

/**
 * フェーズ別EVM（docs/plans/progress-management-analysis-requirements.md 2-1）。
 * - phaseId を指定すると、そのフェーズのタスクだけで PV/EV/AC/BAC と予測を求める（バッファは含めない）
 * - 過去時点は「その時点のフェーズ」（スナップショットに記録したフェーズ）で集計する
 * - フェーズ別内訳に、フェーズごとの予定終了日・予測完了日を付ける
 */
describe('EvmService: フェーズ別EVM', () => {
  const fakeNow = new Date('2025-06-01T00:00:00.000Z');

  const makeTask = (args: {
    taskId: number;
    plannedManHours: number;
    progressRate: number;
    phaseId: number | null;
    phaseName: string | null;
    start: string;
    end: string;
  }): TaskEvmData =>
    new TaskEvmData(
      args.taskId,
      `D1-000${args.taskId}`,
      `タスク${args.taskId}`,
      new Date(`${args.start}T00:00:00.000Z`),
      new Date(`${args.end}T00:00:00.000Z`),
      new Date(`${args.start}T00:00:00.000Z`),
      new Date(`${args.end}T00:00:00.000Z`),
      new Date(`${args.start}T00:00:00.000Z`),
      null,
      args.plannedManHours,
      args.plannedManHours,
      0,
      'IN_PROGRESS',
      args.progressRate,
      5000,
      args.progressRate,
      {
        phaseId: args.phaseId,
        phaseName: args.phaseName,
        assigneeId: null,
        assigneeName: null,
      }
    );

  // タスク1: 設計(10)、タスク2: 現在は実装(20)。どちらも1月中の計画で進捗50%
  const wbsData: WbsEvmData = {
    wbsId: 1,
    projectId: 'proj-1',
    projectName: 'テスト',
    totalPlannedManHours: 300,
    totalBaseManHours: 300,
    tasks: [
      makeTask({ taskId: 1, plannedManHours: 100, progressRate: 50, phaseId: 10, phaseName: '設計', start: '2025-01-01', end: '2025-01-31' }),
      makeTask({ taskId: 2, plannedManHours: 200, progressRate: 50, phaseId: 20, phaseName: '実装', start: '2025-01-01', end: '2025-01-31' }),
    ],
    buffers: [{ id: 1, name: 'バッファ', bufferHours: 20, bufferType: 'OTHER' }],
    settings: null,
    averageCostPerHour: null,
  };

  const snap = (
    taskId: number,
    snapshotAt: string,
    phaseId: number | null,
    progressRate: number
  ): TaskProgressSnapshotRecord => ({
    taskId,
    taskNo: `D1-000${taskId}`,
    snapshotAt: new Date(snapshotAt),
    progressRate,
    status: 'IN_PROGRESS',
    plannedManHours: taskId === 1 ? 100 : 200,
    baseManHours: taskId === 1 ? 100 : 200,
    costPerHour: 5000,
    plannedStart: new Date('2025-01-01T00:00:00.000Z'),
    plannedEnd: new Date('2025-01-31T00:00:00.000Z'),
    baseStart: new Date('2025-01-01T00:00:00.000Z'),
    baseEnd: new Date('2025-01-31T00:00:00.000Z'),
    actualStart: null,
    actualEnd: null,
    isRemoved: false,
    phaseId,
  });

  let mockRepository: jest.Mocked<IWbsEvmRepository>;
  let evmService: EvmService;

  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'clearImmediate', 'nextTick'],
    });
    jest.setSystemTime(fakeNow);

    mockRepository = {
      getWbsEvmData: jest.fn().mockResolvedValue(wbsData),
      getTasksEvmData: jest.fn(),
      getActualCostByDate: jest.fn().mockResolvedValue(new Map([['2025-01-20', 40]])),
      getActualCostByTask: jest.fn().mockResolvedValue(
        new Map<number | null, number>([
          [1, 40],
          [2, 90],
          [null, 5],
        ])
      ),
      getBuffers: jest.fn(),
      getProjectSettings: jest.fn(),
      getProgressSnapshots: jest.fn().mockResolvedValue([]),
      getEditableProgressSnapshots: jest.fn().mockResolvedValue([]),
      updateProgressSnapshot: jest.fn().mockResolvedValue(undefined),
      getCompanyHolidays: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IWbsEvmRepository>;
    evmService = new EvmService(mockRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('phaseId を指定すると、そのフェーズのタスクだけで現在値を求め、BACにバッファを含めない', async () => {
    const result = await evmService.getEvmDashboardData(1, { periodMode: 'project', phaseId: 10 });

    expect(result.currentMetrics.ev).toBeCloseTo(50, 5);
    expect(result.currentMetrics.pv).toBeCloseTo(100, 5);
    expect(result.currentMetrics.bac).toBeCloseTo(100, 5);
    expect(result.currentMetrics.ac).toBeCloseTo(40, 5);
    expect(mockRepository.getActualCostByDate).toHaveBeenCalledWith(
      1,
      new Date(0),
      expect.any(Date),
      'hours',
      10
    );
  });

  it('フェーズ指定時の内訳には「未紐付け・削除済み」行を出さない（他フェーズの実績が混ざるため）', async () => {
    const result = await evmService.getEvmDashboardData(1, { periodMode: 'project', phaseId: 10 });

    expect(result.phaseBreakdown.map((row) => row.name)).toEqual(['設計']);
  });

  it('過去時点は、その時点のフェーズ（スナップショットに記録したフェーズ）で集計する', async () => {
    // タスク2は 2/1〜3/1 の間は設計(10)、3/1 以降は実装(20)
    mockRepository.getProgressSnapshots.mockResolvedValue([
      snap(1, '2025-02-01T00:00:00.000Z', 10, 40),
      snap(2, '2025-02-01T00:00:00.000Z', 10, 30),
      snap(2, '2025-03-01T00:00:00.000Z', 20, 30),
    ]);

    const inDesign = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      phaseId: 10,
      comparisonDate: new Date('2025-02-15T00:00:00.000Z'),
    });
    // 設計 = タスク1（100h×40%）＋タスク2（200h×30%）
    expect(inDesign.comparison!.previousMetrics.ev).toBeCloseTo(40 + 60, 5);
    expect(inDesign.comparison!.previousMetrics.bac).toBeCloseTo(300, 5);

    const afterMove = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      phaseId: 10,
      comparisonDate: new Date('2025-03-15T00:00:00.000Z'),
    });
    expect(afterMove.comparison!.previousMetrics.ev).toBeCloseTo(40, 5);
    expect(afterMove.comparison!.previousMetrics.bac).toBeCloseTo(100, 5);
  });

  it('スナップショットにフェーズが無い（記録開始前の）場合は、タスクの現在のフェーズで集計する', async () => {
    mockRepository.getProgressSnapshots.mockResolvedValue([
      snap(1, '2025-02-01T00:00:00.000Z', null, 40),
      snap(2, '2025-02-01T00:00:00.000Z', null, 30),
    ]);

    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      phaseId: 20,
      comparisonDate: new Date('2025-02-15T00:00:00.000Z'),
    });

    expect(result.comparison!.previousMetrics.ev).toBeCloseTo(60, 5);
  });

  it('フェーズ別内訳の各行に予定終了日と予測完了日を付ける', async () => {
    const result = await evmService.getEvmDashboardData(1, { periodMode: 'project' });

    const design = result.phaseBreakdown.find((row) => row.name === '設計')!;
    expect(design.plannedEndDate).toBe('2025-01-31T00:00:00.000Z');
    expect(typeof design.forecastCompletionDate).toBe('string');
    expect(design.scheduleDelayDays).toBeGreaterThan(0);
    // 担当者別内訳には付けない
    expect(result.assigneeBreakdown[0].plannedEndDate).toBeUndefined();
  });

  describe('バッファ消化（2-2）', () => {
    it('全体表示ではバッファ消化を返す（バッファ20h、EV150h・AC160h → 消化10h=50%、出来高率50%）', async () => {
      mockRepository.getActualCostByDate.mockResolvedValue(new Map([['2025-01-20', 160]]));

      const result = await evmService.getEvmDashboardData(1, { periodMode: 'project' });

      expect(result.bufferConsumption?.current).toEqual({
        bufferAmount: 20,
        consumedAmount: 10,
        remainingAmount: 10,
        consumptionPct: 50,
        progressPct: 50,
        zone: 'healthy',
      });
      expect(result.bufferConsumption?.previous).toBeNull();
    });

    it('前回の確認日を渡すと前回時点のバッファ消化も返す', async () => {
      // 前回時点のEVを確定させる（スナップショットがない日のEVは時間按分のフォールバックになるため）
      mockRepository.getProgressSnapshots.mockResolvedValue([
        snap(1, '2025-03-01T00:00:00.000Z', 10, 50),
        snap(2, '2025-03-01T00:00:00.000Z', 20, 50),
      ]);
      mockRepository.getActualCostByDate.mockResolvedValue(
        new Map([
          ['2025-01-20', 150],
          ['2025-05-01', 10],
        ])
      );

      const result = await evmService.getEvmDashboardData(1, {
        periodMode: 'project',
        comparisonDate: new Date('2025-04-01T00:00:00.000Z'),
      });

      expect(result.bufferConsumption?.previous?.consumedAmount).toBe(0);
      expect(result.bufferConsumption?.current.consumedAmount).toBe(10);
    });

    it('フェーズ指定時はバッファ消化を返さない（バッファはフェーズに属さない）', async () => {
      const result = await evmService.getEvmDashboardData(1, { periodMode: 'project', phaseId: 10 });

      expect(result.bufferConsumption).toBeNull();
    });
  });
});
