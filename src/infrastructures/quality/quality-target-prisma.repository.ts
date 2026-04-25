import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import type { IQualityTargetRepository, QualityTargetFilter } from '@/applications/quality/repositories/i-quality-target.repository';
import { QualityTarget } from '@/domains/quality/entities/quality-target';

function mapToTarget(row: {
  id: number; wbsId: number; taskNo: string; name: string;
  subsystem: string | null; featureGroup: string | null;
  phaseCode: string | null; assigneeId: string | null;
  isActive: boolean;
}): QualityTarget {
  return QualityTarget.reconstruct({
    id: row.id,
    wbsId: row.wbsId,
    taskNo: row.taskNo,
    name: row.name,
    subsystem: row.subsystem ?? undefined,
    featureGroup: row.featureGroup ?? undefined,
    phaseCode: row.phaseCode ?? undefined,
    assigneeId: row.assigneeId ?? undefined,
    isActive: row.isActive,
  });
}

@injectable()
export class QualityTargetPrismaRepository implements IQualityTargetRepository {
  async findById(id: number): Promise<QualityTarget | null> {
    const row = await prisma.qualityTarget.findUnique({ where: { id } });
    return row ? mapToTarget(row) : null;
  }

  async findByWbs(wbsId: number, filter?: QualityTargetFilter): Promise<QualityTarget[]> {
    const rows = await prisma.qualityTarget.findMany({
      where: {
        wbsId,
        ...(filter?.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
      orderBy: { taskNo: 'asc' },
    });
    return rows.map(mapToTarget);
  }

  async findByWbsAndTaskNo(wbsId: number, taskNo: string): Promise<QualityTarget | null> {
    const row = await prisma.qualityTarget.findUnique({
      where: { wbsId_taskNo: { wbsId, taskNo } },
    });
    return row ? mapToTarget(row) : null;
  }

  async upsert(target: QualityTarget): Promise<QualityTarget> {
    const data = {
      name: target.name,
      subsystem: target.subsystem ?? null,
      featureGroup: target.featureGroup ?? null,
      phaseCode: target.phaseCode ?? null,
      assigneeId: target.assigneeId ?? null,
      isActive: target.isActive,
    };
    const row = await prisma.qualityTarget.upsert({
      where: { wbsId_taskNo: { wbsId: target.wbsId, taskNo: target.taskNo } },
      create: {
        wbsId: target.wbsId,
        taskNo: target.taskNo,
        ...data,
      },
      update: data,
    });
    return mapToTarget(row);
  }

  async deactivateMissing(wbsId: number, activeTaskNos: string[]): Promise<number> {
    const result = await prisma.qualityTarget.updateMany({
      where: {
        wbsId,
        taskNo: { notIn: activeTaskNos },
        isActive: true,
      },
      data: { isActive: false },
    });
    return result.count;
  }
}
