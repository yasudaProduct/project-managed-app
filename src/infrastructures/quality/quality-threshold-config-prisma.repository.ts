import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import type { IQualityThresholdConfigRepository } from '@/applications/quality/repositories/i-quality-threshold-config.repository';
import { QualityThresholdConfig } from '@/domains/quality/entities/quality-threshold-config';

function toNumber(val: { toNumber(): number } | number | null | undefined): number | undefined {
  if (val == null) return undefined;
  return typeof val === 'number' ? val : val.toNumber();
}

function mapToConfig(row: {
  id: number; wbsId: number; metricKey: string; phaseCode: string | null;
  upperLimit: unknown; lowerLimit: unknown;
  warnThreshold: unknown; dangerThreshold: unknown;
  referenceValue: unknown; note: string | null;
}): QualityThresholdConfig {
  return QualityThresholdConfig.reconstruct({
    id: row.id,
    wbsId: row.wbsId,
    metricKey: row.metricKey,
    phaseCode: row.phaseCode ?? undefined,
    upperLimit: toNumber(row.upperLimit as number | null),
    lowerLimit: toNumber(row.lowerLimit as number | null),
    warnThreshold: toNumber(row.warnThreshold as number | null),
    dangerThreshold: toNumber(row.dangerThreshold as number | null),
    referenceValue: toNumber(row.referenceValue as number | null),
    note: row.note ?? undefined,
  });
}

@injectable()
export class QualityThresholdConfigPrismaRepository implements IQualityThresholdConfigRepository {
  async findByWbs(wbsId: number): Promise<QualityThresholdConfig[]> {
    const rows = await prisma.qualityThresholdConfig.findMany({
      where: { wbsId },
    });
    return rows.map(mapToConfig);
  }

  async findByWbsAndMetric(
    wbsId: number,
    metricKey: string,
    phaseCode?: string
  ): Promise<QualityThresholdConfig | null> {
    const row = await prisma.qualityThresholdConfig.findFirst({
      where: {
        wbsId,
        metricKey,
        phaseCode: phaseCode ?? null,
      },
    });
    return row ? mapToConfig(row) : null;
  }

  async upsert(config: QualityThresholdConfig): Promise<QualityThresholdConfig> {
    const data = {
      upperLimit: config.upperLimit ?? null,
      lowerLimit: config.lowerLimit ?? null,
      warnThreshold: config.warnThreshold ?? null,
      dangerThreshold: config.dangerThreshold ?? null,
      referenceValue: config.referenceValue ?? null,
      note: config.note ?? null,
    };

    const existing = await prisma.qualityThresholdConfig.findFirst({
      where: {
        wbsId: config.wbsId,
        metricKey: config.metricKey,
        phaseCode: config.phaseCode ?? null,
      },
    });

    const row = existing
      ? await prisma.qualityThresholdConfig.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.qualityThresholdConfig.create({
          data: {
            wbsId: config.wbsId,
            metricKey: config.metricKey,
            phaseCode: config.phaseCode ?? null,
            ...data,
          },
        });
    return mapToConfig(row);
  }

  async delete(id: number): Promise<void> {
    await prisma.qualityThresholdConfig.delete({ where: { id } });
  }
}
