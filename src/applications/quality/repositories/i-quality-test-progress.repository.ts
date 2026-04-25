import { QualityTestProgress } from '@/domains/quality/entities/quality-test-progress';

export interface IQualityTestProgressRepository {
  findByTarget(targetId: number): Promise<QualityTestProgress[]>;
  findByTargetAndDateRange(
    targetId: number,
    fromDate: Date,
    toDate: Date
  ): Promise<QualityTestProgress[]>;
  upsert(progress: QualityTestProgress): Promise<QualityTestProgress>;
  deleteByTargetId(targetId: number): Promise<void>;
}
