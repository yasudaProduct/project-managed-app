import type { ProgressMeasurementMethod } from '@/types/progress-measurement';
import type { ForecastCalculationMethod } from '@/types/forecast-calculation-method';
import type { EvmForecastMethod } from '@/types/evm-forecast-method';
import type { EvmBufferCostMethod } from '@/types/evm-buffer-cost-method';
import type { EvmPvDistribution } from '@/types/evm-pv-distribution';
import type { TaskStatus } from '@/types/wbs';
import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { EvmCalculationMode } from '@/domains/evm/evm-metrics';

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

  // 進捗スナップショット履歴（snapshotAt <= toDate を全件、taskId/snapshotAt 昇順）
  getProgressSnapshots(wbsId: number, toDate: Date): Promise<TaskProgressSnapshotRecord[]>;

  // 会社休日の取得（営業日ベースPV按分用。日付のみの配列を返す）
  getCompanyHolidays(startDate: Date, endDate: Date): Promise<Date[]>;

  // 訂正画面用：編集対象スナップショット一覧（id 付き、isRemoved=false、taskNo/snapshotAt 昇順）
  getEditableProgressSnapshots(wbsId: number): Promise<EditableProgressSnapshot[]>;

  // 訂正画面用：1件のスナップショットの progressRate / status のみ更新
  updateProgressSnapshot(
    id: number,
    progressRate: number | null,
    status: TaskStatus
  ): Promise<void>;
}

// 進捗スナップショット訂正画面用の編集レコード（行 id とタスク名を含む）
export interface EditableProgressSnapshot {
  id: number;
  taskId: number;
  taskNo: string;
  taskName: string;
  snapshotAt: Date;
  progressRate: number | null;
  status: TaskStatus;
  syncLogId: number | null; // null = 手動編集（ガント等）による記録
}

// 進捗スナップショット1件の読み出し用レコード（時点データ・自己完結）
export interface TaskProgressSnapshotRecord {
  taskId: number;
  taskNo: string;
  snapshotAt: Date;
  progressRate: number | null;
  status: TaskStatus;
  plannedManHours: number;
  baseManHours: number;
  costPerHour: number;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  baseStart: Date | null;
  baseEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  isRemoved: boolean;
}

export interface WbsEvmData {
  wbsId: number;
  projectId: string;
  projectName: string;
  totalPlannedManHours: number;
  totalBaseManHours: number;
  tasks: TaskEvmData[];
  buffers: BufferData[];
  settings: ProjectSettingsData | null;
  /** WBS担当者の平均単価（円/h）。担当者未登録時はnull。バッファの金額換算に使用 */
  averageCostPerHour?: number | null;
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
  evmForecastMethod: EvmForecastMethod;
  evmBufferCostMethod?: EvmBufferCostMethod;
  evmPvDistribution?: EvmPvDistribution;
  evmHealthyThresholdPct?: number;
  evmWarningThresholdPct?: number;
}
