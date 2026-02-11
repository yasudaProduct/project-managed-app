'use client';

import { useQuery } from '@tanstack/react-query';
import { calculateTasksForecast } from '@/app/wbs/[id]/actions/forecast-actions';
import {
  ForecastCalculationOptions,
  ForecastCalculationResult
} from '@/domains/forecast/forecast-calculation.service';

/**
 * 見通し工数計算フック
 */
export function useForecastCalculation(
  projectId: string,
  wbsId: number,
  options: ForecastCalculationOptions = { method: 'realistic' }
) {
  return useQuery({
    queryKey: ['forecast-calculation', projectId, wbsId, options.method],
    queryFn: () => calculateTasksForecast(projectId, wbsId, options),
    enabled: !!projectId && !!wbsId,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 2,
  });
}

/**
 * 見通し工数計算結果を月別・担当者別に集計
 */
export function aggregateForecastByMonth(
  forecastResults: ForecastCalculationResult[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monthlyData: any[] // MonthlyAssigneeData型
) {
  const forecastMap = new Map<string, ForecastCalculationResult>();
  forecastResults.forEach(result => {
    forecastMap.set(result.taskId, result);
  });

  return monthlyData.map(data => {
    let monthlyForecastHours = 0;

    if (data.taskDetails) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.taskDetails.forEach((task: any) => {
        const forecast = forecastMap.get(task.taskId);
        if (forecast) {
          // 月別配分に応じて見通し工数を按分
          const totalPlanned = task.totalPlannedHours || 1;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          task.monthlyAllocations.forEach((allocation: any) => {
            if (allocation.month === data.month) {
              const allocationRatio = allocation.allocatedPlannedHours / totalPlanned;
              monthlyForecastHours += forecast.forecastHours * allocationRatio;
            }
          });
        }
      });
    }

    return {
      ...data,
      forecastHours: monthlyForecastHours,
    };
  });
}

/**
 * 見通し工数計算メソッドの日本語ラベル
 */
export const FORECAST_METHOD_LABELS = {
  conservative: '保守的',
  realistic: '現実的',
  optimistic: '楽観的',
} as const;