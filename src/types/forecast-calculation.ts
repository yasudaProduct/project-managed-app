import type { ProgressMeasurementMethod } from '@/types/progress-measurement';
import type { SteadyTaskForecastMode } from '@/types/scheduling-settings';

export interface ForecastCalculationOptions {
  method: 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual';
  progressMeasurementMethod?: ProgressMeasurementMethod;
  /**
   * 定常タスクの見通し算出方式。ForecastTaskInput.isSteady が true のタスクにのみ適用される。
   * 未指定時は 'PLANNED'（予定ベース）。
   */
  steadyTaskForecastMode?: SteadyTaskForecastMode;
}

export interface ForecastCalculationResult {
  taskId: string;
  taskName: string;
  plannedHours: number;
  actualHours: number;
  progressRate: number;
  effectiveProgressRate: number;
  forecastHours: number;
  completionStatus: string;
  /** 定常タスクとして算出したか（進捗率ベースの通常方式ではなく定常方式を適用したか） */
  isSteady?: boolean;
  /** 定常タスクの日次消費ペース（h/営業日）。見通しバーの終了日算出に使用する */
  steadyDailyRate?: number;
}
