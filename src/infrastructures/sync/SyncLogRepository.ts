import { injectable } from 'inversify';
import { ISyncLogRepository, SyncLog } from '@/applications/excel-sync/ISyncLogRepository';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
      errorDetails:
        result.errorDetails && typeof result.errorDetails === 'object' && !Array.isArray(result.errorDetails)
          ? (result.errorDetails as Record<string, unknown>)
          : undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async recordSync(log: Omit<SyncLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    await prisma.syncLog.create({
      data: {
        projectId: log.projectId,
        syncStatus: log.syncStatus,
        syncedAt: log.syncedAt,
        recordCount: log.recordCount,
        addedCount: log.addedCount,
        updatedCount: log.updatedCount,
        deletedCount: log.deletedCount,
        errorDetails:
          log.errorDetails == null
            ? (Prisma.JsonNull as Prisma.NullableJsonNullValueInput)
            : (log.errorDetails as Prisma.InputJsonValue),
      },
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
      errorDetails:
        result.errorDetails && typeof result.errorDetails === 'object' && !Array.isArray(result.errorDetails)
          ? (result.errorDetails as Record<string, unknown>)
          : undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));
  }
}