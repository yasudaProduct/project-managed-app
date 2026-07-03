'use server';

import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { EvmService } from '@/applications/evm/evm-service';
import { EvmMetrics, EvmCalculationMode } from '@/domains/evm/evm-metrics';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { ProgressMeasurementMethod } from '@prisma/client';
import type { EvmForecastMethod } from '@/types/evm-forecast-method';

const evmService = container.get<EvmService>(SYMBOL.EvmService);

// バリデーションスキーマ
const GetEvmDashboardDataSchema = z.object({
  wbsId: z.number(),
  calculationMode: z.enum(['hours', 'cost']).default('hours'),
  progressMethod: z.enum(['ZERO_HUNDRED', 'FIFTY_FIFTY', 'SELF_REPORTED']).optional(),
  forecastMethod: z.enum(['CPI_ONLY', 'CPI_SPI', 'PLANNED']).optional(),
  interval: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  periodMode: z.enum(['project', 'recent3months', 'recent1month', 'custom']).default('project'),
  showPrediction: z.boolean().optional(),
});

// 型定義
export type EvmActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type EvmMetricsData = {
  date: string; // ISO 8601 string
  pv_base: number; // 基準計画価値
  pv: number;
  ev: number;
  ac: number;
  bac: number;
  sv: number;
  cv: number;
  spi: number;
  cpi: number;
  eac: number;
  etc: number;
  vac: number;
  completionRate: number; // 完了率（0〜100%）
  healthStatus: 'healthy' | 'warning' | 'critical';
  calculationMode: EvmCalculationMode; // 計算モード（hours or cost）
  progressMethod: ProgressMeasurementMethod; // 進捗率測定方法（ZERO_HUNDRED or FIFTY_FIFTY or SELF_REPORTED）
  forecastMethod: EvmForecastMethod; // EVM予測計算方式（CPI_ONLY or CPI_SPI or PLANNED）
  formattedPv: string; // 計画価値のフォーマット（hours or cost）
  formattedEv: string; // 出来高のフォーマット（hours or cost）
  formattedAc: string; // 実コストのフォーマット（hours or cost）
  formattedBac: string; // 完了時予算のフォーマット（hours or cost）
  isPredicted: boolean;
};

export type TaskEvmDataSerialized = {
  taskId: number;
  taskNo: string;
  taskName: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  plannedManHours: number;
  actualManHours: number;
  status: string;
  progressRate: number;
  costPerHour: number;
  selfReportedProgress: number | null;
  earnedValue: number;
  earnedValueCost: number;
};

export type EvmDateRangeData = {
  projectStartDate: string | null;
  projectEndDate: string | null;
  taskMinStartDate: string | null;
  taskMaxEndDate: string | null;
  recommendedStartDate: string;
  recommendedEndDate: string;
};

export type EvmDashboardData = {
  currentMetrics: EvmMetricsData;
  timeSeries: EvmMetricsData[];
  taskDetails: TaskEvmDataSerialized[];
  dateRange: EvmDateRangeData;
};

/**
 * EvmMetricsをシリアライズ可能な形式に変換
 */
function serializeEvmMetrics(metrics: EvmMetrics): EvmMetricsData {
  return {
    date: metrics.date.toISOString(),
    pv_base: metrics.pv_base,
    pv: metrics.pv,
    ev: metrics.ev,
    ac: metrics.ac,
    bac: metrics.bac,
    sv: metrics.sv,
    cv: metrics.cv,
    spi: metrics.spi,
    cpi: metrics.cpi,
    eac: metrics.eac,
    etc: metrics.etc,
    vac: metrics.vac,
    completionRate: metrics.completionRate,
    healthStatus: metrics.healthStatus,
    calculationMode: metrics.calculationMode,
    progressMethod: metrics.progressMethod,
    forecastMethod: metrics.forecastMethod,
    formattedPv: metrics.formattedPv,
    formattedEv: metrics.formattedEv,
    formattedAc: metrics.formattedAc,
    formattedBac: metrics.formattedBac,
    isPredicted: metrics.isPredicted,
  };
}

/**
 * TaskEvmDataをシリアライズ可能な形式に変換
 */
function serializeTaskEvmData(task: TaskEvmData): TaskEvmDataSerialized {
  return {
    taskId: task.taskId,
    taskNo: task.taskNo,
    taskName: task.taskName,
    plannedStartDate: task.plannedStartDate.toISOString(),
    plannedEndDate: task.plannedEndDate.toISOString(),
    actualStartDate: task.actualStartDate?.toISOString() ?? null,
    actualEndDate: task.actualEndDate?.toISOString() ?? null,
    plannedManHours: task.plannedManHours,
    actualManHours: task.actualManHours,
    status: task.status,
    progressRate: task.progressRate,
    costPerHour: task.costPerHour,
    selfReportedProgress: task.selfReportedProgress,
    earnedValue: task.earnedValue,
    earnedValueCost: task.earnedValueCost,
  };
}

/**
 * ダッシュボード表示に必要なEVMデータを1リクエストでまとめて取得
 * （WBSデータの重いクエリを1回に集約し、現在メトリクス・時系列・タスク別詳細・日付範囲を返す）
 */
export async function getEvmDashboardData(
  params: z.infer<typeof GetEvmDashboardDataSchema>
): Promise<EvmActionResult<EvmDashboardData>> {
  try {
    const validated = GetEvmDashboardDataSchema.parse(params);

    const result = await evmService.getEvmDashboardData(validated.wbsId, {
      calculationMode: validated.calculationMode as EvmCalculationMode,
      progressMethod: validated.progressMethod as ProgressMeasurementMethod | undefined,
      forecastMethod: validated.forecastMethod as EvmForecastMethod | undefined,
      interval: validated.interval,
      periodMode: validated.periodMode,
      showPrediction: validated.showPrediction,
    });

    return {
      success: true,
      data: {
        currentMetrics: serializeEvmMetrics(result.currentMetrics),
        timeSeries: result.timeSeries.map(serializeEvmMetrics),
        taskDetails: result.taskDetails.map(serializeTaskEvmData),
        dateRange: {
          projectStartDate: null,
          projectEndDate: null,
          taskMinStartDate: result.dateRange.taskMinStartDate?.toISOString() ?? null,
          taskMaxEndDate: result.dateRange.taskMaxEndDate?.toISOString() ?? null,
          recommendedStartDate: result.dateRange.recommendedStartDate.toISOString(),
          recommendedEndDate: result.dateRange.recommendedEndDate.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error('Failed to get EVM dashboard data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
