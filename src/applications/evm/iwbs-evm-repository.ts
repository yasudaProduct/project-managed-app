import { ProgressMeasurementMethod, ForecastCalculationMethod } from '@prisma/client';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { EvmMetrics, EvmCalculationMode } from '@/domains/evm/evm-metrics';

export interface IWbsEvmRepository {
  // WBS全体のEVMデータを取得
  getWbsEvmData(wbsId: number, evaluationDate: Date): Promise<WbsEvmData>;

  // タスクごとのEVMデータを取得
  getTasksEvmData(wbsId: number): Promise<TaskEvmData[]>;

  // 実績コストの集計（算出方式に応じて工数または金額）
  getActualCostByDate(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    calculationMode?: EvmCalculationMode
  ): Promise<Map<string, number>>;

  // バッファ情報の取得
  getBuffers(wbsId: number): Promise<BufferData[]>;

  // プロジェクト設定の取得
  getProjectSettings(projectId: string): Promise<ProjectSettingsData | null>;
}

export interface WbsEvmData {
  wbsId: number;
  projectId: string;
  projectName: string;
  totalPlannedManHours: number;
  tasks: TaskEvmData[];
  buffers: BufferData[];
  settings: ProjectSettingsData | null;
}

export interface BufferData {
  id: number;
  name: string;
  bufferHours: number;
  bufferType: string;
}

export interface ProjectSettingsData {
  projectId: string;
  progressMeasurementMethod: ProgressMeasurementMethod;
  forecastCalculationMethod: ForecastCalculationMethod;
}
