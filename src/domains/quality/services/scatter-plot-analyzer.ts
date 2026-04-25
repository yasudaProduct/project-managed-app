import { QualityThresholdConfig } from '../entities/quality-threshold-config';

export type AggregationType = 'none' | 'subsystem' | 'featureGroup';

export interface ScatterDataPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  group?: string;
  groupType?: string;
}

export interface ScatterDataPointWithZone extends ScatterDataPoint {
  zone: 'inZone' | 'outOfZone';
}

export class ScatterPlotAnalyzer {
  aggregate(
    points: ScatterDataPoint[],
    aggregation: AggregationType
  ): ScatterDataPoint[] {
    if (points.length === 0) return [];
    if (aggregation === 'none') return points;

    const groups = new Map<string, ScatterDataPoint[]>();
    for (const p of points) {
      const key = p.group ?? '未分類';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }

    return Array.from(groups.entries()).map(([label, pts]) => ({
      id: `group-${label}`,
      label,
      x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length,
      y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length,
      group: label,
      groupType: aggregation,
    }));
  }

  classifyByZone(
    points: ScatterDataPoint[],
    thresholdX: QualityThresholdConfig | undefined,
    thresholdY: QualityThresholdConfig | undefined
  ): ScatterDataPointWithZone[] {
    return points.map((p) => {
      const xInZone = thresholdX ? thresholdX.isInZone(p.x) : true;
      const yInZone = thresholdY ? thresholdY.isInZone(p.y) : true;
      return {
        ...p,
        zone: xInZone && yInZone ? 'inZone' : 'outOfZone',
      };
    });
  }
}
