import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import type { IQualityTaskRepository, TaskWithReviewInfo } from '@/applications/quality/i-quality-task.repository';

@injectable()
export class QualityTaskPrismaRepository implements IQualityTaskRepository {
  async findByWbsIdWithReviewInfo(wbsId: number): Promise<TaskWithReviewInfo[]> {
    const allTasks = await prisma.wbsTask.findMany({
      where: { wbsId },
      include: {
        assignee: { include: { assignee: true } },
      },
    });

    // tantoRevに相当するデータはMySQLからインポートされたデータに依存するため、
    // PostgreSQLのWbsTaskにはtantoRevフィールドが無い。
    // インポートジョブ連動でSyncQualityTargetsServiceが呼ばれる際は
    // MySQLデータを直接参照する別実装が必要。
    // ここではPostgreSQL上の既存QualityReviewTargetから逆引きする形で提供する。
    const reviewTargets = await prisma.qualityReviewTarget.findMany({
      where: { wbsId, isActive: true },
      include: { reviewers: true },
    });

    const targetByTaskNo = new Map(reviewTargets.map((t) => [t.taskNo, t]));

    return allTasks.map((task) => {
      const target = targetByTaskNo.get(task.taskNo);
      return {
        taskNo: task.taskNo,
        wbsId: task.wbsId,
        name: task.name,
        tantoRev: target ? 'registered' : null,
        reviewTasks: target
          ? target.reviewers.map((r) => ({
              taskNo: r.reviewTaskNo,
              tanto: r.reviewerUserId,
            }))
          : [],
      };
    });
  }

  async resolveUserIdByName(wbsId: number, name: string): Promise<string | null> {
    const assignee = await prisma.wbsAssignee.findFirst({
      where: { wbsId, assignee: { name } },
      include: { assignee: true },
    });
    return assignee?.assigneeId ?? null;
  }

  async findPhasesByTaskNos(
    wbsId: number,
    taskNos: string[],
  ): Promise<Map<string, string | null>> {
    if (taskNos.length === 0) return new Map();
    const tasks = await prisma.wbsTask.findMany({
      where: { wbsId, taskNo: { in: taskNos } },
      select: { taskNo: true, phase: { select: { name: true } } },
    });
    return new Map(tasks.map((t) => [t.taskNo, t.phase?.name ?? null]));
  }
}
