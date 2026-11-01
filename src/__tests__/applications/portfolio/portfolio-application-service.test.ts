import { PortfolioApplicationService } from '@/applications/portfolio/portfolio-application-service';
import type { ITargetWbsQueryRepository } from '@/applications/cross-wbs-workload/itarget-wbs-query-repository';
import type { IEvmService } from '@/applications/evm/evm-service';
import type { ITaskDelayApplicationService } from '@/applications/task-delay/task-delay-application-service';
import type { IDataFreshnessApplicationService } from '@/applications/data-freshness/data-freshness-application-service';
import type { IProjectSettingsRepository } from '@/applications/project-settings/iproject-settings-repository';
import type { IEvmTrendApplicationService } from '@/applications/trend/evm-trend-application-service';
import { EvmMetrics } from '@/domains/evm/evm-metrics';
import { withProjectSettingsDefaults } from '@/types/project-settings';

/**
 * ポートフォリオ一覧（組織として、どのプロジェクトが危ないか）。
 * 未開始・進行中プロジェクトの最新WBSごとに、EVM・スケジュール予測・遅れタスク・データの鮮度をまとめる。
 */
describe('PortfolioApplicationService', () => {
  const now = new Date('2026-11-01T03:00:00.000Z');

  const metrics = (args: { ev: number; pv: number; ac: number; bac: number }) =>
    EvmMetrics.create({ date: now, pv_base: args.pv, ...args });

  let targetWbsQueryRepository: { findTargetWbs: jest.Mock };
  let evmService: { getEvmSummary: jest.Mock };
  let taskDelayService: { listTaskDelays: jest.Mock };
  let dataFreshnessService: { getDataFreshness: jest.Mock };
  let projectSettingsRepository: { findByProjectId: jest.Mock };
  let evmTrendService: { getEvmTrend: jest.Mock };
  let service: PortfolioApplicationService;

  const freshness = (missingCount: number) => ({
    lastWbsSync: { syncedAt: '2026-11-01T00:00:00.000Z', status: 'SUCCESS' },
    entryCheck: {
      windowStart: null,
      windowEnd: null,
      assignees: [
        { userId: 'u1', name: '山田', lastRecordDate: null, missingDates: missingCount > 0 ? ['2026-10-30T00:00:00.000Z'] : [] },
        { userId: 'u2', name: '佐藤', lastRecordDate: null, missingDates: missingCount > 1 ? ['2026-10-30T00:00:00.000Z'] : [] },
      ],
    },
    taskIssues: { noAssigneeCount: 0, noBaselineCount: 0, zeroProgressInProgressCount: 0 },
  });

  beforeEach(() => {
    targetWbsQueryRepository = {
      findTargetWbs: jest.fn().mockResolvedValue([
        { wbsId: 1, wbsName: 'WBS-A', projectId: 'p1', projectName: '案件A' },
        { wbsId: 2, wbsName: 'WBS-B', projectId: 'p2', projectName: '案件B' },
      ]),
    };
    evmService = {
      getEvmSummary: jest.fn().mockImplementation(async (wbsId: number) =>
        wbsId === 1
          ? {
              currentMetrics: metrics({ ev: 95, pv: 100, ac: 100, bac: 200 }),
              scheduleForecast: {
                status: 'ok',
                forecastCompletionDate: new Date('2026-12-05T00:00:00.000Z'),
                plannedEndDate: new Date('2026-12-01T00:00:00.000Z'),
                delayDays: 4,
                spiT: 0.95,
              },
            }
          : {
              currentMetrics: metrics({ ev: 60, pv: 100, ac: 100, bac: 200 }),
              scheduleForecast: {
                status: 'ok',
                forecastCompletionDate: new Date('2027-02-01T00:00:00.000Z'),
                plannedEndDate: new Date('2026-12-01T00:00:00.000Z'),
                delayDays: 62,
                spiT: 0.6,
              },
            }
      ),
    };
    taskDelayService = {
      listTaskDelays: jest.fn().mockImplementation(async (wbsId: number) =>
        wbsId === 1
          ? [{ kind: 'DUE_SOON' }]
          : [{ kind: 'END_OVERDUE' }, { kind: 'END_OVERDUE' }, { kind: 'START_OVERDUE' }]
      ),
    };
    dataFreshnessService = {
      getDataFreshness: jest
        .fn()
        .mockImplementation(async (wbsId: number) => freshness(wbsId === 1 ? 0 : 2)),
    };
    projectSettingsRepository = {
      findByProjectId: jest
        .fn()
        .mockImplementation(async (projectId: string) =>
          withProjectSettingsDefaults(projectId, { deadlineAlertDays: 3 })
        ),
    };
    evmTrendService = {
      getEvmTrend: jest.fn().mockImplementation(async (wbsId: number) => ({
        progressReviewCycle: 'WEEKLY',
        periods: 3,
        points: [],
        isSpiDeteriorating: wbsId === 2,
        isCpiDeteriorating: false,
      })),
    };
    service = new PortfolioApplicationService(
      targetWbsQueryRepository as unknown as ITargetWbsQueryRepository,
      evmService as unknown as IEvmService,
      taskDelayService as unknown as ITaskDelayApplicationService,
      dataFreshnessService as unknown as IDataFreshnessApplicationService,
      projectSettingsRepository as unknown as IProjectSettingsRepository,
      evmTrendService as unknown as IEvmTrendApplicationService
    );
  });

  it('WBSごとにEVM・予測・遅れタスク数・入力漏れ人数・最終同期をまとめる', async () => {
    const rows = await service.listPortfolio(now);
    const b = rows.find((row) => row.projectId === 'p2')!;

    expect(b).toMatchObject({
      projectName: '案件B',
      wbsId: 2,
      wbsName: 'WBS-B',
      healthStatus: 'critical',
      spi: 0.6,
      cpi: 0.6,
      completionRate: 30,
      bac: 200,
      forecastCompletionDate: '2027-02-01T00:00:00.000Z',
      plannedEndDate: '2026-12-01T00:00:00.000Z',
      scheduleDelayDays: 62,
      endOverdueCount: 2,
      startOverdueCount: 1,
      assigneesWithMissingEntries: 2,
      lastWbsSyncAt: '2026-11-01T00:00:00.000Z',
      isSpiDeteriorating: true,
      isCpiDeteriorating: false,
      loadError: null,
    });
    expect(b.eac).toBeCloseTo(100 + 140 / 0.6, 5);
    expect(taskDelayService.listTaskDelays).toHaveBeenCalledWith(2, { dueSoonDays: 3, now });
    expect(dataFreshnessService.getDataFreshness).toHaveBeenCalledWith(2, 'p2', { now });
  });

  it('危ない順（critical → warning → healthy → no_data、同じならSPIの低い順）に並べる', async () => {
    const rows = await service.listPortfolio(now);

    expect(rows.map((row) => [row.projectId, row.healthStatus])).toEqual([
      ['p2', 'critical'],
      ['p1', 'healthy'],
    ]);
  });

  it('1件の取得に失敗しても他の行は返し、失敗した行にはエラーを入れる', async () => {
    evmService.getEvmSummary.mockImplementation(async (wbsId: number) => {
      if (wbsId === 1) throw new Error('DB error');
      return {
        currentMetrics: metrics({ ev: 60, pv: 100, ac: 100, bac: 200 }),
        scheduleForecast: {
          status: 'no_progress',
          forecastCompletionDate: null,
          plannedEndDate: null,
          delayDays: null,
          spiT: null,
        },
      };
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const rows = await service.listPortfolio(now);

    expect(rows).toHaveLength(2);
    const a = rows.find((row) => row.projectId === 'p1')!;
    expect(a.loadError).toBe('データを取得できませんでした');
    expect(a.healthStatus).toBe('no_data');
    consoleError.mockRestore();
  });
});
