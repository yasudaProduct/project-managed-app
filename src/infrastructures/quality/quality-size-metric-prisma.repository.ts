import { injectable } from 'inversify';
import type { $Enums } from '@prisma/client';
import prisma from '@/lib/prisma/prisma';
import type { IQualitySizeMetricRepository } from '@/applications/quality/repositories/i-quality-size-metric.repository';
import { QualitySizeMetric } from '@/domains/quality/entities/quality-size-metric';
import { QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';

function mapToMetric(row: {
  id: number; targetId: number; unit: string;
  value: { toNumber(): number } | number; measuredAt: Date; note: string | null;
}): QualitySizeMetric {
  return QualitySizeMetric.reconstruct({
    id: row.id,
    targetId: row.targetId,
    unit: row.unit as QualitySizeUnit,
    value: typeof row.value === 'number' ? row.value : row.value.toNumber(),
    measuredAt: row.measuredAt,
    note: row.note ?? undefined,
  });
}

@injectable()
export class QualitySizeMetricPrismaRepository implements IQualitySizeMetricRepository {
  async findByTarget(targetId: number): Promise<QualitySizeMetric[]> {
    const rows = await prisma.qualitySizeMetric.findMany({
      where: { targetId },
    });
    return rows.map(mapToMetric);
  }

  async upsert(metric: QualitySizeMetric): Promise<QualitySizeMetric> {
    const row = await prisma.qualitySizeMetric.upsert({
      where: {
        targetId_unit: {
          targetId: metric.targetId,
          unit: metric.unit as $Enums.QualitySizeUnit,
        },
      },
      create: {
        targetId: metric.targetId,
        unit: metric.unit as $Enums.QualitySizeUnit,
        value: metric.value,
        measuredAt: metric.measuredAt,
        note: metric.note ?? null,
      },
      update: {
        value: metric.value,
        measuredAt: metric.measuredAt,
        note: metric.note ?? null,
      },
    });
    return mapToMetric(row);
  }

  async delete(id: number): Promise<void> {
    await prisma.qualitySizeMetric.delete({ where: { id } });
  }

  async deleteByTargetAndUnit(targetId: number, unit: string): Promise<void> {
    await prisma.qualitySizeMetric.delete({
      where: {
        targetId_unit: {
          targetId,
          unit: unit as $Enums.QualitySizeUnit,
        },
      },
    });
  }
}
