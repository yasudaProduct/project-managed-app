import { EvmService } from '@/applications/evm/evm-service';
import { IWbsEvmRepository } from '@/applications/evm/iwbs-evm-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { EvmMetrics } from '@/domains/evm/evm-metrics';
import { WbsEvmData } from '@/applications/evm/iwbs-evm-repository';
import { TaskStatus } from '@/types/wbs';

describe('EvmService', () => {
  let evmService: EvmService;
  let mockRepository: jest.Mocked<IWbsEvmRepository>;

  beforeEach(() => {
    mockRepository = {
      getWbsEvmData: jest.fn(),
      getTasksEvmData: jest.fn(),
      getActualCostByDate: jest.fn(),
      getBuffers: jest.fn(),
      getProjectSettings: jest.fn(),
      getProgressSnapshots: jest.fn().mockResolvedValue([]),
      getEditableProgressSnapshots: jest.fn().mockResolvedValue([]),
      updateProgressSnapshot: jest.fn().mockResolvedValue(undefined),
      getCompanyHolidays: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<IWbsEvmRepository>;

    evmService = new EvmService(mockRepository);
  });

  describe('calculateCurrentEvmMetrics', () => {
    const createMockTask = (overrides?: Partial<{
      taskId: number;
      taskNo: string;
      taskName: string;
      baseStartDate: Date;
      baseEndDate: Date;
      plannedStartDate: Date;
      plannedEndDate: Date;
      actualStartDate: Date | null;
      actualEndDate: Date | null;
      baseManHours: number;
      plannedManHours: number;
      actualManHours: number;
      status: TaskStatus;
      progressRate: number;
      costPerHour: number;
      selfReportedProgress: number | null;
    }>): TaskEvmData => {
      return new TaskEvmData(
        overrides?.taskId ?? 1,
        overrides?.taskNo ?? 'T001',
        overrides?.taskName ?? 'テストタスク',
        overrides?.baseStartDate ?? overrides?.plannedStartDate ?? new Date('2025-01-01'),
        overrides?.baseEndDate ?? overrides?.plannedEndDate ?? new Date('2025-01-10'),
        overrides?.plannedStartDate ?? new Date('2025-01-01'),
        overrides?.plannedEndDate ?? new Date('2025-01-10'),
        overrides?.actualStartDate ?? null,
        overrides?.actualEndDate ?? null,
        overrides?.baseManHours ?? overrides?.plannedManHours ?? 100,
        overrides?.plannedManHours ?? 100,
        overrides?.actualManHours ?? 0,
        overrides?.status ?? 'NOT_STARTED',
        overrides?.progressRate ?? 0,
        overrides?.costPerHour ?? 5000,
        overrides?.selfReportedProgress ?? null
      );
    };

    it('工数ベースでEVMメトリクスを正しく計算する', async () => {
      const evaluationDate = new Date('2025-01-05');
      const tasks = [
        createMockTask({
          taskId: 1,
          plannedStartDate: new Date('2025-01-01'),
          plannedEndDate: new Date('2025-01-10'),
          actualStartDate: new Date('2025-01-01'),
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 50,
        }),
        createMockTask({
          taskId: 2,
          plannedStartDate: new Date('2025-01-01'),
          plannedEndDate: new Date('2025-01-10'),
          actualStartDate: new Date('2025-01-01'),
          plannedManHours: 200,
          status: 'COMPLETED',
          progressRate: 100,
        }),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 300,
        totalBaseManHours: 300,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>([
        ['2025-01-01', 30],
        ['2025-01-02', 30],
        ['2025-01-03', 30],
        ['2025-01-04', 30],
      ]);

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(1, evaluationDate, 'hours');

      // PV: 評価日までの計画値（期間の44.4%）
      // Task1: 100 * (4/9) ≈ 44.4
      // Task2: 200 * (4/9) ≈ 88.8
      // Total: ≈ 133.2
      expect(result.pv).toBeCloseTo(133.3, 0);

      // EV: 完了した作業の出来高
      // Task1: 100 * 0.5 = 50
      // Task2: 200 * 1.0 = 200
      // Total: 250
      expect(result.ev).toBe(250);

      // AC: 実際の投入コスト
      expect(result.ac).toBe(120);

      // BAC: 完了時の予算
      expect(result.bac).toBe(300);

      expect(result.calculationMode).toBe('hours');
      expect(result.progressMethod).toBe('SELF_REPORTED');
    });

    it('金額ベースでEVMメトリクスを正しく計算する', async () => {
      const evaluationDate = new Date('2025-01-05');
      const tasks = [
        createMockTask({
          taskId: 1,
          plannedStartDate: new Date('2025-01-01'),
          plannedEndDate: new Date('2025-01-10'),
          actualStartDate: new Date('2025-01-01'),
          plannedManHours: 100,
          costPerHour: 5000,
          status: 'IN_PROGRESS',
          progressRate: 50,
        }),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>([
        ['2025-01-01', 150000],
        ['2025-01-02', 150000],
      ]);

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(1, evaluationDate, 'cost');

      // PV: 100 * 5000 * (4/9) ≈ 222,222
      expect(result.pv).toBeCloseTo(222222, -1);

      // EV: 100 * 5000 * 0.5 = 250,000
      expect(result.ev).toBe(250000);

      // AC: 300,000
      expect(result.ac).toBe(300000);

      // BAC: 100 * 5000 = 500,000
      expect(result.bac).toBe(500000);

      expect(result.calculationMode).toBe('cost');
    });

    it('ZERO_HUNDRED法を使用してEVMメトリクスを計算する', async () => {
      const evaluationDate = new Date('2025-01-05');
      const tasks = [
        createMockTask({
          taskId: 1,
          plannedManHours: 100,
          status: 'COMPLETED',
          progressRate: 75, // 無視される
          actualStartDate: new Date('2025-01-01'), // EVを計算するために必要
        }),
        createMockTask({
          taskId: 2,
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 50, // 無視される
          actualStartDate: new Date('2025-01-01'), // EVを計算するために必要
        }),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 200,
        totalBaseManHours: 200,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(
        1,
        evaluationDate,
        'hours',
        'ZERO_HUNDRED'
      );

      // EV: Task1 = 100 * 1.0 = 100 (COMPLETED), Task2 = 100 * 0 = 0 (IN_PROGRESS but ZERO_HUNDRED = 0)
      expect(result.ev).toBe(100);
      expect(result.progressMethod).toBe('ZERO_HUNDRED');
    });

    it('FIFTY_FIFTY法を使用してEVMメトリクスを計算する', async () => {
      const evaluationDate = new Date('2025-01-05');
      const tasks = [
        createMockTask({
          taskId: 1,
          plannedManHours: 100,
          status: 'COMPLETED',
          actualStartDate: new Date('2025-01-01'),
        }),
        createMockTask({
          taskId: 2,
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          actualStartDate: new Date('2025-01-01'),
        }),
        createMockTask({
          taskId: 3,
          plannedManHours: 100,
          status: 'NOT_STARTED',
          // NOT_STARTED tasks don't have actualStartDate
        }),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 300,
        totalBaseManHours: 300,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(
        1,
        evaluationDate,
        'hours',
        'FIFTY_FIFTY'
      );

      // EV: Task1 = 100 * 1.0 = 100, Task2 = 100 * 0.5 = 50, Task3 = 100 * 0 = 0
      expect(result.ev).toBe(150);
      expect(result.progressMethod).toBe('FIFTY_FIFTY');
    });

    it('プロジェクト設定から進捗率測定方法を取得する', async () => {
      const evaluationDate = new Date('2025-01-05');
      const tasks = [
        createMockTask({
          taskId: 1,
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 50,
          actualStartDate: new Date('2025-01-01'),
        }),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: {
          progressMeasurementMethod: 'FIFTY_FIFTY',
        },
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(1, evaluationDate, 'hours');

      // プロジェクト設定のFIFTY_FIFTYが使用される
      expect(result.ev).toBe(50); // 100 * 0.5 (FIFTY_FIFTY)
      expect(result.progressMethod).toBe('FIFTY_FIFTY');
    });

    it('引数で指定した進捗率測定方法が優先される', async () => {
      const evaluationDate = new Date('2025-01-05');
      const tasks = [
        createMockTask({
          taskId: 1,
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 50,
          actualStartDate: new Date('2025-01-01'),
        }),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: {
          progressMeasurementMethod: 'FIFTY_FIFTY',
        },
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(
        1,
        evaluationDate,
        'hours',
        'ZERO_HUNDRED'
      );

      // 引数のZERO_HUNDREDが優先される
      expect(result.ev).toBe(0); // 100 * 0 (ZERO_HUNDRED, IN_PROGRESS)
      expect(result.progressMethod).toBe('ZERO_HUNDRED');
    });

    it('バッファ時間をBACに含める（工数ベース）', async () => {
      const evaluationDate = new Date('2025-01-05');
      const tasks = [
        createMockTask({
          taskId: 1,
          plannedManHours: 100,
          status: 'NOT_STARTED',
        }),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [
          { bufferHours: 20 },
          { bufferHours: 30 },
        ],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(1, evaluationDate, 'hours');

      // BAC: 100 + 20 + 30 = 150
      expect(result.bac).toBe(150);
    });

    it('バッファ時間をBACに含める（金額ベース）', async () => {
      const evaluationDate = new Date('2025-01-05');
      const tasks = [
        createMockTask({
          taskId: 1,
          plannedManHours: 100,
          costPerHour: 5000,
          status: 'NOT_STARTED',
        }),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [
          { bufferHours: 20 },
        ],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(1, evaluationDate, 'cost');

      // BAC: (100 * 5000) + (20h × デフォルト単価5,000) = 600,000
      // バッファは単価換算して加算する（設定なし時はAVERAGE_RATE→平均単価不明→デフォルト単価）
      expect(result.bac).toBe(600000);
    });

    it('タスクが空の場合、すべての値が0になる', async () => {
      const evaluationDate = new Date('2025-01-05');
      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 0,
        totalBaseManHours: 0,
        tasks: [],
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.calculateCurrentEvmMetrics(1, evaluationDate, 'hours');

      expect(result.pv).toBe(0);
      expect(result.ev).toBe(0);
      expect(result.ac).toBe(0);
      expect(result.bac).toBe(0);
    });
  });

  describe('getEvmTimeSeries', () => {
    it('日次の時系列データを生成する', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-03');

      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-12-31'),
          null, null,
          100, 100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.getEvmTimeSeries(1, startDate, endDate, 'daily', 'hours');

      expect(result).toHaveLength(3); // 1/1, 1/2, 1/3
      expect(result[0].date).toEqual(new Date('2025-01-01'));
      expect(result[1].date).toEqual(new Date('2025-01-02'));
      expect(result[2].date).toEqual(new Date('2025-01-03'));
    });

    it('週次の時系列データを生成する', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-20');

      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-31'),
          new Date('2025-01-01'), new Date('2025-12-31'),
          null, null,
          100, 100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.getEvmTimeSeries(1, startDate, endDate, 'weekly', 'hours');

      // 週次刻み + 終端補正（endDate=1/20 が最終点として含まれる）
      expect(result).toHaveLength(4); // 1/1, 1/8, 1/15, 1/20
      expect(result[0].date).toEqual(new Date('2025-01-01'));
      expect(result[1].date).toEqual(new Date('2025-01-08'));
      expect(result[2].date).toEqual(new Date('2025-01-15'));
      expect(result[3].date).toEqual(new Date('2025-01-20'));
    });

    it('月次の時系列データを生成する', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-15');

      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-12-31'),
          new Date('2025-01-01'), new Date('2025-12-31'),
          null, null,
          100, 100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.getEvmTimeSeries(1, startDate, endDate, 'monthly', 'hours');

      // 月次刻み + 終端補正（endDate=3/15 が最終点として含まれる）
      expect(result).toHaveLength(4); // 1/1, 2/1, 3/1, 3/15
      expect(result[0].date).toEqual(new Date('2025-01-01'));
      expect(result[1].date).toEqual(new Date('2025-02-01'));
      expect(result[2].date).toEqual(new Date('2025-03-01'));
      expect(result[3].date).toEqual(new Date('2025-03-15'));
    });

    it('進捗率測定方法を指定できる', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-12-31'),
          null, null,
          100, 100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.getEvmTimeSeries(
        1,
        startDate,
        endDate,
        'daily',
        'hours',
        'FIFTY_FIFTY'
      );

      expect(result).toHaveLength(2);
      expect(result[0].progressMethod).toBe('FIFTY_FIFTY');
      expect(result[1].progressMethod).toBe('FIFTY_FIFTY');
    });
  });

  describe('getEvmTimeSeries - 予測モード', () => {
    const createMockTask = (overrides?: Partial<{
      taskId: number;
      plannedStartDate: Date;
      plannedEndDate: Date;
      actualStartDate: Date | null;
      plannedManHours: number;
      status: TaskStatus;
      progressRate: number;
      costPerHour: number;
    }>): TaskEvmData => {
      return new TaskEvmData(
        overrides?.taskId ?? 1,
        'T001',
        'Task1',
        overrides?.plannedStartDate ?? new Date('2025-01-01'),
        overrides?.plannedEndDate ?? new Date('2025-03-31'),
        overrides?.plannedStartDate ?? new Date('2025-01-01'),
        overrides?.plannedEndDate ?? new Date('2025-03-31'),
        overrides?.actualStartDate ?? new Date('2025-01-01'),
        null,
        overrides?.plannedManHours ?? 100,
        overrides?.plannedManHours ?? 100,
        0,
        overrides?.status ?? 'IN_PROGRESS',
        overrides?.progressRate ?? 50,
        overrides?.costPerHour ?? 5000,
        overrides?.progressRate ?? 50
      );
    };

    it('予測モードが有効な場合、未来日付にisPredicted=trueが設定される', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1週間後
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1週間前

      const tasks = [
        createMockTask({
          plannedStartDate: new Date('2025-01-01'),
          plannedEndDate: new Date('2025-12-31'),
          actualStartDate: new Date('2025-01-01'),
          plannedManHours: 1000,
          status: 'IN_PROGRESS',
          progressRate: 50,
        }),
      ];

      const wbsData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: 1000,
        totalBaseManHours: 1000,
        tasks,
        buffers: [],
        settings: null,
      };

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map([['2025-01-01', 50]]));

      const result = await evmService.getEvmTimeSeries(
        1, pastDate, futureDate, 'weekly', 'hours', undefined, true
      );

      // 過去の日付はisPredicted=false
      const pastMetrics = result.filter(m => m.date <= now);
      pastMetrics.forEach(m => expect(m.isPredicted).toBe(false));

      // 未来の日付はisPredicted=true
      const futureMetrics = result.filter(m => m.date > now);
      futureMetrics.forEach(m => expect(m.isPredicted).toBe(true));
    });

    it('予測モードが無効の場合、isPredicted=falseのまま', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const tasks = [
        createMockTask({
          plannedStartDate: new Date('2025-01-01'),
          plannedEndDate: new Date('2025-12-31'),
          actualStartDate: new Date('2025-01-01'),
          plannedManHours: 1000,
          status: 'IN_PROGRESS',
          progressRate: 50,
        }),
      ];

      const wbsData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: 1000,
        totalBaseManHours: 1000,
        tasks,
        buffers: [],
        settings: null,
      };

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map());

      const result = await evmService.getEvmTimeSeries(
        1, pastDate, futureDate, 'weekly', 'hours', undefined, false
      );

      result.forEach(m => expect(m.isPredicted).toBe(false));
    });

    it('予測EVはBACを超えない', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const tasks = [
        createMockTask({
          plannedStartDate: new Date('2025-01-01'),
          plannedEndDate: new Date('2025-12-31'),
          actualStartDate: new Date('2025-01-01'),
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 90, // 高進捗率
        }),
      ];

      const wbsData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map([['2025-06-01', 80]]));

      const result = await evmService.getEvmTimeSeries(
        1, now, futureDate, 'weekly', 'hours', undefined, true
      );

      const futureMetrics = result.filter(m => m.isPredicted);
      futureMetrics.forEach(m => {
        expect(m.ev).toBeLessThanOrEqual(m.bac);
      });
    });
  });

  describe('calculateCurrentEvmMetrics - 追加エッジケース', () => {
    it('複数タスクでcostPerHourが異なる場合のBAC計算（金額ベース）', async () => {
      const evaluationDate = new Date('2025-01-15');
      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), null,
          100, 100, 0,
          'IN_PROGRESS', 50, 3000, 50
        ),
        new TaskEvmData(
          2, 'T002', 'Task2',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), null,
          200, 200, 0,
          'NOT_STARTED', 0, 8000, null
        ),
      ];

      const wbsData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: 300,
        totalBaseManHours: 300,
        tasks,
        buffers: [],
        settings: null,
      };

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map());

      const result = await evmService.calculateCurrentEvmMetrics(1, evaluationDate, 'cost');

      // BAC: 100*3000 + 200*8000 = 300,000 + 1,600,000 = 1,900,000
      expect(result.bac).toBe(1900000);
    });

    it('デフォルトの評価日はnew Date()（現在時刻）', async () => {
      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-12-31'),
          new Date('2025-01-01'), new Date('2025-12-31'),
          new Date('2025-01-01'), null,
          100, 100, 0,
          'IN_PROGRESS', 50, 5000, 50
        ),
      ];

      const wbsData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map());

      const before = new Date();
      const result = await evmService.calculateCurrentEvmMetrics(1);
      const after = new Date();

      expect(result.date.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.date.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getTaskEvmDetails', () => {
    it('タスク別のEVMデータを取得する', async () => {
      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-01-10'),
          null, null,
          100, 100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
        new TaskEvmData(
          2, 'T002', 'Task2',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-01-10'),
          null, null,
          200, 200, 0,
          'COMPLETED', 100,
          5000, null
        ),
      ];

      mockRepository.getTasksEvmData.mockResolvedValue(tasks);

      const result = await evmService.getTaskEvmDetails(1);

      expect(result).toHaveLength(2);
      expect(result[0].taskId).toBe(1);
      expect(result[1].taskId).toBe(2);
    });
  });

  describe('getHealthStatus', () => {
    it('healthy状態を正しく判定する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 95,
        ac: 100,
        bac: 200,
      });

      const result = evmService.getHealthStatus(metrics);

      expect(result).toBe('healthy');
    });

    it('warning状態を正しく判定する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 85,
        ac: 100,
        bac: 200,
      });

      const result = evmService.getHealthStatus(metrics);

      expect(result).toBe('warning');
    });

    it('critical状態を正しく判定する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 75,
        ac: 100,
        bac: 200,
      });

      const result = evmService.getHealthStatus(metrics);

      expect(result).toBe('critical');
    });
  });

  describe('getEvmTimeSeries - 予測計算ロジック詳細', () => {
    // タスク: start=2025-03-07, end=2025-09-23 (200日間), plannedManHours=200
    // now=2025-06-15 (100日経過) → PV(now)=100
    // future=2025-06-22 (107日経過) → PV(future)=107
    // pvIncrement = 7, BAC = 200
    const TASK_START = new Date('2025-03-07T00:00:00.000Z');
    const TASK_END = new Date('2025-09-23T00:00:00.000Z');
    const NOW = new Date('2025-06-15T00:00:00.000Z');
    const PV_AT_NOW = 100;    // 200 * 100/200
    const PV_AT_FUTURE = 107; // 200 * 107/200
    const PV_INCREMENT = 7;
    const BAC = 200;

    /**
     * 予測テスト共通セットアップ
     * - fakeTimerで「現在時刻」を固定
     * - リポジトリモックでタスクデータとACを設定
     * - 週次で [now, now+7d] の2データポイントを生成
     * @param progressRate タスクの進捗率 (EV = BAC * progressRate/100)
     * @param ac 累積AC（nowまで）
     */
    const setupPredictionTest = (progressRate: number, ac: number) => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW);

      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          TASK_START, TASK_END,
          TASK_START, TASK_END,
          TASK_START, null,
          BAC, BAC, 0,
          'IN_PROGRESS' as TaskStatus,
          progressRate, 5000, progressRate
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: BAC,
        totalBaseManHours: BAC,
        tasks,
        buffers: [],
        settings: null,
      };

      // ACは nowまでの日付キーで設定（累積値として1エントリ）
      const actualCostMap = new Map<string, number>();
      if (ac > 0) {
        actualCostMap.set('2025-03-07', ac);
      }

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const startDate = new Date('2025-06-15T00:00:00.000Z');
      const endDate = new Date('2025-06-22T00:00:00.000Z');

      const ev = BAC * progressRate / 100;
      const spi = ev / PV_AT_NOW;
      const cpi = ac === 0 ? 0 : ev / ac;

      return { startDate, endDate, ev, spi, cpi };
    };

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    describe('予測EV計算', () => {
      it('SPI=1.0の場合、PV増分と同量のEV増加', async () => {
        // progressRate=50 → EV=100, SPI=100/100=1.0
        // predictedEV = min(200, 100 + 7*1.0) = 107
        const { startDate, endDate, ev } = setupPredictionTest(50, 100);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted).toBeDefined();
        expect(predicted!.ev).toBe(ev + PV_INCREMENT * 1.0);
      });

      it('SPI<1の場合、PV増分×SPIのEV増加', async () => {
        // progressRate=40 → EV=80, SPI=80/100=0.8
        // predictedEV = min(200, 80 + 7*0.8) = 85.6
        const { startDate, endDate, ev, spi } = setupPredictionTest(40, 100);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBeCloseTo(ev + PV_INCREMENT * spi, 5);
      });

      it('SPI>1の場合、PV増分以上のEV増加', async () => {
        // progressRate=60 → EV=120, SPI=120/100=1.2
        // predictedEV = min(200, 120 + 7*1.2) = 128.4
        const { startDate, endDate, ev, spi } = setupPredictionTest(60, 80);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBeCloseTo(ev + PV_INCREMENT * spi, 5);
      });

      it('SPI=0の場合、EVは増加しない', async () => {
        // progressRate=0 → EV=0, SPI=0
        // predictedEV = min(200, 0 + 7*0) = 0
        const { startDate, endDate } = setupPredictionTest(0, 50);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(0);
      });

      it('予測EVがBAC超過時、BACにクランプされる', async () => {
        // progressRate=95 → EV=190, SPI=190/100=1.9
        // predictedEV = min(200, 190 + 7*1.9) = min(200, 203.3) = 200
        const { startDate, endDate } = setupPredictionTest(95, 200);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(BAC);
      });

      it('pvIncrement=0の場合、EV不変（タスク期間終了後）', async () => {
        // タスク終了後の期間でテスト → PV(now)=PV(future)=BAC → pvIncrement=0
        jest.useRealTimers(); // setupのfakeTimerをリセット
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-10-01T00:00:00.000Z'));

        const tasks = [
          new TaskEvmData(
            1, 'T001', 'Task1',
            TASK_START, TASK_END, TASK_START, TASK_END,
            TASK_START, null,
            BAC, BAC, 0,
            'IN_PROGRESS' as TaskStatus, 60, 5000, 60
          ),
        ];
        const wbsData: WbsEvmData = {
          wbsId: 1, projectId: 'proj-1', projectName: 'Test',
          totalPlannedManHours: BAC, totalBaseManHours: BAC, tasks, buffers: [], settings: null,
        };
        mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
        mockRepository.getActualCostByDate.mockResolvedValue(new Map([['2025-03-07', 100]]));

        const result = await evmService.getEvmTimeSeries(
          1,
          new Date('2025-10-01T00:00:00.000Z'),
          new Date('2025-10-08T00:00:00.000Z'),
          'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        // pvIncrement=0なので、EV = currentMetrics.ev のまま
        expect(predicted!.ev).toBe(BAC * 0.6); // EV=120
      });
    });

    describe('予測AC計算', () => {
      it('CPI=1.0の場合、AC増加=EV増加', async () => {
        // progressRate=50 → EV=100, AC=100, SPI=1.0, CPI=1.0
        // predictedEV = 107, evIncrement=7
        // predictedAC = 100 + 7/1.0 = 107
        const { startDate, endDate } = setupPredictionTest(50, 100);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ac).toBe(107);
      });

      it('CPI<1の場合、AC増加>EV増加（コスト超過傾向）', async () => {
        // progressRate=50 → EV=100, AC=125, SPI=1.0, CPI=100/125=0.8
        // predictedEV = 107, evIncrement=7
        // predictedAC = 125 + 7/0.8 = 133.75
        const { startDate, endDate } = setupPredictionTest(50, 125);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ac).toBeCloseTo(125 + PV_INCREMENT / 0.8, 5);
      });

      it('CPI>1の場合、AC増加<EV増加（コスト効率良好）', async () => {
        // progressRate=60 → EV=120, AC=80, SPI=1.2, CPI=120/80=1.5
        // pvIncrement=7, predictedEvIncrement=7*1.2=8.4
        // predictedEV = 128.4, evIncrement=8.4
        // predictedAC = 80 + 8.4/1.5 = 85.6
        const { startDate, endDate, spi, cpi } = setupPredictionTest(60, 80);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        const evIncrement = PV_INCREMENT * spi;
        expect(predicted!.ac).toBeCloseTo(80 + evIncrement / cpi, 5);
      });

      it('CPI=0の場合、effectiveCPI=1にフォールバック', async () => {
        // progressRate=25 → EV=50, AC=0, SPI=50/100=0.5, CPI=0 → effectiveCPI=1
        // pvIncrement=7, predictedEvIncrement=7*0.5=3.5
        // predictedEV = 53.5, evIncrement=3.5
        // predictedAC = 0 + 3.5/1 = 3.5
        const { startDate, endDate, ev, spi } = setupPredictionTest(25, 0);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        const evIncrement = PV_INCREMENT * spi;
        expect(predicted!.ev).toBeCloseTo(ev + evIncrement, 5);
        expect(predicted!.ac).toBeCloseTo(evIncrement, 5); // effectiveCPI=1
      });

      it('EV増分=0の場合、ACも増加しない', async () => {
        // progressRate=100 → EV=200=BAC, AC=200, SPI=2.0
        // predictedEV = min(200, 200+7*2.0) = 200 (BACクランプ)
        // evIncrement = 0
        // predictedAC = 200
        const { startDate, endDate } = setupPredictionTest(100, 200);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(BAC);
        expect(predicted!.ac).toBe(200);
      });
    });

    describe('予測メトリクスのPV/BAC参照元', () => {
      it('PVは未来日付のPVを使用する', async () => {
        const { startDate, endDate } = setupPredictionTest(50, 100);

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.pv).toBe(PV_AT_FUTURE);
      });
    });
  });

  describe('forecastMethod（EVM予測計算方式）', () => {
    const createMockTask = (overrides?: Partial<{
      taskId: number;
      plannedStartDate: Date;
      plannedEndDate: Date;
      actualStartDate: Date | null;
      plannedManHours: number;
      status: string;
      progressRate: number;
    }>): TaskEvmData => {
      return new TaskEvmData(
        overrides?.taskId ?? 1,
        'T001',
        'テストタスク',
        overrides?.plannedStartDate ?? new Date('2025-01-01'),
        overrides?.plannedEndDate ?? new Date('2025-01-31'),
        overrides?.plannedStartDate ?? new Date('2025-01-01'),
        overrides?.plannedEndDate ?? new Date('2025-01-31'),
        overrides?.actualStartDate ?? new Date('2025-01-01'),
        null,
        overrides?.plannedManHours ?? 100,
        overrides?.plannedManHours ?? 100,
        0,
        (overrides?.status ?? 'IN_PROGRESS') as TaskStatus,
        overrides?.progressRate ?? 50,
        5000,
        overrides?.progressRate ?? 50,
      );
    };

    const setupMockData = (evmForecastMethod: 'CPI_ONLY' | 'CPI_SPI' | 'PLANNED') => {
      const tasks = [createMockTask()];
      const wbsData: WbsEvmData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'テストプロジェクト',
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: {
          projectId: 'proj-1',
          progressMeasurementMethod: 'SELF_REPORTED',
          forecastCalculationMethod: 'REALISTIC',
          evmForecastMethod,
        },
      };
      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map([['2025-01-15', 60]]));
    };

    it('ProjectSettingsのevmForecastMethodがEvmMetricsに渡される', async () => {
      setupMockData('CPI_SPI');

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'hours'
      );

      expect(result.forecastMethod).toBe('CPI_SPI');
    });

    it('引数のforecastMethodが設定値をオーバーライドする', async () => {
      setupMockData('CPI_SPI'); // 設定はCPI_SPI

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'hours', undefined, 'PLANNED' // 引数でPLANNED指定
      );

      expect(result.forecastMethod).toBe('PLANNED');
    });

    it('設定がnullの場合、デフォルトCPI_ONLYが使用される', async () => {
      const tasks = [createMockTask()];
      const wbsData: WbsEvmData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'テストプロジェクト',
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };
      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map());

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'hours'
      );

      expect(result.forecastMethod).toBe('CPI_ONLY');
    });

    it('CPI_ONLY方式でETC/EACが正しく計算される', async () => {
      setupMockData('CPI_ONLY');

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'hours'
      );

      // ETCは(BAC-EV)/CPIで計算される
      if (result.cpi !== null && result.cpi > 0) {
        expect(result.etc).toBeCloseTo((result.bac - result.ev) / result.cpi, 1);
      }
      expect(result.eac).toBeCloseTo(result.ac + result.etc, 1);
    });

    it('CPI_SPI方式でETC/EACが正しく計算される', async () => {
      setupMockData('CPI_SPI');

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'hours'
      );

      if (result.cpi !== null && result.cpi > 0 && result.spi !== null && result.spi > 0) {
        expect(result.etc).toBeCloseTo(
          (result.bac - result.ev) / (result.cpi * result.spi), 1
        );
      }
      expect(result.eac).toBeCloseTo(result.ac + result.etc, 1);
    });

    it('PLANNED方式でETC/EACが正しく計算される', async () => {
      setupMockData('PLANNED');

      const result = await evmService.calculateCurrentEvmMetrics(
        1, new Date('2025-01-15'), 'hours'
      );

      expect(result.etc).toBeCloseTo(result.bac - result.ev, 1);
      expect(result.eac).toBeCloseTo(result.ac + result.etc, 1);
    });

    it('予測ポイントにもforecastMethodが適用される', async () => {
      setupMockData('CPI_SPI');

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T00:00:00.000Z'));

      const result = await evmService.getEvmTimeSeries(
        1,
        new Date('2025-01-08T00:00:00.000Z'),
        new Date('2025-01-22T00:00:00.000Z'),
        'weekly',
        'hours',
        undefined,
        true, // includePrediction
        'CPI_SPI'
      );

      const predicted = result.filter(m => m.isPredicted);
      predicted.forEach(m => {
        expect(m.forecastMethod).toBe('CPI_SPI');
      });

      jest.useRealTimers();
    });
  });

  describe('getEvmTimeSeries - パフォーマンス最適化', () => {
    it('getWbsEvmDataを1回だけ呼ぶ', async () => {
      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-01-10'),
          null, null,
          100, 100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map());

      await evmService.getEvmTimeSeries(
        1,
        new Date('2025-01-01'),
        new Date('2025-01-05'),
        'daily',
        'hours'
      );

      // 5日間のデータポイントでも、getWbsEvmDataは1回だけ呼ばれる
      expect(mockRepository.getWbsEvmData).toHaveBeenCalledTimes(1);
    });

    it('getActualCostByDateを1回だけ呼ぶ', async () => {
      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-01-10'),
          null, null,
          100, 100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(new Map());

      await evmService.getEvmTimeSeries(
        1,
        new Date('2025-01-01'),
        new Date('2025-01-05'),
        'daily',
        'hours'
      );

      // 5日間のデータポイントでも、getActualCostByDateは1回だけ呼ばれる
      expect(mockRepository.getActualCostByDate).toHaveBeenCalledTimes(1);
    });

    it('累積ACが正しく計算される（日次コストの累積）', async () => {
      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), new Date('2025-01-10'),
          new Date('2025-01-01'), null,
          100, 100, 0,
          'IN_PROGRESS', 50,
          5000, 50
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        projectId: 'proj-1',
        projectName: 'Test',
        totalPlannedManHours: 100,
        totalBaseManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      // 日次コスト: 1/1=10, 1/2=20, 1/3=30
      const actualCostMap = new Map<string, number>([
        ['2025-01-01', 10],
        ['2025-01-02', 20],
        ['2025-01-03', 30],
      ]);

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.getEvmTimeSeries(
        1,
        new Date('2025-01-01'),
        new Date('2025-01-03'),
        'daily',
        'hours'
      );

      expect(result).toHaveLength(3);
      // 1/1: AC = 10（累積）
      expect(result[0].ac).toBe(10);
      // 1/2: AC = 10 + 20 = 30（累積）
      expect(result[1].ac).toBe(30);
      // 1/3: AC = 10 + 20 + 30 = 60（累積）
      expect(result[2].ac).toBe(60);
    });
  });

  describe('updateProgressSnapshot（進捗スナップショット訂正）', () => {
    it('正常系: progressRate/status をリポジトリへそのまま委譲する', async () => {
      await evmService.updateProgressSnapshot(10, 50, 'IN_PROGRESS');

      expect(mockRepository.updateProgressSnapshot).toHaveBeenCalledWith(
        10,
        50,
        'IN_PROGRESS'
      );
    });

    it('正常系: progressRate=null（クリア）を許容する', async () => {
      await evmService.updateProgressSnapshot(10, null, 'NOT_STARTED');

      expect(mockRepository.updateProgressSnapshot).toHaveBeenCalledWith(
        10,
        null,
        'NOT_STARTED'
      );
    });

    it('境界値: 0 と 100 は許容する', async () => {
      await evmService.updateProgressSnapshot(1, 0, 'NOT_STARTED');
      await evmService.updateProgressSnapshot(2, 100, 'COMPLETED');

      expect(mockRepository.updateProgressSnapshot).toHaveBeenCalledTimes(2);
    });

    it('範囲外（負の値）は例外を投げ、リポジトリを呼ばない', async () => {
      await expect(
        evmService.updateProgressSnapshot(10, -1, 'IN_PROGRESS')
      ).rejects.toThrow();
      expect(mockRepository.updateProgressSnapshot).not.toHaveBeenCalled();
    });

    it('範囲外（100超）は例外を投げ、リポジトリを呼ばない', async () => {
      await expect(
        evmService.updateProgressSnapshot(10, 101, 'IN_PROGRESS')
      ).rejects.toThrow();
      expect(mockRepository.updateProgressSnapshot).not.toHaveBeenCalled();
    });

    it('getEditableProgressSnapshots はリポジトリへ委譲する', async () => {
      await evmService.getEditableProgressSnapshots(123);
      expect(mockRepository.getEditableProgressSnapshots).toHaveBeenCalledWith(123);
    });
  });

});

