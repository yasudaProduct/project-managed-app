export interface ParetoInput {
  category: string;
  count: number;
}

export interface ParetoItem {
  category: string;
  count: number;
  cumulativePercent: number;
}

export type FindingGroupField = 'causeType' | 'phenomenonType' | 'injectionPhase' | 'category' | 'assigneeId';

export class ParetoAnalyzer {
  analyze(data: ParetoInput[]): ParetoItem[] {
    if (data.length === 0) return [];

    const sorted = [...data].sort((a, b) => b.count - a.count);
    const total = sorted.reduce((sum, d) => sum + d.count, 0);

    let cumulative = 0;
    return sorted.map((d) => {
      cumulative += d.count;
      return {
        category: d.category,
        count: d.count,
        cumulativePercent: (cumulative / total) * 100,
      };
    });
  }

  groupByField(
    findings: Record<string, unknown>[],
    field: FindingGroupField
  ): ParetoInput[] {
    if (findings.length === 0) return [];

    const counts = new Map<string, number>();
    for (const f of findings) {
      const key = (f[field] as string) ?? '未分類';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }
}
