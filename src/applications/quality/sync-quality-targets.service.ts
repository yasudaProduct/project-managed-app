import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { QualityTarget } from '@/domains/quality/entities/quality-target';
import { QualityReviewer } from '@/domains/quality/entities/quality-reviewer';
import type { IQualityTargetRepository } from './repositories/i-quality-target.repository';
import type { IQualityReviewerRepository } from './repositories/i-quality-reviewer.repository';
import type { IQualityTaskRepository } from './i-quality-task.repository';

export interface SyncResult {
  created: number;
  updated: number;
  deactivated: number;
}

@injectable()
export class SyncQualityTargetsService {
  constructor(
    @inject(SYMBOL.IQualityTargetRepository)
    private readonly targetRepo: IQualityTargetRepository,
    @inject(SYMBOL.IQualityReviewerRepository)
    private readonly reviewerRepo: IQualityReviewerRepository,
    @inject(SYMBOL.IQualityTaskRepository)
    private readonly taskRepo: IQualityTaskRepository,
  ) { }

  async syncForWbs(wbsId: number): Promise<SyncResult> {
    const tasks = await this.taskRepo.findAllForQualitySync(wbsId);

    const targetTasks = tasks.filter((t) =>
      tasks.some((r) => r !== t && r.taskNo.startsWith(`${t.taskNo}-R`)),
    );

    let created = 0;
    let updated = 0;
    const activeTaskNos: string[] = [];

    for (const target of targetTasks) {
      activeTaskNos.push(target.taskNo);

      const existing = await this.targetRepo.findByWbsAndTaskNo(wbsId, target.taskNo);

      const targetEntity = existing
        ?? QualityTarget.create({ wbsId, taskNo: target.taskNo, name: target.name });

      const saved = await this.targetRepo.upsert(targetEntity);

      if (existing) {
        updated++;
      } else {
        created++;
      }

      const reviewTasks = tasks.filter(
        (t) => t !== target && t.taskNo.startsWith(`${target.taskNo}-R`),
      );

      const reviewers = reviewTasks
        .filter((rt) => !!rt.assigneeUserId)
        .map((rt) =>
          QualityReviewer.create({
            targetId: saved.id!,
            reviewerUserId: rt.assigneeUserId!,
            reviewTaskNo: rt.taskNo,
          }),
        );

      await this.reviewerRepo.replaceForTarget(saved.id!, reviewers);
    }

    const deactivated = await this.targetRepo.deactivateMissing(wbsId, activeTaskNos);

    return { created, updated, deactivated };
  }
}
