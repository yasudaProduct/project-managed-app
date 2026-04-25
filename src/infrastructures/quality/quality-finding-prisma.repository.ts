import { injectable } from 'inversify';
import type { $Enums } from '@prisma/client';
import prisma from '@/lib/prisma/prisma';
import type { IQualityFindingRepository, QualityFindingFilter } from '@/applications/quality/repositories/i-quality-finding.repository';
import { QualityFinding } from '@/domains/quality/entities/quality-finding';
import { FindingSource } from '@/domains/quality/value-objects/quality-enums';

function mapToFinding(row: {
  id: number; targetId: number; source: string;
  injectionPhase: string | null; phenomenonType: string | null;
  causeType: string | null; category: string | null;
  description: string | null; foundAt: Date; resolvedAt: Date | null;
}): QualityFinding {
  return QualityFinding.reconstruct({
    id: row.id,
    targetId: row.targetId,
    source: row.source as FindingSource,
    injectionPhase: row.injectionPhase ?? undefined,
    phenomenonType: row.phenomenonType ?? undefined,
    causeType: row.causeType ?? undefined,
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    foundAt: row.foundAt,
    resolvedAt: row.resolvedAt ?? undefined,
  });
}

@injectable()
export class QualityFindingPrismaRepository implements IQualityFindingRepository {
  async findByTarget(targetId: number, filter?: QualityFindingFilter): Promise<QualityFinding[]> {
    const rows = await prisma.qualityFinding.findMany({
      where: {
        targetId,
        ...(filter?.source ? { source: filter.source as $Enums.FindingSource } : {}),
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
    return rows.map(mapToFinding);
  }

  async findByTargetIds(targetIds: number[]): Promise<QualityFinding[]> {
    if (targetIds.length === 0) return [];
    const rows = await prisma.qualityFinding.findMany({
      where: { targetId: { in: targetIds } },
      orderBy: { foundAt: 'desc' },
    });
    return rows.map(mapToFinding);
  }

  async create(finding: QualityFinding): Promise<QualityFinding> {
    const row = await prisma.qualityFinding.create({
      data: {
        targetId: finding.targetId,
        source: finding.source as $Enums.FindingSource,
        injectionPhase: finding.injectionPhase ?? null,
        phenomenonType: finding.phenomenonType ?? null,
        causeType: finding.causeType ?? null,
        category: finding.category ?? null,
        description: finding.description ?? null,
        foundAt: finding.foundAt,
        resolvedAt: finding.resolvedAt ?? null,
      },
    });
    return mapToFinding(row);
  }

  async update(finding: QualityFinding): Promise<QualityFinding> {
    const row = await prisma.qualityFinding.update({
      where: { id: finding.id! },
      data: {
        source: finding.source as $Enums.FindingSource,
        injectionPhase: finding.injectionPhase ?? null,
        phenomenonType: finding.phenomenonType ?? null,
        causeType: finding.causeType ?? null,
        category: finding.category ?? null,
        description: finding.description ?? null,
        foundAt: finding.foundAt,
        resolvedAt: finding.resolvedAt ?? null,
      },
    });
    return mapToFinding(row);
  }

  async delete(id: number): Promise<void> {
    await prisma.qualityFinding.delete({ where: { id } });
  }

  async countByTarget(targetId: number, source?: FindingSource): Promise<number> {
    return prisma.qualityFinding.count({
      where: {
        targetId,
        ...(source ? { source: source as $Enums.FindingSource } : {}),
      },
    });
  }

  async deleteByTargetId(targetId: number): Promise<void> {
    await prisma.qualityFinding.deleteMany({ where: { targetId } });
  }
}
