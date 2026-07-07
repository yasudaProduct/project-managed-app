import { EvmService } from '@/applications/evm/evm-service';
import { IWbsEvmRepository, WbsEvmData } from '@/applications/evm/iwbs-evm-repository';

/**
 * 時系列の日付レンジ生成の検証:
 * - 終端補正（最終点がendDate未満で終わらない）
 * - 月次間隔の月末クランプ（累積setMonthによるドリフトが起きない）
 */
describe('EvmService: 時系列日付レンジ', () => {
  let evmService: EvmService;
  let mockRepository: jest.Mocked<IWbsEvmRepository>;

  const emptyWbsData: WbsEvmData = {
    wbsId: 1,
    projectId: 'proj-1',
    projectName: 'テスト',
    totalPlannedManHours: 0,
    totalBaseManHours: 0,
    tasks: [],
    buffers: [],
    settings: null,
    averageCostPerHour: null,
  };

  beforeEach(() => {
    mockRepository = {
      getWbsEvmData: jest.fn().mockResolvedValue(emptyWbsData),
      getTasksEvmData: jest.fn(),
      getActualCostByDate: jest.fn().mockResolvedValue(new Map()),
      getBuffers: jest.fn(),
      getProjectSettings: jest.fn(),
      getProgressSnapshots: jest.fn().mockResolvedValue([]),
      getEditableProgressSnapshots: jest.fn().mockResolvedValue([]),
      updateProgressSnapshot: jest.fn().mockResolvedValue(undefined),
      getCompanyHolidays: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IWbsEvmRepository>;

    evmService = new EvmService(mockRepository);
  });

  it('週次: 刻みが合わない場合でも最終点としてendDateが含まれる', async () => {
    const result = await evmService.getEvmTimeSeries(
      1,
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-10T00:00:00.000Z'),
      'weekly'
    );

    const dates = result.map((m) => m.date.toISOString());
    expect(dates).toEqual([
      '2025-01-01T00:00:00.000Z',
      '2025-01-08T00:00:00.000Z',
      '2025-01-10T00:00:00.000Z',
    ]);
  });

  it('週次: endDateが刻みに一致する場合は重複しない', async () => {
    const result = await evmService.getEvmTimeSeries(
      1,
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-08T00:00:00.000Z'),
      'weekly'
    );

    const dates = result.map((m) => m.date.toISOString());
    expect(dates).toEqual([
      '2025-01-01T00:00:00.000Z',
      '2025-01-08T00:00:00.000Z',
    ]);
  });

  it('月次: 31日開始でもドリフトせず各月の同日（無ければ月末）に刻まれる', async () => {
    const result = await evmService.getEvmTimeSeries(
      1,
      new Date('2025-01-31T00:00:00.000Z'),
      new Date('2025-04-30T00:00:00.000Z'),
      'monthly'
    );

    const dates = result.map((m) => m.date.toISOString());
    expect(dates).toEqual([
      '2025-01-31T00:00:00.000Z',
      '2025-02-28T00:00:00.000Z',
      '2025-03-31T00:00:00.000Z',
      '2025-04-30T00:00:00.000Z',
    ]);
  });

  it('日次: 全日付が生成される', async () => {
    const result = await evmService.getEvmTimeSeries(
      1,
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-03T00:00:00.000Z'),
      'daily'
    );

    expect(result).toHaveLength(3);
  });
});
