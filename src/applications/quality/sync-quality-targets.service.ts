import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { QualityReviewTarget } from '@/domains/quality/quality-review-target';
import { QualityReviewer } from '@/domains/quality/quality-reviewer';
import type { IQualityReviewTargetRepository, IQualityReviewerRepository } from './i-quality-review-target.repository';
import type { IQualityTaskRepository } from './i-quality-task.repository';

export interface SyncResult {
  created: number;
  updated: number;
  deactivated: number;
}

@injectable()
export class SyncQualityTargetsService {
  constructor(
    @inject(SYMBOL.IQualityReviewTargetRepository)
    private readonly targetRepo: IQualityReviewTargetRepository,
    @inject(SYMBOL.IQualityReviewerRepository)
    private readonly reviewerRepo: IQualityReviewerRepository,
    @inject(SYMBOL.IQualityTaskRepository)
    private readonly taskRepo: IQualityTaskRepository,
  ) {}

  async syncForWbs(wbsId: number): Promise<SyncResult> {
    const tasks = await this.taskRepo.findByWbsIdWithReviewInfo(wbsId);
    const reviewTargetTasks = tasks.filter((t) => !!t.tantoRev);

    let created = 0;
    let updated = 0;

    const activeTaskNos: string[] = [];

    for (const task of reviewTargetTasks) {
      activeTaskNos.push(task.taskNo);

      const existing = await this.targetRepo.findByWbsAndTaskNo(wbsId, task.taskNo);

      const target = existing
        ? existing
        : QualityReviewTarget.create({ wbsId, taskNo: task.taskNo, name: task.name });

      const saved = await this.targetRepo.upsert(target);

      if (existing) {
        updated++;
      } else {
        created++;
      }

      const reviewers = await this.buildReviewers(saved.id!, wbsId, task);
      await this.reviewerRepo.replaceForTarget(saved.id!, reviewers);
    }

    const deactivated = await this.targetRepo.deactivateMissing(wbsId, activeTaskNos);

    return { created, updated, deactivated };
  }

  private async buildReviewers(
    targetId: number,
    wbsId: number,
    task: { tantoRev: string | null; reviewTasks: { taskNo: string; tanto: string }[] },
  ): Promise<QualityReviewer[]> {
    return task.reviewTasks.map((rt) => {
      const userId = rt.tanto;
      return QualityReviewer.create({
        targetId,
        reviewerUserId: userId,
        reviewTaskNo: rt.taskNo,
      });
    });
  }
}
