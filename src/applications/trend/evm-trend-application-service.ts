import { inject, injectable } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { withProjectSettingsDefaults } from '@/types/project-settings';
import type { ProgressReviewCycle } from '@/types/progress-review-cycle';
import {
  detectConsecutiveDecline,
  TREND_DETERIORATION_PERIODS,
} from '@/domains/progress-review/trend-deterioration';
import type { IEvmService } from '@/applications/evm/evm-service';
import type { IProgressReviewApplicationService } from '@/applications/progress-review/progress-review-application-service';
import type { IProjectSettingsRepository } from '@/applications/project-settings/iproject-settings-repository';

/** 悪化トレンド（Server Action 経由でクライアントへ渡すため日付は ISO 文字列） */
export type EvmTrendDto = {
  progressReviewCycle: ProgressReviewCycle;
  /** 何期連続の悪化を見るか */
  periods: number;
  /** 各確認日の SPI / CPI（古い順。最後は現在値） */
  points: Array<{ date: string; spi: number | null; cpi: number | null }>;
  isSpiDeteriorating: boolean;
  isCpiDeteriorating: boolean;
};

export interface IEvmTrendApplicationService {
  getEvmTrend(wbsId: number, projectId: string, now?: Date): Promise<EvmTrendDto>;
}

/**
 * 悪化トレンドの検知（要件整理 3-3）。
 * 進捗確認サイクル（プロジェクト設定）の単位で直近の確認日の SPI / CPI を求め、N 期連続で下がったかを判定する。
 */
@injectable()
export class EvmTrendApplicationService implements IEvmTrendApplicationService {
  constructor(
    @inject(SYMBOL.IEvmService)
    private readonly evmService: IEvmService,
    @inject(SYMBOL.IProgressReviewApplicationService)
    private readonly progressReviewService: IProgressReviewApplicationService,
    @inject(SYMBOL.IProjectSettingsRepository)
    private readonly projectSettingsRepository: IProjectSettingsRepository
  ) {}

  public async getEvmTrend(
    wbsId: number,
    projectId: string,
    now: Date = new Date()
  ): Promise<EvmTrendDto> {
    const settings = withProjectSettingsDefaults(
      projectId,
      await this.projectSettingsRepository.findByProjectId(projectId)
    );
    const cycle = settings.progressReviewCycle;
    const reviewDates = await this.progressReviewService.getRecentReviewDates(
      cycle,
      TREND_DETERIORATION_PERIODS,
      now
    );
    // 最後（今日）は現在値で求めるため、過去の確認日だけを渡す
    const metrics = await this.evmService.getTrendMetrics(wbsId, reviewDates.slice(0, -1), now);

    const points = metrics.map((metric, index) => ({
      date: reviewDates[index].toISOString(),
      spi: metric.spi,
      cpi: metric.cpi,
    }));
    return {
      progressReviewCycle: cycle,
      periods: TREND_DETERIORATION_PERIODS,
      points,
      isSpiDeteriorating: detectConsecutiveDecline(
        points.map((point) => point.spi),
        TREND_DETERIORATION_PERIODS
      ),
      isCpiDeteriorating: detectConsecutiveDecline(
        points.map((point) => point.cpi),
        TREND_DETERIORATION_PERIODS
      ),
    };
  }
}
