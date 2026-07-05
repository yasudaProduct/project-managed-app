import type { ProgressMeasurementMethod } from '@/types/progress-measurement';

export interface ForecastCalculationOptions {
  method: 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual';
  progressMeasurementMethod?: ProgressMeasurementMethod;
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
}
