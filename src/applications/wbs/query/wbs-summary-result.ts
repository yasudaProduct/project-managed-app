/**
 * 工程別集計表の1行分のデータモデル
 */
export interface PhaseSummary {
  /** 工程 */
  phase: string;
  /** タスク数 */
  taskCount: number;
  /** 予定工数 */
  plannedHours: number;
  /** 実績工数 */
  actualHours: number;
  /** 差分 */
  difference: number;
}

/**
 * 担当者別集計表の1行分のデータモデル
 */
export interface AssigneeSummary {
  /** 担当者 */
  assignee: string;
  /** タスク数 */
  taskCount: number;
  /** 予定工数 */
  plannedHours: number;
  /** 実績工数 */
  actualHours: number;
  /** 差分 */
  difference: number;
}

/**
 * タスクの月別按分詳細
 */
export interface TaskAllocationDetail {
  /** タスクID */
  taskId: string;
  /** タスク名 */
  taskName: string;
  /** 工程 */
  phase?: string;
  /** 担当者 */
  assignee: string;
  /** 開始日 */
  startDate: string;
  /** 終了日 */
  endDate: string;
  /** 予定工数 */
  totalPlannedHours: number;
  /** 実績工数 */
  totalActualHours: number;
  /** 月別按分詳細 */
  monthlyAllocations: {
    /** 月 */
    month: string;
    /** 営業日数 */
    workingDays: number;
    /** 利用可能時間 */
    availableHours: number;
    /** 配分予定工数 */
    allocatedPlannedHours: number;
    /** 配分実績工数 */
    allocatedActualHours: number;
    /** 配分比率 */
    allocationRatio: number;
  }[];
}

/**
 * 月別・担当者別のセルデータ
 */
export interface MonthlyAssigneeData {
  /** 担当者 */
  assignee: string;
  /** 月 */
  month: string;
  /** タスク数 */
  taskCount: number;
  /** 予定工数 */
  plannedHours: number;
  /** 実績工数 */
  actualHours: number;
  /** 差分 */
  difference: number;
  /** 基準工数（task_period.type='KIJUN'）: 月別・担当者別集計表のオプション列で表示 */
  baselineHours?: number;
  /** 見通し工数（実績 + 残りの予定）: 月別・担当者別集計表のオプション列で表示 */
  forecastHours?: number;
  /** タスク詳細 */
  taskDetails?: TaskAllocationDetail[];
}

/**
 * 月別・担当者別集計
 */
export interface MonthlyAssigneeSummary {
  /** 月別・担当者別集計表の行データ */
  data: MonthlyAssigneeData[];
  /** 月別・担当者別集計表の月別データ */
  months: string[];
  /** 月別・担当者別集計表の担当者データ */
  assignees: string[];
  /** 月別・担当者別集計表の月別合計データ */
  monthlyTotals: Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours?: number;
    forecastHours?: number;
  }>;
  /** 月別・担当者別集計表の担当者合計データ */
  assigneeTotals: Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours?: number;
    forecastHours?: number;
  }>;
  /** 月別・担当者別集計表の全体合計データ */
  grandTotal: {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours?: number;
    forecastHours?: number;
  };
}

/**
 * WBS集計結果
 */
export interface WbsSummaryResult {
  /** 工程別集計表の行データ */
  phaseSummaries: PhaseSummary[];
  /** 工程別集計表の合計データ */
  phaseTotal: {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  };
  /** 担当者別集計表の行データ */
  assigneeSummaries: AssigneeSummary[];
  /** 担当者別集計表の合計データ */
  assigneeTotal: {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  };
  /** 月別・担当者別集計表のデータ */
  monthlyAssigneeSummary: MonthlyAssigneeSummary;
}