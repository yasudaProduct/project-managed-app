import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import type {
  IQualitySizeMetricRepository,
  IQualityFindingRepository,
  IQualityMetricsReadRepository,
  FindingFilter,
  ReviewManHoursResult,
  DailyFindingCount,
  DailyManHours,
} from '@/applications/quality/i-quality-metrics.repository';
import { QualitySizeMetric } from '@/domains/quality/quality-size-metric';
import { QualityFinding } from '@/domains/quality/quality-finding';
import { QualitySizeUnit, QualitySeverity } from '@/domains/quality/value-objects/quality-enums';

function toSizeUnit(val: string): QualitySizeUnit {
  return QualitySizeUnit[val as keyof typeof QualitySizeUnit];
}

function toSeverity(val: string): QualitySeverity {
  return QualitySeverity[val as keyof typeof QualitySeverity];
}

@injectable()
export class QualitySizeMetricPrismaRepository implements IQualitySizeMetricRepository {
  async findByTarget(targetId: number): Promise<QualitySizeMetric[]> {
    const rows = await prisma.qualitySizeMetric.findMany({ where: { targetId } });
    return rows.map((r) =>
      QualitySizeMetric.reconstruct({
        id: r.id,
        targetId: r.targetId,
        unit: toSizeUnit(r.unit),
        value: Number(r.value),
        measuredAt: r.measuredAt,
        note: r.note ?? undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
  }

  async upsert(metric: QualitySizeMetric): Promise<QualitySizeMetric> {
    const row = await prisma.qualitySizeMetric.upsert({
      where: { targetId_unit: { targetId: metric.targetId, unit: metric.unit as any } },
      create: {
        targetId: metric.targetId,
        unit: metric.unit as any,
        value: metric.value,
        measuredAt: metric.measuredAt,
        note: metric.note,
      },
      update: {
        value: metric.value,
        measuredAt: metric.measuredAt,
        note: metric.note,
      },
    });
    return QualitySizeMetric.reconstruct({
      id: row.id,
      targetId: row.targetId,
      unit: toSizeUnit(row.unit),
      value: Number(row.value),
      measuredAt: row.measuredAt,
      note: row.note ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.qualitySizeMetric.delete({ where: { id } });
  }

  async deleteByTargetAndUnit(targetId: number, unit: QualitySizeUnit): Promise<void> {
    await prisma.qualitySizeMetric.deleteMany({ where: { targetId, unit: unit as any } });
  }
}

@injectable()
export class QualityFindingPrismaRepository implements IQualityFindingRepository {
  async findByTarget(targetId: number, filter?: FindingFilter): Promise<QualityFinding[]> {
    const rows = await prisma.qualityFinding.findMany({
      where: {
        targetId,
        ...(filter?.severity ? { severity: filter.severity as any } : {}),
        ...(filter?.fromDate || filter?.toDate
          ? {
              foundAt: {
                ...(filter.fromDate ? { gte: filter.fromDate } : {}),
                ...(filter.toDate ? { lte: filter.toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { foundAt: 'desc' },
    });
    return rows.map((r) =>
      QualityFinding.reconstruct({
        id: r.id,
        targetId: r.targetId,
        severity: toSeverity(r.severity),
        category: r.category ?? undefined,
        description: r.description ?? undefined,
        foundAt: r.foundAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
  }

  async create(finding: QualityFinding): Promise<QualityFinding> {
    const row = await prisma.qualityFinding.create({
      data: {
        targetId: finding.targetId,
        severity: finding.severity as any,
        category: finding.category,
        description: finding.description,
        foundAt: finding.foundAt,
      },
    });
    return QualityFinding.reconstruct({
      id: row.id,
      targetId: row.targetId,
      severity: toSeverity(row.severity),
      category: row.category ?? undefined,
      description: row.description ?? undefined,
      foundAt: row.foundAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async update(finding: QualityFinding): Promise<QualityFinding> {
    const row = await prisma.qualityFinding.update({
      where: { id: finding.id! },
      data: {
        severity: finding.severity as any,
        category: finding.category,
        description: finding.description,
        foundAt: finding.foundAt,
      },
    });
    return QualityFinding.reconstruct({
      id: row.id,
      targetId: row.targetId,
      severity: toSeverity(row.severity),
      category: row.category ?? undefined,
      description: row.description ?? undefined,
      foundAt: row.foundAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.qualityFinding.delete({ where: { id } });
  }

  async countByTarget(targetId: number): Promise<{ total: number; major: number }> {
    const [total, major] = await Promise.all([
      prisma.qualityFinding.count({ where: { targetId } }),
      prisma.qualityFinding.count({ where: { targetId, severity: 'MAJOR' } }),
    ]);
    return { total, major };
  }

  async deleteByTargetId(targetId: number): Promise<number> {
    const result = await prisma.qualityFinding.deleteMany({ where: { targetId } });
    return result.count;
  }
}

@injectable()
export class QualityMetricsReadPrismaRepository implements IQualityMetricsReadRepository {
  async getReviewManHours(
    reviewTaskNos: { wbsId: number; taskNo: string }[],
    fromDate?: Date,
    toDate?: Date,
  ): Promise<ReviewManHoursResult[]> {
    if (reviewTaskNos.length === 0) return [];

    const results: ReviewManHoursResult[] = [];

    for (const { wbsId, taskNo } of reviewTaskNos) {
      const task = await prisma.wbsTask.findUnique({
        where: { taskNo_wbsId: { taskNo, wbsId } },
        select: { id: true },
      });
      if (!task) {
        results.push({ taskNo, wbsId, totalHours: 0 });
        continue;
      }

      const agg = await prisma.workRecord.aggregate({
        where: {
          taskId: task.id,
          ...(fromDate || toDate
            ? {
                date: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : {}),
        },
        _sum: { hours_worked: true },
      });

      results.push({
        taskNo,
        wbsId,
        totalHours: Number(agg._sum.hours_worked ?? 0),
      });
    }

    return results;
  }

  async getTaskManHours(
    taskNos: { wbsId: number; taskNo: string }[],
  ): Promise<ReviewManHoursResult[]> {
    return this.getReviewManHours(taskNos);
  }

  async getDailyFindingCounts(
    targetIds: number[],
    fromDate?: Date,
    toDate?: Date,
  ): Promise<DailyFindingCount[]> {
    if (targetIds.length === 0) return [];

    const rows = await prisma.qualityFinding.findMany({
      where: {
        targetId: { in: targetIds },
        ...(fromDate || toDate
          ? {
              foundAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      select: { foundAt: true, severity: true },
      orderBy: { foundAt: 'asc' },
    });

    const byDate = new Map<string, { total: number; major: number }>();
    for (const row of rows) {
      const key = row.foundAt.toISOString().split('T')[0];
      const cur = byDate.get(key) ?? { total: 0, major: 0 };
      cur.total++;
      if (row.severity === 'MAJOR') cur.major++;
      byDate.set(key, cur);
    }

    return Array.from(byDate.entries()).map(([dateStr, counts]) => ({
      date: new Date(dateStr),
      ...counts,
    }));
  }

  async getDailyReviewManHours(
    reviewTaskNos: { wbsId: number; taskNo: string }[],
    fromDate?: Date,
    toDate?: Date,
  ): Promise<DailyManHours[]> {
    if (reviewTaskNos.length === 0) return [];

    const tasks = await prisma.wbsTask.findMany({
      where: {
        OR: reviewTaskNos.map(({ wbsId, taskNo }) => ({ wbsId, taskNo })),
      },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length === 0) return [];

    const rows = await prisma.workRecord.findMany({
      where: {
        taskId: { in: taskIds },
        ...(fromDate || toDate
          ? {
              date: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      select: { date: true, hours_worked: true },
      orderBy: { date: 'asc' },
    });

    const byDate = new Map<string, number>();
    for (const row of rows) {
      const key = row.date.toISOString().split('T')[0];
      byDate.set(key, (byDate.get(key) ?? 0) + Number(row.hours_worked));
    }

    return Array.from(byDate.entries()).map(([dateStr, totalHours]) => ({
      date: new Date(dateStr),
      totalHours,
    }));
  }
}
