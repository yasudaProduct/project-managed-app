import { injectable } from 'inversify';
import { ISyncLogRepository, SyncLog } from '@/applications/sync/ISyncLogRepository';
import prisma from '@/lib/prisma';

@injectable()
export class SyncLogRepository implements ISyncLogRepository {
  async getLastSync(projectId: string): Promise<SyncLog | null> {
    const result = await prisma.syncLog.findFirst({
      where: {
        projectId,
      },
      orderBy: {
        syncedAt: 'desc',
      },
    });

    if (!result) return null;

    return {
      id: result.id,
      projectId: result.projectId,
      syncStatus: result.syncStatus as 'SUCCESS' | 'FAILED' | 'PARTIAL',
      syncedAt: result.syncedAt,
      recordCount: result.recordCount,
      addedCount: result.addedCount,
      updatedCount: result.updatedCount,
      deletedCount: result.deletedCount,
      errorDetails: result.errorDetails,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async recordSync(log: Omit<SyncLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    await prisma.syncLog.create({
      data: log,
    });
  }

  async getHistory(projectId: string, limit: number = 10): Promise<SyncLog[]> {
    const results = await prisma.syncLog.findMany({
      where: {
        projectId,
      },
      orderBy: {
        syncedAt: 'desc',
      },
      take: limit,
    });

    return results.map(result => ({
      id: result.id,
      projectId: result.projectId,
      syncStatus: result.syncStatus as 'SUCCESS' | 'FAILED' | 'PARTIAL',
      syncedAt: result.syncedAt,
      recordCount: result.recordCount,
      addedCount: result.addedCount,
      updatedCount: result.updatedCount,
      deletedCount: result.deletedCount,
      errorDetails: result.errorDetails,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));
  }
}