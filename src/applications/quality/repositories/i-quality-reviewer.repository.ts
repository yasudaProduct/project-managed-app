import { QualityReviewer } from '@/domains/quality/entities/quality-reviewer';

export interface IQualityReviewerRepository {
  findByTarget(targetId: number): Promise<QualityReviewer[]>;
  replaceForTarget(targetId: number, reviewers: QualityReviewer[]): Promise<void>;
}
