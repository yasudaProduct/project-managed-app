import { EvmTrendApplicationService } from '@/applications/trend/evm-trend-application-service';
import type { IEvmService } from '@/applications/evm/evm-service';
import type { IProgressReviewApplicationService } from '@/applications/progress-review/progress-review-application-service';
import type { IProjectSettingsRepository } from '@/applications/project-settings/iproject-settings-repository';
import { EvmMetrics } from '@/domains/evm/evm-metrics';
import { withProjectSettingsDefaults } from '@/types/project-settings';

describe('EvmTrendApplicationService', () => {
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
  const metrics = (date: string, spi: number, cpi: number) =>
    EvmMetrics.create({ date: d(date), pv_base: 100, pv: 100, ev: spi * 100, ac: (spi * 100) / cpi, bac: 200 });

  let evmService: { getTrendMetrics: jest.Mock };
  let progressReviewService: { getRecentReviewDates: jest.Mock };
  let projectSettingsRepository: { findByProjectId: jest.Mock };
  let service: EvmTrendApplicationService;

  beforeEach(() => {
    progressReviewService = {
      getRecentReviewDates: jest
        .fn()
        .mockResolvedValue([d('2026-10-11'), d('2026-10-18'), d('2026-10-25'), d('2026-11-01')]),
    };
    evmService = {
      getTrendMetrics: jest.fn().mockResolvedValue([
        metrics('2026-10-11', 1.0, 0.95),
        metrics('2026-10-18', 0.95, 0.96),
        metrics('2026-10-25', 0.92, 0.94),
        metrics('2026-11-01', 0.88, 0.95),
      ]),
    };
    projectSettingsRepository = {
      findByProjectId: jest
        .fn()
        .mockResolvedValue(withProjectSettingsDefaults('p1', { progressReviewCycle: 'WEEKLY' })),
    };
    service = new EvmTrendApplicationService(
      evmService as unknown as IEvmService,
      progressReviewService as unknown as IProgressReviewApplicationService,
      projectSettingsRepository as unknown as IProjectSettingsRepository
    );
  });

  it('進捗確認サイクルの直近3期分の確認日でSPI/CPIを求め、3期連続の悪化を判定する', async () => {
    const now = new Date('2026-11-01T03:00:00.000Z');

    const result = await service.getEvmTrend(1, 'p1', now);

    expect(progressReviewService.getRecentReviewDates).toHaveBeenCalledWith('WEEKLY', 3, now);
    // 過去の確認日だけを渡す（最後の点は現在値）
    expect(evmService.getTrendMetrics).toHaveBeenCalledWith(
      1,
      [d('2026-10-11'), d('2026-10-18'), d('2026-10-25')],
      now
    );
    expect(result).toMatchObject({
      progressReviewCycle: 'WEEKLY',
      periods: 3,
      isSpiDeteriorating: true,
      isCpiDeteriorating: false,
    });
    expect(result.points.map((point) => point.spi)).toEqual([1.0, 0.95, 0.92, 0.88]);
    expect(result.points[0].date).toBe('2026-10-11T00:00:00.000Z');
  });
});
