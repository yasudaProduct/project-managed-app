import { QualitySizeMetric } from '@/domains/quality/quality-size-metric';
import { QualityFinding } from '@/domains/quality/quality-finding';
import { QualitySizeUnit, QualitySeverity } from '@/domains/quality/value-objects/quality-enums';

export interface IQualitySizeMetricRepository {
  findByTarget(targetId: number): Promise<QualitySizeMetric[]>;
  upsert(metric: QualitySizeMetric): Promise<QualitySizeMetric>;
  delete(id: number): Promise<void>;
  deleteByTargetAndUnit(targetId: number, unit: QualitySizeUnit): Promise<void>;
}

export interface FindingFilter {
  severity?: QualitySeverity;
  fromDate?: Date;
  toDate?: Date;
}

export interface IQualityFindingRepository {
  findByTarget(targetId: number, filter?: FindingFilter): Promise<QualityFinding[]>;
  create(finding: QualityFinding): Promise<QualityFinding>;
  update(finding: QualityFinding): Promise<QualityFinding>;
  delete(id: number): Promise<void>;
  countByTarget(targetId: number): Promise<{ total: number; major: number }>;
  deleteByTargetId(targetId: number): Promise<number>;
}

export interface ReviewManHoursResult {
  taskNo: string;
  wbsId: number;
  totalHours: number;
}

export interface DailyFindingCount {
  date: Date;
  total: number;
  major: number;
}

export interface IQualityMetricsReadRepository {
  getReviewManHours(
    reviewTaskNos: { wbsId: number; taskNo: string }[],
    fromDate?: Date,
    toDate?: Date,
  ): Promise<ReviewManHoursResult[]>;

  getTaskManHours(
    taskNos: { wbsId: number; taskNo: string }[],
  ): Promise<ReviewManHoursResult[]>;

  getDailyFindingCounts(
    targetIds: number[],
    fromDate?: Date,
    toDate?: Date,
  ): Promise<DailyFindingCount[]>;
}
