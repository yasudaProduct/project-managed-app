import { EvmService } from '@/applications/evm/evm-service';
import { IWbsEvmRepository, WbsEvmData } from '@/applications/evm/iwbs-evm-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';

/**
 * Earned Schedule（予測完了日）と予測線のBAC到達延長の検証。
 *
 * 前提タスク: 100h、計画期間 2025-01-01〜2025-01-11（10日間・暦日按分）
 * 現在: 2025-01-06（経過5日、計画PV=50h）、自己申告進捗25% → EV=25h
 * ES: PV曲線上でEV=25hに達するのは経過2.5日目 → SPIt = 2.5/5 = 0.5
 * 予測完了日: 開始 + 10日/0.5 = 開始+20日 = 2025-01-21
 */
describe('EvmService: 予測完了日（Earned Schedule）と予測線延長', () => {
  const fakeNow = new Date('2025-01-06T00:00:00.000Z');

  let evmService: EvmService;
  let mockRepository: jest.Mocked<IWbsEvmRepository>;

  const makeTask = (overrides?: {
    actualStartDate?: Date | null;
    progressRate?: number;
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  }): TaskEvmData =>
    new TaskEvmData(
      1,
      'D1-0001',
      'テストタスク',
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-11T00:00:00.000Z'),
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-11T00:00:00.000Z'),
      overrides?.actualStartDate === undefined
        ? new Date('2025-01-01T00:00:00.000Z')
        : overrides.actualStartDate,
      null,
      100,
      100,
      0,
      overrides?.status ?? 'IN_PROGRESS',
      overrides?.progressRate ?? 25,
      5000,
      overrides?.progressRate ?? 25
    );

  const makeWbsData = (overrides: Partial<WbsEvmData> = {}): WbsEvmData => ({
    wbsId: 1,
    projectId: 'proj-1',
    projectName: 'テスト',
    totalPlannedManHours: 100,
    totalBaseManHours: 100,
    tasks: [makeTask()],
    buffers: [],
    settings: null,
    averageCostPerHour: null,
    ...overrides,
  });

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
      getWbsEvmData: jest.fn().mockResolvedValue(makeWbsData()),
      getTasksEvmData: jest.fn(),
      getActualCostByDate: jest.fn().mockResolvedValue(new Map()),
      getActualCostByTask: jest.fn().mockResolvedValue(new Map()),
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

  it('SPIt=0.5のとき予測完了日は計画期間の2倍の位置になる', async () => {
    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      interval: 'daily',
      showPrediction: true,
    });

    const forecast = result.scheduleForecast;
    expect(forecast.status).toBe('ok');
    expect(forecast.forecastCompletionDate?.toISOString()).toBe(
      '2025-01-21T00:00:00.000Z'
    );
    expect(forecast.plannedEndDate?.toISOString()).toBe(
      '2025-01-11T00:00:00.000Z'
    );
    expect(forecast.delayDays).toBe(10);
    expect(forecast.spiT).toBeCloseTo(0.5, 5);
  });

  it('予測線が計画終了日を超えて予測完了日まで延長され、終端でEVがBACに到達する', async () => {
    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      interval: 'daily',
      showPrediction: true,
    });

    const last = result.timeSeries[result.timeSeries.length - 1];
    expect(last.date.toISOString()).toBe('2025-01-21T00:00:00.000Z');
    expect(last.isPredicted).toBe(true);
    expect(last.ev).toBeCloseTo(100, 5); // BAC（バッファなし）に到達

    // 計画終了日(1/11)時点の予測EV=50から線形に増える（中間点1/16で75）
    const mid = result.timeSeries.find(
      (m) => m.date.toISOString() === '2025-01-16T00:00:00.000Z'
    );
    expect(mid).toBeDefined();
    expect(mid!.ev).toBeCloseTo(75, 5);
  });

  it('showPrediction=falseでは延長されない', async () => {
    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      interval: 'daily',
      showPrediction: false,
    });

    const last = result.timeSeries[result.timeSeries.length - 1];
    expect(last.date.toISOString()).toBe('2025-01-11T00:00:00.000Z');
  });

  it('開始前（AT<=0）はnot_startedを返す', async () => {
    jest.setSystemTime(new Date('2024-12-25T00:00:00.000Z'));
    mockRepository.getWbsEvmData.mockResolvedValue(
      makeWbsData({
        tasks: [makeTask({ actualStartDate: null, progressRate: 0, status: 'NOT_STARTED' })],
      })
    );

    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      showPrediction: true,
    });

    expect(result.scheduleForecast.status).toBe('not_started');
    expect(result.scheduleForecast.forecastCompletionDate).toBeNull();
  });

  it('EV=0（進捗なし）はno_progressを返す', async () => {
    mockRepository.getWbsEvmData.mockResolvedValue(
      makeWbsData({
        tasks: [makeTask({ actualStartDate: null, progressRate: 0, status: 'NOT_STARTED' })],
      })
    );

    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      showPrediction: true,
    });

    expect(result.scheduleForecast.status).toBe('no_progress');
    expect(result.scheduleForecast.forecastCompletionDate).toBeNull();
  });

  it('全量完了（EV>=総PV）はcompleted_scopeを返す', async () => {
    mockRepository.getWbsEvmData.mockResolvedValue(
      makeWbsData({
        tasks: [makeTask({ progressRate: 100, status: 'COMPLETED' })],
      })
    );

    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      showPrediction: true,
    });

    expect(result.scheduleForecast.status).toBe('completed_scope');
  });

  it('タスクなしはno_planを返す', async () => {
    mockRepository.getWbsEvmData.mockResolvedValue(makeWbsData({ tasks: [] }));

    const result = await evmService.getEvmDashboardData(1, {
      periodMode: 'project',
      showPrediction: true,
    });

    expect(result.scheduleForecast.status).toBe('no_plan');
  });
});
