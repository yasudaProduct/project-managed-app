import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { QualityTarget } from '@/domains/quality/entities/quality-target';
import type { IQualityTargetRepository, QualityTargetFilter } from './repositories/i-quality-target.repository';

@injectable()
export class QualityTargetService {
  constructor(
    @inject(SYMBOL.IQualityTargetRepository) private targetRepo: IQualityTargetRepository,
  ) {}

  async listByWbs(wbsId: number, filter?: QualityTargetFilter): Promise<QualityTarget[]> {
    return this.targetRepo.findByWbs(wbsId, filter);
  }

  async upsert(target: QualityTarget): Promise<QualityTarget> {
    return this.targetRepo.upsert(target);
  }

  async updateAttributes(
    wbsId: number,
    taskNo: string,
    attrs: { subsystem?: string; featureGroup?: string }
  ): Promise<QualityTarget> {
    const existing = await this.targetRepo.findByWbsAndTaskNo(wbsId, taskNo);
    if (!existing) {
      throw new Error(`評価対象が見つかりません: wbsId=${wbsId}, taskNo=${taskNo}`);
    }

    const updated = QualityTarget.reconstruct({
      id: existing.id!,
      wbsId: existing.wbsId,
      taskNo: existing.taskNo,
      name: existing.name,
      subsystem: attrs.subsystem ?? existing.subsystem,
      featureGroup: attrs.featureGroup ?? existing.featureGroup,
      phaseCode: existing.phaseCode,
      assigneeId: existing.assigneeId,
      isActive: existing.isActive,
    });

    return this.targetRepo.upsert(updated);
  }

  async deactivateMissing(wbsId: number, activeTaskNos: string[]): Promise<number> {
    return this.targetRepo.deactivateMissing(wbsId, activeTaskNos);
  }
}
