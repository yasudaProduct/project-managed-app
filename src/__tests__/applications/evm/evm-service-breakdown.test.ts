import { EvmService } from '@/applications/evm/evm-service';
import { IWbsEvmRepository, WbsEvmData } from '@/applications/evm/iwbs-evm-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';

/**
 * フェーズ別・担当者別のEVM内訳の検証。
 * - 現在時点のライブタスクで PV/EV/BAC をグループ集計
 * - ACはタスク別実績（getActualCostByTask）をグループへ振り分け
 * - タスク未紐付け・削除済みタスクのACは「未紐付け・削除済み」行に合算
 *   → 内訳のAC合計 = currentMetrics.ac の不変式を維持
 */
describe('EvmService: フェーズ別・担当者別内訳', () => {
  const fakeNow = new Date('2025-06-01T00:00:00.000Z');

  let evmService: EvmService;
  let mockRepository: jest.Mocked<IWbsEvmRepository>;

  const makeTask = (args: {
    taskId: number;
    plannedManHours: number;
    progressRate: number;
    phaseId: number | null;
    phaseName: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
  }): TaskEvmData =>
    new TaskEvmData(
      args.taskId,
      `D1-000${args.taskId}`,
      `タスク${args.taskId}`,
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T00:00:00.000Z'),
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T00:00:00.000Z'),
      new Date('2025-01-01T00:00:00.000Z'),
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
        assigneeId: args.assigneeId,
        assigneeName: args.assigneeName,
      }
    );

  const wbsData: WbsEvmData = {
    wbsId: 1,
    projectId: 'proj-1',
    projectName: 'テスト',
    totalPlannedManHours: 300,
    totalBaseManHours: 300,
    tasks: [
      makeTask({
        taskId: 1,
        plannedManHours: 100,
        progressRate: 50,
        phaseId: 10,
        phaseName: '設計',
        assigneeId: 'u1',
        assigneeName: '山田',
      }),
      makeTask({
        taskId: 2,
        plannedManHours: 200,
        progressRate: 50,
        phaseId: 20,
        phaseName: '実装',
        assigneeId: 'u2',
        assigneeName: '佐藤',
      }),
    ],
    buffers: [],
    settings: null,
    averageCostPerHour: null,
  };

  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout',
        'setInterval',
        'setImmediate',
        'clearTimeout',
        'clearInterval',
        'clearImmediate',
        'nextTick',
      ],
    });
    jest.setSystemTime(fakeNow);

    mockRepository = {
      getWbsEvmData: jest.fn().mockResolvedValue(wbsData),
      getTasksEvmData: jest.fn(),
      // 合計AC = 30 + 60 + 10(削除済みtaskId=99) + 5(taskId=null) = 105
      getActualCostByDate: jest
        .fn()
        .mockResolvedValue(new Map([['2025-05-01', 105]])),
      getActualCostByTask: jest.fn().mockResolvedValue(
        new Map<number | null, number>([
          [1, 30],
          [2, 60],
          [99, 10],
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

  it('フェーズ別にPV/EV/AC/BACが集計される', async () => {
    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
    });

    const design = result.phaseBreakdown.find((r) => r.name === '設計');
    expect(design).toBeDefined();
    // 評価日は計画期間後 → PV全額。EV = 100×50% = 50
    expect(design!.pv).toBe(100);
    expect(design!.ev).toBe(50);
    expect(design!.ac).toBe(30);
    expect(design!.bac).toBe(100);
    expect(design!.taskCount).toBe(1);
    expect(design!.spi).toBeCloseTo(0.5, 5);
    expect(design!.cpi).toBeCloseTo(50 / 30, 5);

    const impl = result.phaseBreakdown.find((r) => r.name === '実装');
    expect(impl!.ac).toBe(60);
  });

  it('担当者別に集計される（軸はタスクの現担当者）', async () => {
    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
    });

    const yamada = result.assigneeBreakdown.find((r) => r.name === '山田');
    expect(yamada).toBeDefined();
    expect(yamada!.ev).toBe(50);
    expect(yamada!.ac).toBe(30);
  });

  it('削除済みタスク・未紐付けのACは「未紐付け・削除済み」行に合算され、AC合計が保たれる', async () => {
    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
    });

    const unlinked = result.phaseBreakdown.find((r) => r.isUnlinked);
    expect(unlinked).toBeDefined();
    expect(unlinked!.ac).toBe(15); // 10（削除済み） + 5（taskId=null）
    expect(unlinked!.pv).toBe(0);
    expect(unlinked!.ev).toBe(0);
    expect(unlinked!.spi).toBeNull();
    expect(unlinked!.cpi).toBeNull();

    // 不変式: 内訳AC合計 = currentMetrics.ac（フェーズ軸・担当者軸とも）
    const phaseAcSum = result.phaseBreakdown.reduce((s, r) => s + r.ac, 0);
    const assigneeAcSum = result.assigneeBreakdown.reduce((s, r) => s + r.ac, 0);
    expect(phaseAcSum).toBeCloseTo(result.currentMetrics.ac, 5);
    expect(assigneeAcSum).toBeCloseTo(result.currentMetrics.ac, 5);
  });

  it('フェーズ未設定は「未分類」、担当者未設定は「未割当」に集計される', async () => {
    mockRepository.getWbsEvmData.mockResolvedValue({
      ...wbsData,
      tasks: [
        makeTask({
          taskId: 3,
          plannedManHours: 50,
          progressRate: 0,
          phaseId: null,
          phaseName: null,
          assigneeId: null,
          assigneeName: null,
        }),
      ],
    });
    mockRepository.getActualCostByTask.mockResolvedValue(new Map());
    mockRepository.getActualCostByDate.mockResolvedValue(new Map());

    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
    });

    expect(result.phaseBreakdown.some((r) => r.name === '未分類')).toBe(true);
    expect(result.assigneeBreakdown.some((r) => r.name === '未割当')).toBe(true);
  });
});
