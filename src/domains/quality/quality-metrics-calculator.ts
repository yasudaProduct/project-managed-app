import { QualityStatus } from './value-objects/quality-status';
import { QualityThreshold } from './value-objects/quality-threshold';

export class QualityMetricsCalculator {
  calcDensity(numerator: number, denominator: number, scaleFactor: number = 1): number | null {
    if (denominator === 0) return null;
    return (numerator / denominator) * scaleFactor;
  }

  calcReviewDensity(reviewManHours: number, size: number): number | null {
    return this.calcDensity(reviewManHours, size);
  }

  calcDefectDensity(defectCount: number, size: number): number | null {
    return this.calcDensity(defectCount, size);
  }

  calcReviewCompletionRate(completedCount: number, totalCount: number): number | null {
    if (totalCount === 0) return null;
    return completedCount / totalCount;
  }

  evaluateStatus(value: number | null, threshold: QualityThreshold | null): QualityStatus | null {
    if (value === null) return null;
    if (threshold === null) return QualityStatus.NORMAL;

    const { warnThreshold, dangerThreshold, higherIsBetter } = threshold;

    if (higherIsBetter) {
      if (value <= dangerThreshold) return QualityStatus.DANGER;
      if (value <= warnThreshold) return QualityStatus.WARNING;
      return QualityStatus.NORMAL;
    } else {
      if (value >= dangerThreshold) return QualityStatus.DANGER;
      if (value >= warnThreshold) return QualityStatus.WARNING;
      return QualityStatus.NORMAL;
    }
  }
}
