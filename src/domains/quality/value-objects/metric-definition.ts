import { FindingSource, QualitySizeUnit } from './quality-enums';

export type MetricKey = string;

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  unitSuffix: string;
  numerator: {
    source: 'reviewManHours' | 'findingCount' | 'sizeMetric';
    findingSource?: FindingSource;
    sizeUnit?: QualitySizeUnit;
  };
  denominator: {
    source: 'selectedSize' | 'sizeMetric';
    sizeUnit?: QualitySizeUnit;
  };
  scaleFactor: number;
  higherIsBetter: boolean;
}

const PAGE_DEFINITIONS: MetricDefinition[] = [
  {
    key: 'reviewDensity',
    label: 'レビュー密度',
    unitSuffix: '/page',
    numerator: { source: 'reviewManHours' },
    denominator: { source: 'selectedSize' },
    scaleFactor: 1,
    higherIsBetter: false,
  },
  {
    key: 'defectDensity',
    label: '指摘密度',
    unitSuffix: '/page',
    numerator: { source: 'findingCount', findingSource: FindingSource.REVIEW },
    denominator: { source: 'selectedSize' },
    scaleFactor: 1,
    higherIsBetter: false,
  },
];

const LOC_DEFINITIONS: MetricDefinition[] = [
  {
    key: 'reviewDensity',
    label: 'レビュー密度',
    unitSuffix: '/KLOC',
    numerator: { source: 'reviewManHours' },
    denominator: { source: 'selectedSize' },
    scaleFactor: 1000,
    higherIsBetter: false,
  },
  {
    key: 'defectDensity',
    label: '指摘密度',
    unitSuffix: '/KLOC',
    numerator: { source: 'findingCount', findingSource: FindingSource.REVIEW },
    denominator: { source: 'selectedSize' },
    scaleFactor: 1000,
    higherIsBetter: false,
  },
];

const TEST_CASE_DEFINITIONS: MetricDefinition[] = [
  {
    key: 'bugDensity',
    label: 'バグ密度',
    unitSuffix: '/TC',
    numerator: { source: 'findingCount', findingSource: FindingSource.TEST },
    denominator: { source: 'selectedSize' },
    scaleFactor: 1,
    higherIsBetter: false,
  },
  {
    key: 'testDensity',
    label: 'テスト密度',
    unitSuffix: '/KLOC',
    numerator: { source: 'sizeMetric', sizeUnit: QualitySizeUnit.TEST_CASE },
    denominator: { source: 'sizeMetric', sizeUnit: QualitySizeUnit.LINES_OF_CODE },
    scaleFactor: 1000,
    higherIsBetter: true,
  },
];

const MAN_HOUR_DEFINITIONS: MetricDefinition[] = [
  {
    key: 'reviewDensity',
    label: 'レビュー密度',
    unitSuffix: '/h',
    numerator: { source: 'reviewManHours' },
    denominator: { source: 'selectedSize' },
    scaleFactor: 1,
    higherIsBetter: false,
  },
  {
    key: 'defectDensity',
    label: '指摘密度',
    unitSuffix: '/h',
    numerator: { source: 'findingCount', findingSource: FindingSource.REVIEW },
    denominator: { source: 'selectedSize' },
    scaleFactor: 1,
    higherIsBetter: false,
  },
];

export const METRIC_DEFINITIONS: Record<QualitySizeUnit | 'MAN_HOUR', MetricDefinition[]> = {
  [QualitySizeUnit.PAGE]: PAGE_DEFINITIONS,
  [QualitySizeUnit.LINES_OF_CODE]: LOC_DEFINITIONS,
  [QualitySizeUnit.TEST_CASE]: TEST_CASE_DEFINITIONS,
  MAN_HOUR: MAN_HOUR_DEFINITIONS,
};

export function getMetricDefinitions(sizeUnit: QualitySizeUnit | 'MAN_HOUR'): MetricDefinition[] {
  return METRIC_DEFINITIONS[sizeUnit];
}

export function shouldShowReviewCompletionRate(sizeUnit: QualitySizeUnit | 'MAN_HOUR'): boolean {
  return sizeUnit !== QualitySizeUnit.TEST_CASE;
}
