'use server';

import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { EvmService } from '@/applications/evm/evm-service';
import type { EvmDashboardData } from '@/applications/evm/evm-dashboard-dto';

const evmService = container.get<EvmService>(SYMBOL.EvmService);

const GetEvmDashboardDataSchema = z.object({
  wbsId: z.number(),
  calculationMode: z.enum(['hours', 'cost']).default('hours'),
  progressMethod: z.enum(['ZERO_HUNDRED', 'FIFTY_FIFTY', 'SELF_REPORTED']).optional(),
  forecastMethod: z.enum(['CPI_ONLY', 'CPI_SPI', 'PLANNED']).optional(),
  interval: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  periodMode: z.enum(['project', 'recent3months', 'recent1month', 'custom']).default('project'),
  showPrediction: z.boolean().optional(),
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
