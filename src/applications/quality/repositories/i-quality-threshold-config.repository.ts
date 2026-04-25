import { QualityThresholdConfig } from '@/domains/quality/entities/quality-threshold-config';

export interface IQualityThresholdConfigRepository {
  findByWbs(wbsId: number): Promise<QualityThresholdConfig[]>;
  findByWbsAndMetric(
    wbsId: number,
    metricKey: string,
    phaseCode?: string
  ): Promise<QualityThresholdConfig | null>;
  upsert(config: QualityThresholdConfig): Promise<QualityThresholdConfig>;
  delete(id: number): Promise<void>;
}
