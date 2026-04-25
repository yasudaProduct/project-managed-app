import { QualitySizeMetric } from '@/domains/quality/entities/quality-size-metric';

export interface IQualitySizeMetricRepository {
  findByTarget(targetId: number): Promise<QualitySizeMetric[]>;
  upsert(metric: QualitySizeMetric): Promise<QualitySizeMetric>;
  delete(id: number): Promise<void>;
  deleteByTargetAndUnit(targetId: number, unit: string): Promise<void>;
}
