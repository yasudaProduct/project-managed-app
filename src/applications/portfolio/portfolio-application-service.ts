import { inject, injectable } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { withProjectSettingsDefaults } from '@/types/project-settings';
import type { EvmHealthStatus } from '@/domains/evm/evm-metrics';
import type {
  ITargetWbsQueryRepository,
  TargetWbsInfo,
} from '@/applications/cross-wbs-workload/itarget-wbs-query-repository';
import type { IEvmService } from '@/applications/evm/evm-service';
import type { ITaskDelayApplicationService } from '@/applications/task-delay/task-delay-application-service';
import type { IDataFreshnessApplicationService } from '@/applications/data-freshness/data-freshness-application-service';
import type { IProjectSettingsRepository } from '@/applications/project-settings/iproject-settings-repository';
import type { IEvmTrendApplicationService } from '@/applications/trend/evm-trend-application-service';

/** ポートフォリオ一覧の1行（Server Action 経由でクライアントへ渡すため日付は ISO 文字列。値は工数） */
export type PortfolioRowDto = {
  projectId: string;
  projectName: string;
  wbsId: number;
  wbsName: string;
  healthStatus: EvmHealthStatus;
  spi: number | null;
  cpi: number | null;
  /** 出来高率（%） */
  completionRate: number | null;
  bac: number | null;
  eac: number | null;
  vac: number | null;
  forecastCompletionDate: string | null;
  plannedEndDate: string | null;
  /** 予測完了日の計画終了日に対する遅れ（日。負値は前倒し） */
  scheduleDelayDays: number | null;
  endOverdueCount: number;
  startOverdueCount: number;
  /** 直近10営業日に実績の入力漏れがある担当者数 */
  assigneesWithMissingEntries: number;
  lastWbsSyncAt: string | null;
  /** 進捗確認サイクルの単位で SPI / CPI が連続して悪化しているか（3-3） */
  isSpiDeteriorating: boolean;
  isCpiDeteriorating: boolean;
  /** 取得に失敗した場合のメッセージ（成功時は null） */
  loadError: string | null;
};

export interface IPortfolioApplicationService {
  listPortfolio(now?: Date): Promise<PortfolioRowDto[]>;
}

const HEALTH_ORDER: EvmHealthStatus[] = ['critical', 'warning', 'healthy', 'no_data'];

/**
 * ポートフォリオ一覧（組織として、どのプロジェクトが危ないか）。
 * 対象は未開始・進行中プロジェクトの最新WBS（担当者負荷の横断集計と同じ）。
 * 計算は各画面と同じ Application Service（EVM・遅延タスク・データの鮮度）を組み合わせて行い、
 * 個別画面と一覧で数字が食い違わないようにする（独自の集計SQLは持たない）。
 */
@injectable()
export class PortfolioApplicationService implements IPortfolioApplicationService {
  constructor(
    @inject(SYMBOL.ITargetWbsQueryRepository)
    private readonly targetWbsQueryRepository: ITargetWbsQueryRepository,
    @inject(SYMBOL.IEvmService)
    private readonly evmService: IEvmService,
    @inject(SYMBOL.ITaskDelayApplicationService)
    private readonly taskDelayService: ITaskDelayApplicationService,
    @inject(SYMBOL.IDataFreshnessApplicationService)
    private readonly dataFreshnessService: IDataFreshnessApplicationService,
    @inject(SYMBOL.IProjectSettingsRepository)
    private readonly projectSettingsRepository: IProjectSettingsRepository,
    @inject(SYMBOL.IEvmTrendApplicationService)
    private readonly evmTrendService: IEvmTrendApplicationService
  ) {}

  public async listPortfolio(now: Date = new Date()): Promise<PortfolioRowDto[]> {
    const targets = await this.targetWbsQueryRepository.findTargetWbs({ kinds: ['PROJECT'] });
    const rows = await Promise.all(targets.map((target) => this.buildRow(target, now)));
    return rows.sort(
      (a, b) =>
        HEALTH_ORDER.indexOf(a.healthStatus) - HEALTH_ORDER.indexOf(b.healthStatus) ||
        (a.spi ?? Infinity) - (b.spi ?? Infinity)
    );
  }

  private async buildRow(target: TargetWbsInfo, now: Date): Promise<PortfolioRowDto> {
    const base = {
      projectId: target.projectId,
      projectName: target.projectName,
      wbsId: target.wbsId,
      wbsName: target.wbsName,
    };
    try {
      const settings = withProjectSettingsDefaults(
        target.projectId,
        await this.projectSettingsRepository.findByProjectId(target.projectId)
      );
      const [summary, delays, freshness, trend] = await Promise.all([
        this.evmService.getEvmSummary(target.wbsId, now),
        this.taskDelayService.listTaskDelays(target.wbsId, {
          dueSoonDays: settings.deadlineAlertDays,
          now,
        }),
        this.dataFreshnessService.getDataFreshness(target.wbsId, target.projectId, { now }),
        this.evmTrendService.getEvmTrend(target.wbsId, target.projectId, now),
      ]);
      const { currentMetrics: metrics, scheduleForecast: forecast } = summary;

      return {
        ...base,
        healthStatus: metrics.healthStatus,
        spi: metrics.spi,
        cpi: metrics.cpi,
        completionRate: metrics.completionRate,
        bac: metrics.bac,
        eac: metrics.eac,
        vac: metrics.vac,
        forecastCompletionDate: forecast.forecastCompletionDate?.toISOString() ?? null,
        plannedEndDate: forecast.plannedEndDate?.toISOString() ?? null,
        scheduleDelayDays: forecast.delayDays,
        endOverdueCount: delays.filter((delay) => delay.kind === 'END_OVERDUE').length,
        startOverdueCount: delays.filter((delay) => delay.kind === 'START_OVERDUE').length,
        assigneesWithMissingEntries: freshness.entryCheck.assignees.filter(
          (assignee) => assignee.missingDates.length > 0
        ).length,
        lastWbsSyncAt: freshness.lastWbsSync?.syncedAt ?? null,
        isSpiDeteriorating: trend.isSpiDeteriorating,
        isCpiDeteriorating: trend.isCpiDeteriorating,
        loadError: null,
      };
    } catch (error) {
      console.error(`Failed to build portfolio row for WBS ${target.wbsId}:`, error);
      return {
        ...base,
        healthStatus: 'no_data',
        spi: null,
        cpi: null,
        completionRate: null,
        bac: null,
        eac: null,
        vac: null,
        forecastCompletionDate: null,
        plannedEndDate: null,
        scheduleDelayDays: null,
        endOverdueCount: 0,
        startOverdueCount: 0,
        assigneesWithMissingEntries: 0,
        lastWbsSyncAt: null,
        isSpiDeteriorating: false,
        isCpiDeteriorating: false,
        loadError: 'データを取得できませんでした',
      };
    }
  }
}
