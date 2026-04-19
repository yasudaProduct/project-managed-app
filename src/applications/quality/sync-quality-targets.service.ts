import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import { QualityReviewTarget } from '@/domains/quality/quality-review-target';
import { QualityReviewer } from '@/domains/quality/quality-reviewer';
import { ExcelWbs } from '@/domains/sync/ExcelWbs';
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

  /**
   * Excelインポートデータ（MySQL wbsテーブル由来）から評価対象を同期する。
   * TANTO_REVが設定されている行をレビュー対象とし、TASK名が同一の行を
   * 同一評価対象の複数レビュアーとして登録する。
   */
  async syncFromExcelRows(wbsId: number, rows: ExcelWbs[]): Promise<SyncResult> {

    // TANTO_REVが設定されている行をレビュー対象とする
    const reviewRows = rows.filter((r) => {
      const tanto = r.TANTO_REV;
      return typeof tanto === 'string' && tanto.trim() !== '';
    });

    // TASK名が同一の行を同一評価対象の複数レビュアーとして登録する
    const groups = new Map<string, ExcelWbs[]>();
    for (const row of reviewRows) {
      const key = (row.TASK ?? '').trim();
      if (!key) continue;
      const list = groups.get(key);
      if (list) {
        list.push(row);
      } else {
        groups.set(key, [row]);
      }
    }

    let created = 0;
    let updated = 0;
    const activeTaskNos: string[] = [];

    for (const [taskName, groupRows] of groups) {
      const representative = [...groupRows].sort((a, b) =>
        a.WBS_ID.localeCompare(b.WBS_ID),
      )[0];
      const targetTaskNo = representative.WBS_ID;
      activeTaskNos.push(targetTaskNo);

      const existing = await this.targetRepo.findByWbsAndTaskNo(wbsId, targetTaskNo);

      const target = existing
        ? existing
        : QualityReviewTarget.create({ wbsId, taskNo: targetTaskNo, name: taskName });

      const saved = await this.targetRepo.upsert(target);

      if (existing) {
        updated++;
      } else {
        created++;
      }

      const reviewers = groupRows.map((r) =>
        QualityReviewer.create({
          targetId: saved.id!,
          reviewerUserId: (r.TANTO_REV as string).trim(),
          reviewTaskNo: r.WBS_ID,
        }),
      );
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
