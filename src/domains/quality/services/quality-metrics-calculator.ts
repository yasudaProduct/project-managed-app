import { QualitySizeUnit } from '../value-objects/quality-enums';
import { getSizeScaleFactor, IpaMetricKey } from '../value-objects/metric-definition';
import { QualityStatus } from '../value-objects/quality-status';

export interface MetricInput {
  reviewFindingCount: number;
  reviewEffort: number;
  bugCount: number;
  testCaseCount: number;
  size: number;
  sizeUnit: QualitySizeUnit;
}

export type MetricResult = Record<IpaMetricKey, number | null>;

export interface StatusThreshold {
  warnThreshold: number;
  dangerThreshold: number;
}

export class QualityMetricsCalculator {
  calcMetric(numerator: number, denominator: number, scaleFactor: number = 1): number | null {
    if (denominator === 0) return null;
    return (numerator / denominator) * scaleFactor;
  }

  calcAllMetrics(input: MetricInput): MetricResult {
    const scale = getSizeScaleFactor(input.sizeUnit);
    const effectiveSize = input.size / scale;

    return {
      reviewFindingDensity: this.calcMetric(input.reviewFindingCount, effectiveSize),
      reviewEffortDensity: this.calcMetric(input.reviewEffort, effectiveSize),
      reviewEfficiency: this.calcMetric(input.reviewFindingCount, input.reviewEffort),
      bugDensity: this.calcMetric(input.bugCount, effectiveSize),
      testDensity: this.calcMetric(input.testCaseCount, effectiveSize),
      testEfficiency: this.calcMetric(input.bugCount, input.testCaseCount),
    };
  }

  evaluateStatus(
    value: number | null,
    threshold: StatusThreshold | undefined
  ): QualityStatus | null {
    if (value === null) return null;
    if (!threshold) return QualityStatus.NORMAL;

    if (value >= threshold.dangerThreshold) return QualityStatus.DANGER;
    if (value >= threshold.warnThreshold) return QualityStatus.WARNING;
    return QualityStatus.NORMAL;
  }
}
