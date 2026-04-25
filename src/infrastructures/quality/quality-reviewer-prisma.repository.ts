import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import type { IQualityReviewerRepository } from '@/applications/quality/repositories/i-quality-reviewer.repository';
import { QualityReviewer } from '@/domains/quality/entities/quality-reviewer';

@injectable()
export class QualityReviewerPrismaRepository implements IQualityReviewerRepository {
  async findByTarget(targetId: number): Promise<QualityReviewer[]> {
    const rows = await prisma.qualityReviewer.findMany({ where: { targetId } });
    return rows.map((r) =>
      QualityReviewer.reconstruct({
        id: r.id,
        targetId: r.targetId,
        reviewerUserId: r.reviewerUserId,
        reviewTaskNo: r.reviewTaskNo,
        reviewHours: r.reviewHours ? Number(r.reviewHours) : undefined,
      })
    );
  }

  async replaceForTarget(targetId: number, reviewers: QualityReviewer[]): Promise<void> {
    await prisma.$transaction([
      prisma.qualityReviewer.deleteMany({ where: { targetId } }),
      prisma.qualityReviewer.createMany({
        data: reviewers.map((r) => ({
          targetId: r.targetId,
          reviewerUserId: r.reviewerUserId,
          reviewTaskNo: r.reviewTaskNo,
          reviewHours: r.reviewHours ?? null,
        })),
        skipDuplicates: true,
      }),
    ]);
  }
}
