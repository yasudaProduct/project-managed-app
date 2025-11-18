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
      plannedStartDate: Date;
      plannedEndDate: Date;
      actualStartDate: Date | null;
      actualEndDate: Date | null;
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
        overrides?.plannedStartDate ?? new Date('2025-01-01'),
        overrides?.plannedEndDate ?? new Date('2025-01-10'),
        overrides?.actualStartDate ?? null,
        overrides?.actualEndDate ?? null,
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
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 50,
        }),
        createMockTask({
          taskId: 2,
          plannedStartDate: new Date('2025-01-01'),
          plannedEndDate: new Date('2025-01-10'),
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
        }),
        createMockTask({
          taskId: 2,
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 50, // 無視される
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

      // EV: Task1 = 100 * 1.0 = 100, Task2 = 100 * 0 = 0
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
        }),
        createMockTask({
          taskId: 2,
          plannedManHours: 100,
          status: 'IN_PROGRESS',
        }),
        createMockTask({
          taskId: 3,
          plannedManHours: 100,
          status: 'NOT_STARTED',
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

  describe('getTaskEvmDetails', () => {
    it('タスク別のEVMデータを取得する', async () => {
      const tasks = [
        new TaskEvmData(
          1, 'T001', 'Task1',
          new Date('2025-01-01'), new Date('2025-01-10'),
          null, null,
          100, 0,
          'IN_PROGRESS', 50,
          5000, null
        ),
        new TaskEvmData(
          2, 'T002', 'Task2',
          new Date('2025-01-01'), new Date('2025-01-10'),
          null, null,
          200, 0,
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
        pv: 100,
        ev: 75,
        ac: 100,
        bac: 200,
      });

      const result = evmService.getHealthStatus(metrics);

      expect(result).toBe('critical');
    });
  });
});
