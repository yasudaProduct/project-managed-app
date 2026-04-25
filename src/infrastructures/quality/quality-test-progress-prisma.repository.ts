import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import type { IQualityTestProgressRepository } from '@/applications/quality/repositories/i-quality-test-progress.repository';
import { QualityTestProgress } from '@/domains/quality/entities/quality-test-progress';

function mapToProgress(row: {
  id: number; targetId: number; date: Date;
  plannedTotal: number; executedTotal: number;
  passedTotal: number; failedTotal: number; blockedTotal: number;
}): QualityTestProgress {
  return QualityTestProgress.reconstruct({
    id: row.id,
    targetId: row.targetId,
    date: row.date,
    plannedTotal: row.plannedTotal,
    executedTotal: row.executedTotal,
    passedTotal: row.passedTotal,
    failedTotal: row.failedTotal,
    blockedTotal: row.blockedTotal,
  });
}

@injectable()
export class QualityTestProgressPrismaRepository implements IQualityTestProgressRepository {
  async findByTarget(targetId: number): Promise<QualityTestProgress[]> {
    const rows = await prisma.qualityTestProgress.findMany({
      where: { targetId },
      orderBy: { date: 'asc' },
    });
    return rows.map(mapToProgress);
  }

  async findByTargetAndDateRange(
    targetId: number,
    fromDate: Date,
    toDate: Date
  ): Promise<QualityTestProgress[]> {
    const rows = await prisma.qualityTestProgress.findMany({
      where: {
        targetId,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map(mapToProgress);
  }

  async upsert(progress: QualityTestProgress): Promise<QualityTestProgress> {
    const row = await prisma.qualityTestProgress.upsert({
      where: {
        targetId_date: {
          targetId: progress.targetId,
          date: progress.date,
        },
      },
      create: {
        targetId: progress.targetId,
        date: progress.date,
        plannedTotal: progress.plannedTotal,
        executedTotal: progress.executedTotal,
        passedTotal: progress.passedTotal,
        failedTotal: progress.failedTotal,
        blockedTotal: progress.blockedTotal,
      },
      update: {
        plannedTotal: progress.plannedTotal,
        executedTotal: progress.executedTotal,
        passedTotal: progress.passedTotal,
        failedTotal: progress.failedTotal,
        blockedTotal: progress.blockedTotal,
      },
    });
    return mapToProgress(row);
  }

  async deleteByTargetId(targetId: number): Promise<void> {
    await prisma.qualityTestProgress.deleteMany({ where: { targetId } });
  }
}
