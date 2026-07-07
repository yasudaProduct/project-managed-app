import type { ProgressMeasurementMethod } from '@/types/progress-measurement';
import type { EvmForecastMethod } from '@/types/evm-forecast-method';
import type { EvmCalculationMode } from '@/types/evm';
import type { EvmMetrics } from '@/domains/evm/evm-metrics';
import type { TaskEvmData } from '@/domains/evm/task-evm-data';
import type {
  EvmDateRange,
  EvmBreakdownRow,
  ScheduleForecast,
  ScheduleForecastStatus,
} from '@/applications/evm/evm-service';

export type { EvmBreakdownRow };

export type EvmMetricsData = {
  date: string;
  pv_base: number;
  pv: number;
  ev: number;
  ac: number;
  bac: number;
  sv: number;
  cv: number;
  spi: number | null;
  cpi: number | null;
  eac: number;
  etc: number;
  vac: number;
  completionRate: number;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'no_data';
  calculationMode: EvmCalculationMode;
  progressMethod: ProgressMeasurementMethod;
  forecastMethod: EvmForecastMethod;
  formattedPv: string;
  formattedEv: string;
  formattedAc: string;
  formattedBac: string;
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
  /** ダッシュボードで選択中の測定方式を適用した進捗率（0〜100） */
  methodProgressRate: number;
  /** 選択中の測定方式を適用した出来高（工数ベース）。合計EVと整合する */
  methodEarnedValue: number;
  /** 選択中の測定方式を適用した出来高（金額ベース） */
  methodEarnedValueCost: number;
};

export type EvmDateRangeData = {
  projectStartDate: string | null;
  projectEndDate: string | null;
  taskMinStartDate: string | null;
  taskMaxEndDate: string | null;
  recommendedStartDate: string;
  recommendedEndDate: string;
};

export type ScheduleForecastData = {
  status: ScheduleForecastStatus;
  forecastCompletionDate: string | null;
  plannedEndDate: string | null;
  delayDays: number | null;
  spiT: number | null;
};

export type EvmDashboardData = {
  currentMetrics: EvmMetricsData;
  timeSeries: EvmMetricsData[];
  taskDetails: TaskEvmDataSerialized[];
  dateRange: EvmDateRangeData;
  scheduleForecast: ScheduleForecastData;
  phaseBreakdown: EvmBreakdownRow[];
  assigneeBreakdown: EvmBreakdownRow[];
};

export function serializeEvmMetrics(metrics: EvmMetrics): EvmMetricsData {
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

export function serializeTaskEvmData(
  task: TaskEvmData,
  progressMethod: ProgressMeasurementMethod = 'SELF_REPORTED'
): TaskEvmDataSerialized {
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
    methodProgressRate: task.getDirectProgressRate(progressMethod),
    methodEarnedValue: task.getEarnedValueDirect('hours', progressMethod),
    methodEarnedValueCost: task.getEarnedValueDirect('cost', progressMethod),
  };
}

export function serializeEvmDashboardData(result: {
  currentMetrics: EvmMetrics;
  timeSeries: EvmMetrics[];
  taskDetails: TaskEvmData[];
  dateRange: EvmDateRange;
  scheduleForecast: ScheduleForecast;
  phaseBreakdown: EvmBreakdownRow[];
  assigneeBreakdown: EvmBreakdownRow[];
}): EvmDashboardData {
  // タスク明細のEVは、合計EVと同じ「解決済みの測定方式」で算出する（明細と合計の不一致を防ぐ）
  const progressMethod = result.currentMetrics.progressMethod;
  return {
    currentMetrics: serializeEvmMetrics(result.currentMetrics),
    timeSeries: result.timeSeries.map(serializeEvmMetrics),
    taskDetails: result.taskDetails.map((t) =>
      serializeTaskEvmData(t, progressMethod)
    ),
    dateRange: {
      projectStartDate: null,
      projectEndDate: null,
      taskMinStartDate: result.dateRange.taskMinStartDate?.toISOString() ?? null,
      taskMaxEndDate: result.dateRange.taskMaxEndDate?.toISOString() ?? null,
      recommendedStartDate: result.dateRange.recommendedStartDate.toISOString(),
      recommendedEndDate: result.dateRange.recommendedEndDate.toISOString(),
    },
    scheduleForecast: {
      status: result.scheduleForecast.status,
      forecastCompletionDate:
        result.scheduleForecast.forecastCompletionDate?.toISOString() ?? null,
      plannedEndDate:
        result.scheduleForecast.plannedEndDate?.toISOString() ?? null,
      delayDays: result.scheduleForecast.delayDays,
      spiT: result.scheduleForecast.spiT,
    },
    phaseBreakdown: result.phaseBreakdown,
    assigneeBreakdown: result.assigneeBreakdown,
  };
}
