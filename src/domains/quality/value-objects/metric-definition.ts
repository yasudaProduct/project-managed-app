import { QualitySizeUnit } from './quality-enums';

export type IpaMetricKey =
  | 'reviewFindingDensity'
  | 'reviewEffortDensity'
  | 'reviewEfficiency'
  | 'bugDensity'
  | 'testDensity'
  | 'testEfficiency';

export type MetricNumerator =
  | 'reviewFindingCount'
  | 'reviewEffort'
  | 'bugCount'
  | 'testCaseCount';

export type MetricDenominator =
  | 'size'
  | 'reviewEffort'
  | 'testCaseCount';

export interface IpaMetricDefinition {
  key: IpaMetricKey;
  label: string;
  numerator: MetricNumerator;
  denominator: MetricDenominator;
  phase: 'review' | 'test';
}

export const IPA_METRIC_DEFINITIONS: Record<IpaMetricKey, IpaMetricDefinition> = {
  reviewFindingDensity: {
    key: 'reviewFindingDensity',
    label: 'レビュー指摘密度',
    numerator: 'reviewFindingCount',
    denominator: 'size',
    phase: 'review',
  },
  reviewEffortDensity: {
    key: 'reviewEffortDensity',
    label: 'レビュー工数密度',
    numerator: 'reviewEffort',
    denominator: 'size',
    phase: 'review',
  },
  reviewEfficiency: {
    key: 'reviewEfficiency',
    label: 'レビュー指摘効率',
    numerator: 'reviewFindingCount',
    denominator: 'reviewEffort',
    phase: 'review',
  },
  bugDensity: {
    key: 'bugDensity',
    label: 'バグ密度',
    numerator: 'bugCount',
    denominator: 'size',
    phase: 'test',
  },
  testDensity: {
    key: 'testDensity',
    label: 'テスト密度',
    numerator: 'testCaseCount',
    denominator: 'size',
    phase: 'test',
  },
  testEfficiency: {
    key: 'testEfficiency',
    label: 'テスト効率',
    numerator: 'bugCount',
    denominator: 'testCaseCount',
    phase: 'test',
  },
};

export function getIpaMetricDefinition(key: IpaMetricKey): IpaMetricDefinition {
  return IPA_METRIC_DEFINITIONS[key];
}

export function getReviewMetrics(): IpaMetricDefinition[] {
  return Object.values(IPA_METRIC_DEFINITIONS).filter((d) => d.phase === 'review');
}

export function getTestMetrics(): IpaMetricDefinition[] {
  return Object.values(IPA_METRIC_DEFINITIONS).filter((d) => d.phase === 'test');
}

export function getSizeScaleFactor(unit: QualitySizeUnit): number {
  return unit === QualitySizeUnit.LOC ? 1000 : 1;
}
