import {
  serializeTaskEvmData,
  serializeEvmDashboardData,
} from '@/applications/evm/evm-dashboard-dto';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { EvmMetrics } from '@/domains/evm/evm-metrics';

describe('evm-dashboard-dto', () => {
  const makeTask = (overrides?: {
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    progressRate?: number;
    selfReportedProgress?: number | null;
  }): TaskEvmData =>
    new TaskEvmData(
      1,
      'D1-0001',
      'テストタスク',
      new Date('2025-01-01'),
      new Date('2025-01-10'),
      new Date('2025-01-01'),
      new Date('2025-01-10'),
      new Date('2025-01-01'),
      null,
      100,
      100,
      0,
      overrides?.status ?? 'IN_PROGRESS',
      overrides?.progressRate ?? 50,
      5000,
      overrides?.selfReportedProgress ?? null
    );

  describe('serializeTaskEvmData: 選択中の測定方式に応じたEV', () => {
    it('ZERO_HUNDRED: 進行中タスクは進捗率0%・出来高0（合計EVと整合）', () => {
      const dto = serializeTaskEvmData(makeTask(), 'ZERO_HUNDRED');

      expect(dto.methodProgressRate).toBe(0);
      expect(dto.methodEarnedValue).toBe(0);
      expect(dto.methodEarnedValueCost).toBe(0);
      // 自己申告ベースの従来値も保持される
      expect(dto.earnedValue).toBe(50);
    });

    it('ZERO_HUNDRED: 完了タスクは100%・全額計上', () => {
      const dto = serializeTaskEvmData(
        makeTask({ status: 'COMPLETED', progressRate: 100 }),
        'ZERO_HUNDRED'
      );

      expect(dto.methodProgressRate).toBe(100);
      expect(dto.methodEarnedValue).toBe(100);
      expect(dto.methodEarnedValueCost).toBe(500000);
    });

    it('FIFTY_FIFTY: 進行中タスクは50%・半額計上', () => {
      const dto = serializeTaskEvmData(makeTask(), 'FIFTY_FIFTY');

      expect(dto.methodProgressRate).toBe(50);
      expect(dto.methodEarnedValue).toBe(50);
    });

    it('SELF_REPORTED: 自己申告進捗率を使用する', () => {
      const dto = serializeTaskEvmData(
        makeTask({ selfReportedProgress: 75 }),
        'SELF_REPORTED'
      );

      expect(dto.methodProgressRate).toBe(75);
      expect(dto.methodEarnedValue).toBe(75);
    });

    it('SELF_REPORTED: 完了タスクは申告値に関わらず100%', () => {
      const dto = serializeTaskEvmData(
        makeTask({ status: 'COMPLETED', progressRate: 30 }),
        'SELF_REPORTED'
      );

      expect(dto.methodProgressRate).toBe(100);
      expect(dto.methodEarnedValue).toBe(100);
    });
  });

  describe('serializeEvmDashboardData: 解決済み測定方式がタスク明細に伝播する', () => {
    it('currentMetricsの方式（ZERO_HUNDRED）でタスクEVが算出される', () => {
      const result = serializeEvmDashboardData({
        currentMetrics: EvmMetrics.create({
          date: new Date('2025-01-05'),
          pv_base: 100,
          pv: 100,
          ev: 0,
          ac: 0,
          bac: 100,
          progressMethod: 'ZERO_HUNDRED',
        }),
        timeSeries: [],
        taskDetails: [makeTask()],
        dateRange: {
          taskMinStartDate: new Date('2025-01-01'),
          taskMaxEndDate: new Date('2025-01-10'),
          recommendedStartDate: new Date('2025-01-01'),
          recommendedEndDate: new Date('2025-01-10'),
        },
        scheduleForecast: {
          status: 'ok',
          forecastCompletionDate: new Date('2025-01-15'),
          plannedEndDate: new Date('2025-01-10'),
          delayDays: 5,
          spiT: 0.5,
        },
      });

      expect(result.taskDetails[0].methodProgressRate).toBe(0);
      expect(result.taskDetails[0].methodEarnedValue).toBe(0);
    });
  });
});

describe('TaskEvmData.getDirectProgressRate', () => {
  const makeTask = (
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
    progressRate: number,
    selfReportedProgress: number | null = null
  ): TaskEvmData =>
    new TaskEvmData(
      1,
      'D1-0001',
      'テストタスク',
      new Date('2025-01-01'),
      new Date('2025-01-10'),
      new Date('2025-01-01'),
      new Date('2025-01-10'),
      null,
      null,
      100,
      100,
      0,
      status,
      progressRate,
      5000,
      selfReportedProgress
    );

  it('SELF_REPORTED: 範囲外の申告値は0〜100にクランプされる', () => {
    expect(makeTask('IN_PROGRESS', 150).getDirectProgressRate('SELF_REPORTED')).toBe(100);
    expect(makeTask('IN_PROGRESS', -10).getDirectProgressRate('SELF_REPORTED')).toBe(0);
  });

  it('ZERO_HUNDRED: 完了のみ100、それ以外は0', () => {
    expect(makeTask('COMPLETED', 100).getDirectProgressRate('ZERO_HUNDRED')).toBe(100);
    expect(makeTask('IN_PROGRESS', 90).getDirectProgressRate('ZERO_HUNDRED')).toBe(0);
  });

  it('FIFTY_FIFTY: 進行中は50', () => {
    expect(makeTask('IN_PROGRESS', 90).getDirectProgressRate('FIFTY_FIFTY')).toBe(50);
    expect(makeTask('NOT_STARTED', 0).getDirectProgressRate('FIFTY_FIFTY')).toBe(0);
  });
});
