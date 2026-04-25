import { QualityFinding } from '@/domains/quality/entities/quality-finding';
import { FindingSource } from '@/domains/quality/value-objects/quality-enums';

export interface QualityFindingFilter {
  source?: FindingSource;
  fromDate?: Date;
  toDate?: Date;
}

export interface IQualityFindingRepository {
  findByTarget(targetId: number, filter?: QualityFindingFilter): Promise<QualityFinding[]>;
  findByTargetIds(targetIds: number[]): Promise<QualityFinding[]>;
  create(finding: QualityFinding): Promise<QualityFinding>;
  update(finding: QualityFinding): Promise<QualityFinding>;
  delete(id: number): Promise<void>;
  countByTarget(targetId: number, source?: FindingSource): Promise<number>;
  deleteByTargetId(targetId: number): Promise<void>;
}
