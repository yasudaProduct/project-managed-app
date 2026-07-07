import { EvmService } from '@/applications/evm/evm-service';
import {
  IWbsEvmRepository,
  WbsEvmData,
  ProjectSettingsData,
} from '@/applications/evm/iwbs-evm-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { TaskStatus } from '@/types/wbs';

/**
 * プロジェクト設定に基づくEVM計算の検証:
 * - バッファ金額換算方式（evmBufferCostMethod）
 * - ヘルス判定しきい値（evmHealthyThresholdPct / evmWarningThresholdPct）
 * - 営業日ベースPV按分（evmPvDistribution = BUSINESS_DAYS）
 */
describe('EvmService: プロジェクト設定連動', () => {
  let evmService: EvmService;
  let mockRepository: jest.Mocked<IWbsEvmRepository>;

  const makeSettings = (
    overrides: Partial<ProjectSettingsData> = {}
  ): ProjectSettingsData => ({
    projectId: 'proj-1',
    progressMeasurementMethod: 'SELF_REPORTED',
    forecastCalculationMethod: 'REALISTIC',
    evmForecastMethod: 'CPI_ONLY',
    ...overrides,
  });

  const makeTask = (overrides?: {
    plannedStartDate?: Date;
    plannedEndDate?: Date;
    actualStartDate?: Date | null;
    status?: TaskStatus;
    progressRate?: number;
  }): TaskEvmData =>
    new TaskEvmData(
      1,
      'D1-0001',
      'テストタスク',
      overrides?.plannedStartDate ?? new Date('2025-01-01'),
      overrides?.plannedEndDate ?? new Date('2025-01-10'),
      overrides?.plannedStartDate ?? new Date('2025-01-01'),
      overrides?.plannedEndDate ?? new Date('2025-01-10'),
      overrides?.actualStartDate ?? new Date('2025-01-01'),
      null,
      100,
      100,
      0,
      overrides?.status ?? 'IN_PROGRESS',
      overrides?.progressRate ?? 50,
      5000,
      overrides?.progressRate ?? 50
    );

  const makeWbsData = (overrides: Partial<WbsEvmData> = {}): WbsEvmData => ({
    wbsId: 1,
    projectId: 'proj-1',
    projectName: 'テストプロジェクト',
    totalPlannedManHours: 100,
    totalBaseManHours: 100,
    tasks: [makeTask()],
    buffers: [],
    settings: makeSettings(),
    averageCostPerHour: null,
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      getWbsEvmData: jest.fn(),
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

  describe('バッファの金額換算（evmBufferCostMethod）', () => {
    const buffer = { id: 1, name: 'リスクバッファ', bufferHours: 20, bufferType: 'RISK' };

    it('AVERAGE_RATE: WBS平均単価で換算する', async () => {
      mockRepository.getWbsEvmData.mockResolvedValue(
        makeWbsData({
          buffers: [buffer],
          averageCostPerHour: 6000,
          settings: makeSettings({ evmBufferCostMethod: 'AVERAGE_RATE' }),
        })
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'cost'
      );

      // タスク: 100h × 5000 = 500,000 + バッファ: 20h × 6000 = 120,000
      expect(result.bac).toBe(620000);
    });

    it('AVERAGE_RATE: 平均単価が算出不能（担当者なし）ならデフォルト単価で換算する', async () => {
      mockRepository.getWbsEvmData.mockResolvedValue(
        makeWbsData({
          buffers: [buffer],
          averageCostPerHour: null,
          settings: makeSettings({ evmBufferCostMethod: 'AVERAGE_RATE' }),
        })
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'cost'
      );

      // 500,000 + 20h × 5000（デフォルト） = 600,000
      expect(result.bac).toBe(600000);
    });

    it('DEFAULT_RATE: デフォルト単価（¥5,000）で換算する', async () => {
      mockRepository.getWbsEvmData.mockResolvedValue(
        makeWbsData({
          buffers: [buffer],
          averageCostPerHour: 6000,
          settings: makeSettings({ evmBufferCostMethod: 'DEFAULT_RATE' }),
        })
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'cost'
      );

      expect(result.bac).toBe(600000);
    });

    it('EXCLUDE: 金額モードのBACにバッファを含めない', async () => {
      mockRepository.getWbsEvmData.mockResolvedValue(
        makeWbsData({
          buffers: [buffer],
          averageCostPerHour: 6000,
          settings: makeSettings({ evmBufferCostMethod: 'EXCLUDE' }),
        })
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'cost'
      );

      expect(result.bac).toBe(500000);
    });

    it('工数モードでは換算方式に関わらず時間のまま加算する', async () => {
      mockRepository.getWbsEvmData.mockResolvedValue(
        makeWbsData({
          buffers: [buffer],
          averageCostPerHour: 6000,
          settings: makeSettings({ evmBufferCostMethod: 'AVERAGE_RATE' }),
        })
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'hours'
      );

      expect(result.bac).toBe(120); // 100h + 20h
    });
  });

  describe('ヘルス判定しきい値（evmHealthyThresholdPct / evmWarningThresholdPct）', () => {
    it('しきい値を上げると同じSPI/CPIでも判定が下がる', async () => {
      // SPI = CPI = 0.92 になるタスク構成（評価日は計画期間後 → PV=100、EV=92、AC=100）
      const wbsData = makeWbsData({
        tasks: [makeTask({ progressRate: 92 })],
        settings: makeSettings({
          evmHealthyThresholdPct: 95,
          evmWarningThresholdPct: 90,
        }),
      });
      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(
        new Map([['2025-01-10', 100]])
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-06-01'), 'hours'
      );

      expect(result.spi).toBeCloseTo(0.92, 5);
      expect(result.cpi).toBeCloseTo(0.92, 5);
      // デフォルト(90/80)ならhealthyだが、95/90設定ではwarning
      expect(result.healthStatus).toBe('warning');
    });

    it('しきい値未設定時はデフォルト（90/80）で判定する', async () => {
      const wbsData = makeWbsData({
        tasks: [makeTask({ progressRate: 92 })],
      });
      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(
        new Map([['2025-01-10', 100]])
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-06-01'), 'hours'
      );

      expect(result.healthStatus).toBe('healthy');
    });
  });

  describe('営業日ベースPV按分（evmPvDistribution = BUSINESS_DAYS）', () => {
    // 2026-02-02(月) 〜 2026-02-09(月)。営業日は (2/2, 2/9] = {2/3, 2/4, 2/5, 2/6, 2/9} の5日
    const bizTask = makeTask({
      plannedStartDate: new Date('2026-02-02'),
      plannedEndDate: new Date('2026-02-09'),
      actualStartDate: null,
      status: 'NOT_STARTED',
      progressRate: 0,
    });

    it('土日を除いた営業日数でPVを按分する', async () => {
      mockRepository.getWbsEvmData.mockResolvedValue(
        makeWbsData({
          tasks: [bizTask],
          settings: makeSettings({ evmPvDistribution: 'BUSINESS_DAYS' }),
        })
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2026-02-04'), 'hours'
      );

      // 経過営業日 {2/3, 2/4} = 2、総営業日 5 → PV = 100 × 2/5 = 40
      // （暦日按分なら 2/7 ≈ 28.6）
      expect(result.pv).toBeCloseTo(40, 5);
    });

    it('会社休日も営業日から除外する', async () => {
      mockRepository.getWbsEvmData.mockResolvedValue(
        makeWbsData({
          tasks: [bizTask],
          settings: makeSettings({ evmPvDistribution: 'BUSINESS_DAYS' }),
        })
      );
      mockRepository.getCompanyHolidays.mockResolvedValue([
        new Date('2026-02-04'),
      ]);

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2026-02-04'), 'hours'
      );

      // 経過営業日 {2/3} = 1、総営業日 {2/3, 2/5, 2/6, 2/9} = 4 → PV = 25
      expect(result.pv).toBeCloseTo(25, 5);
    });

    it('CALENDAR（デフォルト）では従来の暦日按分のまま', async () => {
      mockRepository.getWbsEvmData.mockResolvedValue(
        makeWbsData({ tasks: [bizTask] })
      );

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2026-02-04'), 'hours'
      );

      // 暦日: 経過2日 / 総7日
      expect(result.pv).toBeCloseTo(100 * (2 / 7), 5);
    });
  });
});
