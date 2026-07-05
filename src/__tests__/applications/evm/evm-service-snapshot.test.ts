import { EvmService } from '@/applications/evm/evm-service';
import {
  IWbsEvmRepository,
  WbsEvmData,
  TaskProgressSnapshotRecord,
} from '@/applications/evm/iwbs-evm-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { TaskStatus } from '@/types/wbs';

/**
 * Stage2-2B: スナップショット履歴による時系列as-of再構築の検証。
 * 過去日のEVが「現在の進捗率」ではなく「その評価日時点で有効なスナップショットの確定進捗」で計算されること。
 */
describe('EvmService - スナップショットas-of時系列（2B）', () => {
  let mockRepository: jest.Mocked<IWbsEvmRepository>;
  let evmService: EvmService;

  beforeEach(() => {
    mockRepository = {
      getWbsEvmData: jest.fn(),
      getTasksEvmData: jest.fn(),
      getActualCostByDate: jest.fn().mockResolvedValue(new Map()),
      getBuffers: jest.fn(),
      getProjectSettings: jest.fn(),
      getProgressSnapshots: jest.fn().mockResolvedValue([]),
      getEditableProgressSnapshots: jest.fn().mockResolvedValue([]),
      updateProgressSnapshot: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IWbsEvmRepository>;
    evmService = new EvmService(mockRepository);
  });

  // 現在進捗90%のライブタスク（plannedManHours=100）
  const liveTask = new TaskEvmData(
    1, 'T001', 'タスク',
    new Date('2025-01-01'), new Date('2025-06-30'),
    new Date('2025-01-01'), new Date('2025-06-30'),
    new Date('2025-01-01'), null,
    100, 100, 0,
    'IN_PROGRESS' as TaskStatus,
    90, 5000, 90,
  );

  const wbsData: WbsEvmData = {
    wbsId: 1,
    projectId: 'P1',
    projectName: 'PJ',
    totalPlannedManHours: 100,
    totalBaseManHours: 100,
    tasks: [liveTask],
    buffers: [],
    settings: null,
  };

  const snap = (
    snapshotAt: string,
    progressRate: number | null,
    overrides: Partial<TaskProgressSnapshotRecord> = {},
  ): TaskProgressSnapshotRecord => ({
    taskId: 1,
    taskNo: 'T001',
    snapshotAt: new Date(snapshotAt),
    progressRate,
    status: 'IN_PROGRESS' as TaskStatus,
    plannedManHours: 100,
    baseManHours: 100,
    costPerHour: 5000,
    plannedStart: new Date('2025-01-01'),
    plannedEnd: new Date('2025-06-30'),
    baseStart: new Date('2025-01-01'),
    baseEnd: new Date('2025-06-30'),
    actualStart: new Date('2025-01-01'),
    actualEnd: null,
    isRemoved: false,
    ...overrides,
  });

  const evOn = (series: { date: Date; ev: number }[], ymd: string): number => {
    const target = series.find((m) => {
      const d = m.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === ymd;
    });
    if (!target) throw new Error(`date not found: ${ymd}`);
    return target.ev;
  };

  it('過去日のEVは現在進捗(90%)ではなく、その時点スナップショットの確定進捗で計算される', async () => {
    mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
    mockRepository.getProgressSnapshots.mockResolvedValue([
      snap('2025-02-01T10:00:00Z', 20),
      snap('2025-03-01T10:00:00Z', 50),
    ]);

    const series = await evmService.getEvmTimeSeries(
      1, new Date('2025-02-05'), new Date('2025-03-15'), 'daily', 'hours', 'SELF_REPORTED',
    );

    // 2/1のsnapshot(20%)が有効な区間 → EV = 100 * 20% = 20
    expect(evOn(series, '2025-02-15')).toBe(20);
    // 3/1のsnapshot(50%)が有効な区間 → EV = 100 * 50% = 50（現在の90%ではない）
    expect(evOn(series, '2025-03-10')).toBe(50);
  });

  it('進捗低下（90%→50%）はEVが下がる（按分されず確定値）', async () => {
    mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
    mockRepository.getProgressSnapshots.mockResolvedValue([
      snap('2025-02-01T10:00:00Z', 90),
      snap('2025-03-01T10:00:00Z', 50),
    ]);

    const series = await evmService.getEvmTimeSeries(
      1, new Date('2025-02-05'), new Date('2025-03-15'), 'daily', 'hours', 'SELF_REPORTED',
    );

    expect(evOn(series, '2025-02-15')).toBe(90);
    expect(evOn(series, '2025-03-10')).toBe(50); // 下がる
  });

  it('tombstone以降はそのタスクの寄与が0になる', async () => {
    mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
    mockRepository.getProgressSnapshots.mockResolvedValue([
      snap('2025-02-01T10:00:00Z', 50),
      snap('2025-03-01T10:00:00Z', null, { isRemoved: true }),
    ]);

    const series = await evmService.getEvmTimeSeries(
      1, new Date('2025-02-05'), new Date('2025-03-15'), 'daily', 'hours', 'SELF_REPORTED',
    );

    expect(evOn(series, '2025-02-15')).toBe(50); // 削除前は再現
    expect(evOn(series, '2025-03-10')).toBe(0); // tombstone以降は寄与0
  });

  it('最初のスナップショットより前の評価日は提案Cフォールバック（ライブ値）になる', async () => {
    mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
    mockRepository.getProgressSnapshots.mockResolvedValue([
      snap('2025-03-01T10:00:00Z', 50),
    ]);

    const series = await evmService.getEvmTimeSeries(
      1, new Date('2025-02-01'), new Date('2025-03-15'), 'daily', 'hours', 'SELF_REPORTED',
    );

    // 2/15はsnapshot(3/1)より前 → フォールバック（ライブ提案C）。
    // ライブEVはreferenceDate=nowの按分で 0〜90 の範囲（snapshot直接の50とは別ロジック）。
    const evFallback = evOn(series, '2025-02-15');
    expect(evFallback).toBeGreaterThanOrEqual(0);
    expect(evFallback).toBeLessThanOrEqual(90);
    // 3/10はsnapshot有効 → 確定50
    expect(evOn(series, '2025-03-10')).toBe(50);
  });
});
