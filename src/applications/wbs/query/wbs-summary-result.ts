export interface PhaseSummary {
  phase: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

export interface AssigneeSummary {
  assignee: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

export interface MonthlyAssigneeData {
  assignee: string;
  month: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

export interface MonthlyAssigneeSummary {
  data: MonthlyAssigneeData[];
  months: string[];
  assignees: string[];
  monthlyTotals: Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  }>;
  assigneeTotals: Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  }>;
  grandTotal: {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  };
}

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
}