import { ProgressMeasurementMethod, ForecastCalculationMethod, EvmForecastMethod, TaskStatus } from '@prisma/client';
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
}
