import { QualityReviewTarget } from '@/domains/quality/quality-review-target';
import { QualityReviewer } from '@/domains/quality/quality-reviewer';

export interface TargetFilter {
  isActive?: boolean;
  documentType?: string;
  reviewType?: string;
}

export interface IQualityReviewTargetRepository {
  findById(id: number): Promise<QualityReviewTarget | null>;
  findByWbs(wbsId: number, filter?: TargetFilter): Promise<QualityReviewTarget[]>;
  findByWbsAndTaskNo(wbsId: number, taskNo: string): Promise<QualityReviewTarget | null>;
  upsert(target: QualityReviewTarget): Promise<QualityReviewTarget>;
  deactivateMissing(wbsId: number, activeTaskNos: string[]): Promise<number>;
}

export interface IQualityReviewerRepository {
  replaceForTarget(targetId: number, reviewers: QualityReviewer[]): Promise<void>;
  findByTarget(targetId: number): Promise<QualityReviewer[]>;
}
