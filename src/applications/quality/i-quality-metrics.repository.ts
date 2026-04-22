import { QualitySizeMetric } from '@/domains/quality/quality-size-metric';
import { QualityFinding } from '@/domains/quality/quality-finding';
import { QualitySizeUnit, FindingSource } from '@/domains/quality/value-objects/quality-enums';

export interface IQualitySizeMetricRepository {
  findByTarget(targetId: number): Promise<QualitySizeMetric[]>;
  upsert(metric: QualitySizeMetric): Promise<QualitySizeMetric>;
  delete(id: number): Promise<void>;
  deleteByTargetAndUnit(targetId: number, unit: QualitySizeUnit): Promise<void>;
}

export interface FindingFilter {
  source?: FindingSource;
  fromDate?: Date;
  toDate?: Date;
}

export interface IQualityFindingRepository {
  findByTarget(targetId: number, filter?: FindingFilter): Promise<QualityFinding[]>;
  findByTargetIds(targetIds: number[]): Promise<QualityFinding[]>;
  create(finding: QualityFinding): Promise<QualityFinding>;
  update(finding: QualityFinding): Promise<QualityFinding>;
  delete(id: number): Promise<void>;
  countByTarget(targetId: number, source?: FindingSource): Promise<{ total: number }>;
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
}

export interface DailyManHours {
  date: Date;
  totalHours: number;
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

  getDailyReviewManHours(
    reviewTaskNos: { wbsId: number; taskNo: string }[],
    fromDate?: Date,
    toDate?: Date,
  ): Promise<DailyManHours[]>;
}
