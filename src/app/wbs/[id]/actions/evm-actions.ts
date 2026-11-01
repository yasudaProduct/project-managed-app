'use server';

import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { IEvmService } from '@/applications/evm/evm-service';
import type { EvmDashboardData } from '@/applications/evm/evm-dashboard-dto';
import type {
  IEvmTrendApplicationService,
  EvmTrendDto,
} from '@/applications/trend/evm-trend-application-service';

const evmService = container.get<IEvmService>(SYMBOL.IEvmService);

const GetEvmDashboardDataSchema = z.object({
  wbsId: z.number(),
  calculationMode: z.enum(['hours', 'cost']).default('hours'),
  progressMethod: z.enum(['ZERO_HUNDRED', 'FIFTY_FIFTY', 'SELF_REPORTED']).optional(),
  forecastMethod: z.enum(['CPI_ONLY', 'CPI_SPI', 'PLANNED']).optional(),
  interval: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  periodMode: z.enum(['project', 'recent3months', 'recent1month', 'custom']).default('project'),
  showPrediction: z.boolean().optional(),
  /** 前回からの変化の比較日（ISO 8601・UTC） */
  comparisonDate: z.string().datetime().optional(),
  /** 対象フェーズ（未指定は全体） */
  phaseId: z.number().int().positive().optional(),
});

type EvmActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export async function getEvmDashboardData(
  params: z.infer<typeof GetEvmDashboardDataSchema>
): Promise<EvmActionResult<EvmDashboardData>> {
  try {
    const validated = GetEvmDashboardDataSchema.parse(params);

    const data = await evmService.getEvmDashboardDataSerialized(validated.wbsId, {
      calculationMode: validated.calculationMode,
      progressMethod: validated.progressMethod,
      forecastMethod: validated.forecastMethod,
      interval: validated.interval,
      periodMode: validated.periodMode,
      showPrediction: validated.showPrediction,
      comparisonDate: validated.comparisonDate
        ? new Date(validated.comparisonDate)
        : undefined,
      phaseId: validated.phaseId,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Failed to get EVM dashboard data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

const GetEvmTrendSchema = z.object({
  wbsId: z.number().int().positive(),
  projectId: z.string().min(1),
});

/**
 * 悪化トレンド（進捗確認サイクルの単位で SPI / CPI が連続して下がっているか）を返す。
 * 入力が不正・取得に失敗した場合は null を返す。
 */
export async function getEvmTrend(
  wbsId: number,
  projectId: string
): Promise<EvmTrendDto | null> {
  const parsed = GetEvmTrendSchema.safeParse({ wbsId, projectId });
  if (!parsed.success) return null;
  try {
    return await container
      .get<IEvmTrendApplicationService>(SYMBOL.IEvmTrendApplicationService)
      .getEvmTrend(parsed.data.wbsId, parsed.data.projectId);
  } catch (error) {
    console.error('Failed to get EVM trend:', error);
    return null;
  }
}

