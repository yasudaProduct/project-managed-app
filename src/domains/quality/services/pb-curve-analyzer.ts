export interface PbCurveInput {
  date: Date;
  plannedTotal: number;
  executedTotal: number;
  passedTotal: number;
  failedTotal: number;
  blockedTotal: number;
}

export interface PbCurvePoint {
  date: Date;
  remaining: number;
  bugCumulative: number;
  executedTotal: number;
  plannedTotal: number;
  plannedRemaining?: number;
}

export interface PlanPoint {
  date: Date;
  plannedExecuted: number;
}

export class PbCurveAnalyzer {
  analyze(data: PbCurveInput[]): PbCurvePoint[] {
    if (data.length === 0) return [];

    const sorted = [...data].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return sorted.map((d) => ({
      date: d.date,
      remaining: d.plannedTotal - d.executedTotal,
      bugCumulative: d.failedTotal,
      executedTotal: d.executedTotal,
      plannedTotal: d.plannedTotal,
    }));
  }

  analyzeWithPlan(data: PbCurveInput[], plan: PlanPoint[]): PbCurvePoint[] {
    const points = this.analyze(data);
    const planMap = new Map(
      plan.map((p) => [p.date.toISOString(), p.plannedExecuted])
    );

    return points.map((p) => {
      const plannedExecuted = planMap.get(p.date.toISOString());
      return {
        ...p,
        plannedRemaining:
          plannedExecuted !== undefined
            ? p.plannedTotal - plannedExecuted
            : undefined,
      };
    });
  }
}
