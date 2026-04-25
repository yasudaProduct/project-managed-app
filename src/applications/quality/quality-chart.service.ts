import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { QualityMetricsCalculator, MetricInput } from '@/domains/quality/services/quality-metrics-calculator';
import { PbCurveAnalyzer, PbCurvePoint } from '@/domains/quality/services/pb-curve-analyzer';
import { ScatterPlotAnalyzer, ScatterDataPoint, AggregationType } from '@/domains/quality/services/scatter-plot-analyzer';
import { ParetoAnalyzer, ParetoItem, FindingGroupField } from '@/domains/quality/services/pareto-analyzer';
import { QualitySizeUnit, FindingSource } from '@/domains/quality/value-objects/quality-enums';
import { IpaMetricKey } from '@/domains/quality/value-objects/metric-definition';
import type { IQualityTargetRepository } from './repositories/i-quality-target.repository';
import type { IQualityFindingRepository } from './repositories/i-quality-finding.repository';
import type { IQualitySizeMetricRepository } from './repositories/i-quality-size-metric.repository';
import type { IQualityReviewerRepository } from './repositories/i-quality-reviewer.repository';
import type { IQualityTestProgressRepository } from './repositories/i-quality-test-progress.repository';
import type { IQualityThresholdConfigRepository } from './repositories/i-quality-threshold-config.repository';

export interface ScatterResult {
  points: ScatterDataPoint[];
  xThreshold?: { upperLimit?: number; lowerLimit?: number };
  yThreshold?: { upperLimit?: number; lowerLimit?: number };
}

@injectable()
export class QualityChartService {
  private metricsCalc = new QualityMetricsCalculator();
  private pbAnalyzer = new PbCurveAnalyzer();
  private scatterAnalyzer = new ScatterPlotAnalyzer();
  private paretoAnalyzer = new ParetoAnalyzer();

  constructor(
    @inject(SYMBOL.IQualityTargetRepository) private targetRepo: IQualityTargetRepository,
    @inject(SYMBOL.IQualityFindingRepository) private findingRepo: IQualityFindingRepository,
    @inject(SYMBOL.IQualitySizeMetricRepository) private sizeMetricRepo: IQualitySizeMetricRepository,
    @inject(SYMBOL.IQualityReviewerRepository) private reviewerRepo: IQualityReviewerRepository,
    @inject(SYMBOL.IQualityTestProgressRepository) private testProgressRepo: IQualityTestProgressRepository,
    @inject(SYMBOL.IQualityThresholdConfigRepository) private thresholdRepo: IQualityThresholdConfigRepository,
  ) {}

  async getScatterData(
    wbsId: number,
    sizeUnit: QualitySizeUnit,
    xMetric: IpaMetricKey,
    yMetric: IpaMetricKey,
    aggregation: AggregationType,
  ): Promise<ScatterResult> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });

    const points: ScatterDataPoint[] = [];
    for (const target of targets) {
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
      const reviewEffort = reviewers.reduce((s, r) => s + (r.reviewHours ?? 0), 0);

      const input: MetricInput = {
        reviewFindingCount: reviewCount, reviewEffort, bugCount, testCaseCount, size, sizeUnit,
      };
      const metrics = this.metricsCalc.calcAllMetrics(input);

      const x = metrics[xMetric];
      const y = metrics[yMetric];
      if (x !== null && y !== null) {
        points.push({
          id: String(target.id),
          label: target.name,
          x,
          y,
          group: aggregation === 'subsystem' ? target.subsystem : target.featureGroup,
          groupType: aggregation,
        });
      }
    }

    const aggregated = this.scatterAnalyzer.aggregate(points, aggregation);

    const [xThresholdConfig, yThresholdConfig] = await Promise.all([
      this.thresholdRepo.findByWbsAndMetric(wbsId, xMetric),
      this.thresholdRepo.findByWbsAndMetric(wbsId, yMetric),
    ]);

    return {
      points: aggregated,
      xThreshold: xThresholdConfig
        ? { upperLimit: xThresholdConfig.upperLimit, lowerLimit: xThresholdConfig.lowerLimit }
        : undefined,
      yThreshold: yThresholdConfig
        ? { upperLimit: yThresholdConfig.upperLimit, lowerLimit: yThresholdConfig.lowerLimit }
        : undefined,
    };
  }

  async getPbCurveData(targetId: number): Promise<PbCurvePoint[]> {
    const progressData = await this.testProgressRepo.findByTarget(targetId);
    return this.pbAnalyzer.analyze(progressData);
  }

  async getParetoData(wbsId: number, groupField: FindingGroupField): Promise<ParetoItem[]> {
    const targets = await this.targetRepo.findByWbs(wbsId, { isActive: true });
    const targetIds = targets.map((t) => t.id!);
    const findings = await this.findingRepo.findByTargetIds(targetIds);

    const grouped = this.paretoAnalyzer.groupByField(
      findings.map((f) => ({
        causeType: f.causeType,
        phenomenonType: f.phenomenonType,
        injectionPhase: f.injectionPhase,
        category: f.category,
      })),
      groupField
    );

    return this.paretoAnalyzer.analyze(grouped);
  }
}
