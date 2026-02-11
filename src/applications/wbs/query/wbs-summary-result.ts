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
  assignee: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

/**
 * タスクの月別按分詳細
 */
export interface TaskAllocationDetail {
  taskId: string;
  taskName: string;
  phase?: string;
  assignee: string;
  startDate: string;
  endDate: string;
  totalPlannedHours: number;
  totalActualHours: number;
  monthlyAllocations: {
    month: string;
    workingDays: number;
    availableHours: number;
    allocatedPlannedHours: number;
    allocatedActualHours: number;
    allocatedForecastHours?: number;
    allocationRatio: number;
  }[];
}

/**
 * 月別・担当者別のセルデータ
 */
export interface MonthlyAssigneeData {
  assignee: string;
  month: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
  baselineHours?: number;
  forecastHours?: number;
  taskDetails?: TaskAllocationDetail[];
}

/**
 * 月別・担当者別集計
 */
export interface MonthlyAssigneeSummary {
  data: MonthlyAssigneeData[];
  months: string[];
  assignees: string[];
  monthlyTotals: Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  }>;
  assigneeTotals: Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  }>;
  grandTotal: {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  };
}

/**
 * 月別・工程別のセルデータ
 */
export interface MonthlyPhaseData {
  phase: string;
  month: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
  baselineHours?: number;
  forecastHours?: number;
  taskDetails?: TaskAllocationDetail[];
}

/**
 * 月別・工程別集計
 */
export interface MonthlyPhaseSummary {
  data: MonthlyPhaseData[];
  months: string[];
  phases: string[];
  monthlyTotals: Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  }>;
  phaseTotals: Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  }>;
  grandTotal: {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  };
}

/**
 * WBS集計結果
 */
export interface WbsSummaryResult {
  phaseSummaries: PhaseSummary[];
  phaseTotal: {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  };
  assigneeSummaries: AssigneeSummary[];
  assigneeTotal: {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  };
  monthlyAssigneeSummary: MonthlyAssigneeSummary;
  monthlyPhaseSummary?: MonthlyPhaseSummary;
}
