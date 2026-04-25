import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { QualityTarget } from '@/domains/quality/entities/quality-target';
import { QualityMetricsCalculator, MetricInput, MetricResult } from '@/domains/quality/services/quality-metrics-calculator';
import { QualitySizeUnit, FindingSource } from '@/domains/quality/value-objects/quality-enums';
import type { IQualityTargetRepository } from './repositories/i-quality-target.repository';
import type { IQualityFindingRepository } from './repositories/i-quality-finding.repository';
import type { IQualitySizeMetricRepository } from './repositories/i-quality-size-metric.repository';
import type { IQualityReviewerRepository } from './repositories/i-quality-reviewer.repository';
import type { IQualityThresholdConfigRepository } from './repositories/i-quality-threshold-config.repository';

export interface TargetMetricsResult {
  target: QualityTarget;
  metrics: MetricResult;
  reviewFindingCount: number;
  bugCount: number;
  reviewEffort: number;
  size: number;
  testCaseCount: number;
}

export interface WbsSummary {
  targetCount: number;
  totalReviewFindings: number;
  totalBugs: number;
  totalReviewEffort: number;
  totalSize: number;
  totalTestCases: number;
  totalMetrics: MetricResult;
}

@injectable()
export class QualityMetricsService {
  private calculator = new QualityMetricsCalculator();

  constructor(
    @inject(SYMBOL.IQualityTargetRepository) private targetRepo: IQualityTargetRepository,
    @inject(SYMBOL.IQualityFindingRepository) private findingRepo: IQualityFindingRepository,
    @inject(SYMBOL.IQualitySizeMetricRepository) private sizeMetricRepo: IQualitySizeMetricRepository,
    @inject(SYMBOL.IQualityReviewerRepository) private reviewerRepo: IQualityReviewerRepository,
    @inject(SYMBOL.IQualityThresholdConfigRepository) private thresholdRepo: IQualityThresholdConfigRepository,
  ) {}

  async calcTargetMetrics(target: QualityTarget, sizeUnit: QualitySizeUnit): Promise<TargetMetricsResult> {
    const [reviewCount, bugCount, sizeMetrics, reviewers] = await Promise.all([
      this.findingRepo.countByTarget(target.id!, FindingSource.REVIEW),
      this.findingRepo.countByTarget(target.id!, FindingSource.TEST),
      this.sizeMetricRepo.findByTarget(target.id!),
      this.reviewerRepo.findByTarget(target.id!),
    ]);

    const sizeMetric = sizeMetrics.find((m) => m.unit === sizeUnit);
    const size = sizeMetric?.value ?? 0;
    const testCaseMetric = sizeMetrics.find((m) => m.unit === QualitySizeUnit.TEST_CASE);
    const testCaseCount = testCaseMetric?.value ?? 0;
    const reviewEffort = reviewers.reduce((sum, r) => sum + (r.reviewHours ?? 0), 0);

    const input: MetricInput = {
      reviewFindingCount: reviewCount,
      reviewEffort,
      bugCount,
      testCaseCount,
      size,
      sizeUnit,
    };

    return {
      target,
      metrics: this.calculator.calcAllMetrics(input),
      reviewFindingCount: reviewCount,
      bugCount,
      reviewEffort,
      size,
      testCaseCount,
    };
  }

  async getWbsSummary(wbsId: number, sizeUnit: QualitySizeUnit): Promise<WbsSummary> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });
    const results = await Promise.all(
      targets.map((t) => this.calcTargetMetrics(t, sizeUnit))
    );

    const totalReviewFindings = results.reduce((s, r) => s + r.reviewFindingCount, 0);
    const totalBugs = results.reduce((s, r) => s + r.bugCount, 0);
    const totalReviewEffort = results.reduce((s, r) => s + r.reviewEffort, 0);
    const totalSize = results.reduce((s, r) => s + r.size, 0);
    const totalTestCases = results.reduce((s, r) => s + r.testCaseCount, 0);

    const totalInput: MetricInput = {
      reviewFindingCount: totalReviewFindings,
      reviewEffort: totalReviewEffort,
      bugCount: totalBugs,
      testCaseCount: totalTestCases,
      size: totalSize,
      sizeUnit,
    };

    return {
      targetCount: targets.length,
      totalReviewFindings,
      totalBugs,
      totalReviewEffort,
      totalSize,
      totalTestCases,
      totalMetrics: this.calculator.calcAllMetrics(totalInput),
    };
  }
}
