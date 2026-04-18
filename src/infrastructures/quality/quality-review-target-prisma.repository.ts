import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import type { IQualityReviewTargetRepository, IQualityReviewerRepository, TargetFilter } from '@/applications/quality/i-quality-review-target.repository';
import { QualityReviewTarget } from '@/domains/quality/quality-review-target';
import { QualityReviewer } from '@/domains/quality/quality-reviewer';
import { QualityDocumentType, QualityReviewType } from '@/domains/quality/value-objects/quality-enums';

function toDocumentType(val: string): QualityDocumentType {
  return (QualityDocumentType[val as keyof typeof QualityDocumentType]) ?? QualityDocumentType.OTHER;
}

function toReviewType(val: string): QualityReviewType {
  return (QualityReviewType[val as keyof typeof QualityReviewType]) ?? QualityReviewType.PEER;
}

function mapToTarget(row: {
  id: number; wbsId: number; taskNo: string; name: string;
  documentType: string; reviewType: string; isActive: boolean;
  createdAt: Date; updatedAt: Date;
}): QualityReviewTarget {
  return QualityReviewTarget.reconstruct({
    id: row.id,
    wbsId: row.wbsId,
    taskNo: row.taskNo,
    name: row.name,
    documentType: toDocumentType(row.documentType),
    reviewType: toReviewType(row.reviewType),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

@injectable()
export class QualityReviewTargetPrismaRepository implements IQualityReviewTargetRepository {
  async findById(id: number): Promise<QualityReviewTarget | null> {
    const row = await prisma.qualityReviewTarget.findUnique({ where: { id } });
    return row ? mapToTarget(row) : null;
  }

  async findByWbs(wbsId: number, filter?: TargetFilter): Promise<QualityReviewTarget[]> {
    const rows = await prisma.qualityReviewTarget.findMany({
      where: {
        wbsId,
        ...(filter?.isActive !== undefined ? { isActive: filter.isActive } : {}),
        ...(filter?.documentType ? { documentType: filter.documentType as any } : {}),
        ...(filter?.reviewType ? { reviewType: filter.reviewType as any } : {}),
      },
      orderBy: { taskNo: 'asc' },
    });
    return rows.map(mapToTarget);
  }

  async findByWbsAndTaskNo(wbsId: number, taskNo: string): Promise<QualityReviewTarget | null> {
    const row = await prisma.qualityReviewTarget.findUnique({
      where: { wbsId_taskNo: { wbsId, taskNo } },
    });
    return row ? mapToTarget(row) : null;
  }

  async upsert(target: QualityReviewTarget): Promise<QualityReviewTarget> {
    const row = await prisma.qualityReviewTarget.upsert({
      where: { wbsId_taskNo: { wbsId: target.wbsId, taskNo: target.taskNo } },
      create: {
        wbsId: target.wbsId,
        taskNo: target.taskNo,
        name: target.name,
        documentType: target.documentType as any,
        reviewType: target.reviewType as any,
        isActive: target.isActive,
      },
      update: {
        name: target.name,
        documentType: target.documentType as any,
        reviewType: target.reviewType as any,
        isActive: target.isActive,
      },
    });
    return mapToTarget(row);
  }

  async deactivateMissing(wbsId: number, activeTaskNos: string[]): Promise<number> {
    const result = await prisma.qualityReviewTarget.updateMany({
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

@injectable()
export class QualityReviewerPrismaRepository implements IQualityReviewerRepository {
  async replaceForTarget(targetId: number, reviewers: QualityReviewer[]): Promise<void> {
    await prisma.$transaction([
      prisma.qualityReviewer.deleteMany({ where: { targetId } }),
      prisma.qualityReviewer.createMany({
        data: reviewers.map((r) => ({
          targetId: r.targetId,
          reviewerUserId: r.reviewerUserId,
          reviewTaskNo: r.reviewTaskNo,
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  async findByTarget(targetId: number): Promise<QualityReviewer[]> {
    const rows = await prisma.qualityReviewer.findMany({ where: { targetId } });
    return rows.map((r) =>
      QualityReviewer.reconstruct({
        id: r.id,
        targetId: r.targetId,
        reviewerUserId: r.reviewerUserId,
        reviewTaskNo: r.reviewTaskNo,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
  }
}
