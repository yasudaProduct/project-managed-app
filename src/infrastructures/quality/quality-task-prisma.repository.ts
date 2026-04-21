import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import type {
  IQualityTaskRepository,
  QualitySyncTaskRow,
} from '@/applications/quality/i-quality-task.repository';

@injectable()
export class QualityTaskPrismaRepository implements IQualityTaskRepository {
  async findAllForQualitySync(wbsId: number): Promise<QualitySyncTaskRow[]> {
    const rows = await prisma.wbsTask.findMany({
      where: { wbsId },
      select: {
        taskNo: true,
        name: true,
        assignee: { select: { assigneeId: true } },
      },
    });
    return rows.map((r) => ({
      taskNo: r.taskNo,
      name: r.name,
      assigneeUserId: r.assignee?.assigneeId ?? null,
    }));
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

  async findAssigneesByTaskNos(
    wbsId: number,
    taskNos: string[],
  ): Promise<Map<string, string | null>> {
    if (taskNos.length === 0) return new Map();
    const tasks = await prisma.wbsTask.findMany({
      where: { wbsId, taskNo: { in: taskNos } },
      select: {
        taskNo: true,
        assignee: { select: { assignee: { select: { name: true } } } },
      },
    });
    return new Map(
      tasks.map((t) => [t.taskNo, t.assignee?.assignee?.name ?? null]),
    );
  }

  async findUserNamesByIds(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    return new Map(users.map((u) => [u.id, u.name]));
  }
}
