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
  ) { }

  /**
   * PostgreSQLに取り込まれたWbsTaskを起点に定量品質評価データを同期する。
   *
   * - 評価対象 = 同一 WBS 内に `^{自taskNo}-R.*$` にマッチするレビュータスクが
   *   1件以上存在する WbsTask（1タスク=1評価対象）
   * - レビュータスク = taskNo が `^{評価対象taskNo}-R.*$` にマッチする WbsTask
   * - reviewerUserId = レビュータスクの assignee から解決した Users.id
   *   （assignee 未設定のレビュータスクはスキップする）
   */
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
        ?? QualityReviewTarget.create({ wbsId, taskNo: target.taskNo, name: target.name });

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
