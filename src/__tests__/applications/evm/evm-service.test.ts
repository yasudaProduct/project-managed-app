import { EvmService } from '@/applications/evm/evm-service';
import { IWbsEvmRepository } from '@/applications/evm/iwbs-evm-repository';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { EvmMetrics } from '@/domains/evm/evm-metrics';
import { WbsEvmData } from '@/applications/evm/iwbs-evm-repository';
import { TaskStatus } from '@prisma/client';

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

      // BAC: (100 * 5000) + 20 = 500,020
      // Note: バッファは工数として加算され、金額換算されない
      expect(result.bac).toBe(500020);
    });

    it('タスクが空の場合、すべての値が0になる', async () => {
      const evaluationDate = new Date('2025-01-05');
      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 0,
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
          null, null,
          100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
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
          null, null,
          100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.getEvmTimeSeries(1, startDate, endDate, 'weekly', 'hours');

      expect(result).toHaveLength(3); // 1/1, 1/8, 1/15
      expect(result[0].date).toEqual(new Date('2025-01-01'));
      expect(result[1].date).toEqual(new Date('2025-01-08'));
      expect(result[2].date).toEqual(new Date('2025-01-15'));
    });

    it('月次の時系列データを生成する', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-15');

      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-12-31'),
          null, null,
          100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
        tasks,
        buffers: [],
        settings: null,
      };

      const actualCostMap = new Map<string, number>();

      mockRepository.getWbsEvmData.mockResolvedValue(wbsData);
      mockRepository.getActualCostByDate.mockResolvedValue(actualCostMap);

      const result = await evmService.getEvmTimeSeries(1, startDate, endDate, 'monthly', 'hours');

      expect(result).toHaveLength(3); // 1/1, 2/1, 3/1
      expect(result[0].date).toEqual(new Date('2025-01-01'));
      expect(result[1].date).toEqual(new Date('2025-02-01'));
      expect(result[2].date).toEqual(new Date('2025-03-01'));
    });

    it('進捗率測定方法を指定できる', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          null, null,
          100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
      ];

      const wbsData: WbsEvmData = {
        wbsId: 1,
        totalPlannedManHours: 100,
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
    // 制御されたEvmMetricsを生成するヘルパー
    const createControlledMetrics = (overrides: {
      pv?: number;
      ev?: number;
      ac?: number;
      bac?: number;
      pv_base?: number;
    }): EvmMetrics => {
      return EvmMetrics.create({
        date: new Date('2025-06-15'),
        pv_base: overrides.pv_base ?? overrides.pv ?? 100,
        pv: overrides.pv ?? 100,
        ev: overrides.ev ?? 50,
        ac: overrides.ac ?? 50,
        bac: overrides.bac ?? 200,
        calculationMode: 'hours',
        progressMethod: 'SELF_REPORTED',
      });
    };

    /**
     * 予測テスト共通セットアップ
     * - fakeTimerで「現在時刻」を固定
     * - calculateCurrentEvmMetricsをspy → now時点=currentMetrics, 未来=baseMetrics
     * - 週次で [now, now+7d] の2データポイントを生成
     */
    const setupPredictionTest = (
      currentOverrides: Parameters<typeof createControlledMetrics>[0],
      baseOverrides: Parameters<typeof createControlledMetrics>[0]
    ) => {
      const now = new Date('2025-06-15T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const currentMetrics = createControlledMetrics(currentOverrides);
      const baseMetrics = createControlledMetrics(baseOverrides);

      const spy = jest.spyOn(evmService, 'calculateCurrentEvmMetrics')
        .mockImplementation(async (_wbsId, evalDate) => {
          if (evalDate && evalDate.getTime() > now.getTime()) {
            return baseMetrics;
          }
          return currentMetrics;
        });

      const startDate = new Date('2025-06-15T00:00:00.000Z');
      const endDate = new Date('2025-06-22T00:00:00.000Z');

      return { now, startDate, endDate, spy, currentMetrics, baseMetrics };
    };

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    describe('予測EV計算', () => {
      it('SPI=1.0の場合、PV増分と同量のEV増加', async () => {
        // currentMetrics: PV=100, EV=100, AC=100, BAC=200 → SPI=1.0
        // baseMetrics: PV=150, BAC=200
        // predictedEV = min(200, 100 + (150-100)*1.0) = 150
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 100, ac: 100, bac: 200 },
          { pv: 150, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted).toBeDefined();
        expect(predicted!.ev).toBe(150);
      });

      it('SPI<1の場合、PV増分×SPIのEV増加', async () => {
        // currentMetrics: PV=100, EV=80, AC=100, BAC=200 → SPI=0.8
        // baseMetrics: PV=150, BAC=200
        // predictedEV = min(200, 80 + (150-100)*0.8) = min(200, 120) = 120
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 80, ac: 100, bac: 200 },
          { pv: 150, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(120);
      });

      it('SPI>1の場合、PV増分以上のEV増加', async () => {
        // currentMetrics: PV=100, EV=120, AC=80, BAC=200 → SPI=1.2
        // baseMetrics: PV=150, BAC=200
        // predictedEV = min(200, 120 + (150-100)*1.2) = min(200, 180) = 180
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 120, ac: 80, bac: 200 },
          { pv: 150, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(180);
      });

      it('SPI=0の場合、EVは増加しない', async () => {
        // currentMetrics: PV=100, EV=0, AC=50, BAC=200 → SPI=0
        // baseMetrics: PV=150, BAC=200
        // predictedEV = min(200, 0 + (150-100)*0) = 0
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 0, ac: 50, bac: 200 },
          { pv: 150, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(0);
      });

      it('予測EVがBAC超過時、BACにクランプされる', async () => {
        // currentMetrics: PV=150, EV=180, AC=200, BAC=200 → SPI=1.2
        // baseMetrics: PV=200, BAC=200
        // predictedEV = min(200, 180 + (200-150)*1.2) = min(200, 240) = 200
        const { startDate, endDate } = setupPredictionTest(
          { pv: 150, ev: 180, ac: 200, bac: 200 },
          { pv: 200, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(200); // BAC上限
      });

      it('futurePV < currentPVの場合、pvIncrement=0でEV不変', async () => {
        // currentMetrics: PV=150, EV=120, AC=100, BAC=200 → SPI=0.8
        // baseMetrics: PV=100, BAC=200 (futurePV < currentPV)
        // pvIncrement = max(0, 100-150) = 0
        // predictedEV = min(200, 120+0) = 120
        const { startDate, endDate } = setupPredictionTest(
          { pv: 150, ev: 120, ac: 100, bac: 200 },
          { pv: 100, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(120); // 変化なし
      });
    });

    describe('予測AC計算', () => {
      it('CPI=1.0の場合、AC増加=EV増加', async () => {
        // currentMetrics: PV=100, EV=100, AC=100, BAC=200 → SPI=1.0, CPI=1.0
        // baseMetrics: PV=150, BAC=200
        // predictedEV = 150, evIncrement = 50
        // predictedAC = 100 + 50/1.0 = 150
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 100, ac: 100, bac: 200 },
          { pv: 150, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ac).toBe(150);
      });

      it('CPI<1の場合、AC増加>EV増加（コスト超過傾向）', async () => {
        // currentMetrics: PV=100, EV=100, AC=125, BAC=200 → SPI=1.0, CPI=0.8
        // baseMetrics: PV=150, BAC=200
        // predictedEV = 150, evIncrement = 50
        // predictedAC = 125 + 50/0.8 = 125 + 62.5 = 187.5
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 100, ac: 125, bac: 200 },
          { pv: 150, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ac).toBe(187.5);
      });

      it('CPI>1の場合、AC増加<EV増加（コスト効率良好）', async () => {
        // currentMetrics: PV=100, EV=120, AC=80, BAC=200 → SPI=1.2, CPI=1.5
        // baseMetrics: PV=150, BAC=200
        // predictedEV = 180, evIncrement = 60
        // predictedAC = 80 + 60/1.5 = 80 + 40 = 120
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 120, ac: 80, bac: 200 },
          { pv: 150, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ac).toBe(120);
      });

      it('CPI=0の場合、effectiveCPI=1にフォールバック', async () => {
        // currentMetrics: PV=100, EV=50, AC=0, BAC=200 → SPI=0.5, CPI=0
        // baseMetrics: PV=200, BAC=200
        // pvIncrement = 100, predictedEvIncrement = 100*0.5 = 50
        // predictedEV = min(200, 50+50) = 100
        // evIncrement = 50, effectiveCPI = 1
        // predictedAC = 0 + 50/1 = 50
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 50, ac: 0, bac: 200 },
          { pv: 200, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(100);
        expect(predicted!.ac).toBe(50); // effectiveCPI=1でフォールバック
      });

      it('EV増分=0の場合、ACも増加しない', async () => {
        // currentMetrics: PV=100, EV=200, AC=200, BAC=200 → SPI=2.0, CPI=1.0
        // (EVが既にBACに到達)
        // baseMetrics: PV=150, BAC=200
        // predictedEV = min(200, 200+50*2.0) = 200 (BACクランプ)
        // evIncrement = max(0, 200-200) = 0
        // predictedAC = 200 + 0/1.0 = 200
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 200, ac: 200, bac: 200 },
          { pv: 150, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.ev).toBe(200);
        expect(predicted!.ac).toBe(200); // ACも不変
      });
    });

    describe('予測メトリクスのPV/BAC参照元', () => {
      it('PVはbaseMetricのPVを使用する', async () => {
        // currentMetrics: PV=100, baseMetrics: PV=180
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 100, ac: 100, bac: 200 },
          { pv: 180, bac: 200 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.pv).toBe(180); // baseMetricのPV
      });

      it('BACはbaseMetricのBACを使用する', async () => {
        // currentMetrics: BAC=200, baseMetrics: BAC=250
        const { startDate, endDate } = setupPredictionTest(
          { pv: 100, ev: 100, ac: 100, bac: 200 },
          { pv: 150, bac: 250 }
        );

        const result = await evmService.getEvmTimeSeries(
          1, startDate, endDate, 'weekly', 'hours', undefined, true
        );

        const predicted = result.find(m => m.isPredicted);
        expect(predicted!.bac).toBe(250); // baseMetricのBAC
      });
    });
  });

});
