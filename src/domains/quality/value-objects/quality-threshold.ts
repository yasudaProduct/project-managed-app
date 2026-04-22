import type { MetricKey } from './metric-definition';

export interface QualityThreshold {
  warnThreshold: number;
  dangerThreshold: number;
  /** trueの場合、値が低いほど警告（例：レビュー実施率）。falseの場合、値が高いほど警告（例：指摘密度）*/
  higherIsBetter: boolean;
}

export type QualityThresholds = Record<MetricKey, QualityThreshold | undefined>;
