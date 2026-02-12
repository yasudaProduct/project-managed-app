import { MonthlyPhaseData, MonthlyPhaseSummary, TaskAllocationDetail } from './wbs-summary-result';

/**
 * 月別・工程別集計の蓄積/集約アキュムレータ
 */
export class MonthlyPhaseSummaryAccumulator {
  private dataMap = new Map<string, MonthlyPhaseData>();
  private taskDetailsMap = new Map<string, TaskAllocationDetail[]>();
  private months = new Set<string>();
  private phases = new Set<string>();
  private phaseSeqMap: Map<string, number>;

  constructor(phaseSeqMap: Map<string, number> = new Map()) {
    this.phaseSeqMap = phaseSeqMap;
  }

  addTaskAllocation(
    phaseName: string,
    yearMonth: string,
    plannedHours: number,
    actualHours: number,
    baselineHours: number,
    taskDetail: TaskAllocationDetail,
    forecastHours?: number
  ): void {
    this.phases.add(phaseName);
    this.months.add(yearMonth);

    const key = `${yearMonth}-${phaseName}`;
    const existing = this.dataMap.get(key) || {
      phase: phaseName,
      month: yearMonth,
      taskCount: 0,
      baselineHours: 0,
      plannedHours: 0,
      actualHours: 0,
      difference: 0,
      forecastHours: 0,
      taskDetails: [],
    };

    existing.taskCount += 1;
    existing.baselineHours = (existing.baselineHours ?? 0) + baselineHours;
    existing.plannedHours += plannedHours;
    existing.actualHours += actualHours;
    existing.difference = existing.actualHours - existing.plannedHours;

    if (forecastHours !== undefined) {
      existing.forecastHours = (existing.forecastHours || 0) + forecastHours;
    }

    this.dataMap.set(key, existing);

    if (!this.taskDetailsMap.has(key)) {
      this.taskDetailsMap.set(key, []);
    }
    this.taskDetailsMap.get(key)!.push(taskDetail);
  }

  getTotals(): MonthlyPhaseSummary {
    const data: MonthlyPhaseData[] = [];
    for (const [key, row] of this.dataMap) {
      const taskDetails = this.taskDetailsMap.get(key) || [];
      data.push({ ...row, taskDetails });
    }

    const sortedMonths = Array.from(this.months).sort();
    const sortedPhases = Array.from(this.phases)
      .map(name => ({ key: name, seq: this.phaseSeqMap.get(name) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.seq - b.seq || a.key.localeCompare(b.key));
    const sortedPhaseKeys = sortedPhases.map(p => p.key);

    return {
      data,
      months: sortedMonths,
      phases: sortedPhases,
      monthlyTotals: this.calculateMonthlyTotals(data, sortedMonths),
      phaseTotals: this.calculatePhaseTotals(data, sortedPhaseKeys),
      grandTotal: this.calculateGrandTotal(data),
    };
  }

  private calculateMonthlyTotals(
    data: MonthlyPhaseData[],
    months: string[]
  ): Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  }> {
    const totals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
      baselineHours: number;
      forecastHours: number;
    }> = {};

    months.forEach(month => {
      totals[month] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
        baselineHours: 0,
        forecastHours: 0,
      };

      data.filter(d => d.month === month).forEach(d => {
        totals[month].taskCount += d.taskCount;
        totals[month].plannedHours += d.plannedHours;
        totals[month].actualHours += d.actualHours;
        totals[month].difference += d.difference;
        if (d.baselineHours) totals[month].baselineHours += d.baselineHours;
        if (d.forecastHours) totals[month].forecastHours += d.forecastHours;
      });
    });

    return totals;
  }

  private calculatePhaseTotals(
    data: MonthlyPhaseData[],
    phases: string[]
  ): Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  }> {
    const totals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
      baselineHours: number;
      forecastHours: number;
    }> = {};

    phases.forEach(phase => {
      totals[phase] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
        baselineHours: 0,
        forecastHours: 0,
      };

      data.filter(d => d.phase === phase).forEach(d => {
        totals[phase].taskCount += d.taskCount;
        totals[phase].plannedHours += d.plannedHours;
        totals[phase].actualHours += d.actualHours;
        totals[phase].difference += d.difference;
        if (d.baselineHours) totals[phase].baselineHours += d.baselineHours;
        if (d.forecastHours) totals[phase].forecastHours += d.forecastHours;
      });
    });

    return totals;
  }

  private calculateGrandTotal(
    data: MonthlyPhaseData[]
  ): {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours: number;
    forecastHours: number;
  } {
    const total = {
      taskCount: 0,
      plannedHours: 0,
      actualHours: 0,
      difference: 0,
      baselineHours: 0,
      forecastHours: 0,
    };

    data.forEach(d => {
      total.taskCount += d.taskCount;
      total.plannedHours += d.plannedHours;
      total.actualHours += d.actualHours;
      total.difference += d.difference;
      if (d.baselineHours) total.baselineHours += d.baselineHours;
      if (d.forecastHours) total.forecastHours += d.forecastHours;
    });

    return total;
  }
}
