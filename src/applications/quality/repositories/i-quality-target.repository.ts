import { QualityTarget } from '@/domains/quality/entities/quality-target';

export interface QualityTargetFilter {
  isActive?: boolean;
}

export interface IQualityTargetRepository {
  findById(id: number): Promise<QualityTarget | null>;
  findByWbs(wbsId: number, filter?: QualityTargetFilter): Promise<QualityTarget[]>;
  findByWbsAndTaskNo(wbsId: number, taskNo: string): Promise<QualityTarget | null>;
  upsert(target: QualityTarget): Promise<QualityTarget>;
  deactivateMissing(wbsId: number, activeTaskNos: string[]): Promise<number>;
}
