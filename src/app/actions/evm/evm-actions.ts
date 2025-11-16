'use server';

import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { EvmService } from '@/applications/evm/evm-service';
import { EvmMetrics, EvmCalculationMode } from '@/domains/evm/evm-metrics';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { ProgressMeasurementMethod } from '@prisma/client';

const evmService = container.get<EvmService>(SYMBOL.EvmService);

// バリデーションスキーマ
const GetCurrentEvmMetricsSchema = z.object({
  wbsId: z.number(),
  evaluationDate: z.string().optional(), // ISO 8601 string
  calculationMode: z.enum(['hours', 'cost']).default('hours'),
  progressMethod: z.enum(['ZERO_HUNDRED', 'FIFTY_FIFTY', 'SELF_REPORTED']).optional(),
});

const GetEvmTimeSeriesSchema = z.object({
  wbsId: z.number(),
  startDate: z.string(), // ISO 8601 string
  endDate: z.string(), // ISO 8601 string
  interval: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  calculationMode: z.enum(['hours', 'cost']).default('hours'),
  progressMethod: z.enum(['ZERO_HUNDRED', 'FIFTY_FIFTY', 'SELF_REPORTED']).optional(),
});

const GetTaskEvmDetailsSchema = z.object({
  wbsId: z.number(),
});

const GetEvmDateRangeSchema = z.object({
  wbsId: z.number(),
});

// 型定義
export type EvmActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type EvmMetricsData = {
  date: string; // ISO 8601 string
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
  formattedPv: string; // 計画価値のフォーマット（hours or cost）
  formattedEv: string; // 出来高のフォーマット（hours or cost）
  formattedAc: string; // 実コストのフォーマット（hours or cost）
  formattedBac: string; // 完了時予算のフォーマット（hours or cost）
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

/**
 * EvmMetricsをシリアライズ可能な形式に変換
 */
function serializeEvmMetrics(metrics: EvmMetrics): EvmMetricsData {
  return {
    date: metrics.date.toISOString(),
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
    formattedPv: metrics.formattedPv,
    formattedEv: metrics.formattedEv,
    formattedAc: metrics.formattedAc,
    formattedBac: metrics.formattedBac,
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
 * 現在のEVMメトリクスを取得
 */
export async function getCurrentEvmMetrics(
  params: z.infer<typeof GetCurrentEvmMetricsSchema>
): Promise<EvmActionResult<EvmMetricsData>> {
  try {
    const validated = GetCurrentEvmMetricsSchema.parse(params);
    const evaluationDate = validated.evaluationDate
      ? new Date(validated.evaluationDate)
      : new Date();

    const metrics = await evmService.calculateCurrentEvmMetrics(
      validated.wbsId,
      evaluationDate,
      validated.calculationMode as EvmCalculationMode,
      validated.progressMethod as ProgressMeasurementMethod | undefined
    );

    console.log('--------------------------------');
    console.log('Current EVM metrics:', metrics);
    console.log('--------------------------------');

    return {
      success: true,
      data: serializeEvmMetrics(metrics),
    };
  } catch (error) {
    console.error('Failed to get current EVM metrics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * EVM時系列データを取得
 */
export async function getEvmTimeSeries(
  params: z.infer<typeof GetEvmTimeSeriesSchema>
): Promise<EvmActionResult<EvmMetricsData[]>> {
  try {
    const validated = GetEvmTimeSeriesSchema.parse(params);
    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);

    const metricsList = await evmService.getEvmTimeSeries(
      validated.wbsId,
      startDate,
      endDate,
      validated.interval,
      validated.calculationMode as EvmCalculationMode,
      validated.progressMethod as ProgressMeasurementMethod | undefined
    );

    // console.log('--------------------------------');
    // console.log('EVM time series data:', metricsList);
    // console.log('--------------------------------');

    return {
      success: true,
      data: metricsList.map(serializeEvmMetrics),
    };
  } catch (error) {
    console.error('Failed to get EVM time series:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * タスク別EVMデータを取得
 */
export async function getTaskEvmDetails(
  params: z.infer<typeof GetTaskEvmDetailsSchema>
): Promise<EvmActionResult<TaskEvmDataSerialized[]>> {
  try {
    const validated = GetTaskEvmDetailsSchema.parse(params);

    const tasks = await evmService.getTaskEvmDetails(validated.wbsId);

    return {
      success: true,
      data: tasks.map(serializeTaskEvmData),
    };
  } catch (error) {
    console.error('Failed to get task EVM details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * EVM表示に適した日付範囲を取得
 */
export async function getEvmDateRange(
  params: z.infer<typeof GetEvmDateRangeSchema>
): Promise<EvmActionResult<EvmDateRangeData>> {
  try {
    const validated = GetEvmDateRangeSchema.parse(params);

    // タスクデータを取得
    const tasks = await evmService.getTaskEvmDetails(validated.wbsId);

    if (tasks.length === 0) {
      // タスクがない場合は現在日を基準にする
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      return {
        success: true,
        data: {
          projectStartDate: null,
          projectEndDate: null,
          taskMinStartDate: null,
          taskMaxEndDate: null,
          recommendedStartDate: threeMonthsAgo.toISOString(),
          recommendedEndDate: now.toISOString(),
        },
      };
    }

    // タスクの最小開始日と最大終了日を取得
    const taskStartDates = tasks
      .map((t) => new Date(t.plannedStartDate))
      .filter((d) => !isNaN(d.getTime()));
    const taskEndDates = tasks
      .map((t) => new Date(t.plannedEndDate))
      .filter((d) => !isNaN(d.getTime()));

    const minStartDate = taskStartDates.length > 0
      ? new Date(Math.min(...taskStartDates.map((d) => d.getTime())))
      : null;
    const maxEndDate = taskEndDates.length > 0
      ? new Date(Math.max(...taskEndDates.map((d) => d.getTime())))
      : null;

    // 推奨期間を決定
    // プロジェクト全体の期間を基準とする（タスクの最小開始日〜最大終了日）
    const recommendedStartDate = minStartDate || new Date();
    const recommendedEndDate = maxEndDate || new Date();

    return {
      success: true,
      data: {
        projectStartDate: null, // プロジェクト情報は別途取得が必要
        projectEndDate: null,
        taskMinStartDate: minStartDate?.toISOString() ?? null,
        taskMaxEndDate: maxEndDate?.toISOString() ?? null,
        recommendedStartDate: recommendedStartDate.toISOString(),
        recommendedEndDate: recommendedEndDate.toISOString(),
      },
    };
  } catch (error) {
    console.error('Failed to get EVM date range:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ヘルスステータスを取得（メトリクスから判定）
 */
export async function getEvmHealthStatus(
  params: z.infer<typeof GetCurrentEvmMetricsSchema>
): Promise<EvmActionResult<'healthy' | 'warning' | 'critical'>> {
  try {
    const result = await getCurrentEvmMetrics(params);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? 'Failed to get metrics',
      };
    }

    return {
      success: true,
      data: result.data.healthStatus,
    };
  } catch (error) {
    console.error('Failed to get EVM health status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
