/**
 * 進捗履歴リポジトリ実装
 */

import { PrismaClient, RecordType as PrismaRecordType } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { SYMBOL } from '../../types/symbol';
import {
  IProgressHistoryRepository,
  HistoryQueryOptions,
} from '../../applications/wbs-progress-history/iprogress-history-repository';
import {
  WbsProgressHistory,
  TaskProgressHistory,
  RecordType,
  WbsProgressHistoryProps,
  TaskProgressHistoryProps,
} from '../../domains/wbs-progress-history';

@injectable()
export class ProgressHistoryRepository implements IProgressHistoryRepository {
  constructor(
    @inject(SYMBOL.PrismaClient)
    private readonly prisma: PrismaClient
  ) {}

  async save(history: WbsProgressHistory): Promise<WbsProgressHistory> {
    const result = await this.prisma.wbsProgressHistory.create({
      data: {
        wbsId: history.wbsId,
        recordedAt: history.recordedAt,
        recordType: history.recordType,
        snapshotName: history.snapshotName,
        totalTaskCount: history.totalTaskCount,
        completedCount: history.completedCount,
        inProgressCount: history.inProgressCount,
        notStartedCount: history.notStartedCount,
        completionRate: history.completionRate,
        plannedManHours: history.plannedManHours,
        actualManHours: history.actualManHours,
        varianceManHours: history.varianceManHours,
        metadata: history.metadata ? JSON.stringify(history.metadata) : undefined,
        taskHistories: history.taskHistories ? {
          create: history.taskHistories.map(taskHistory => ({
            taskId: taskHistory.taskId,
            taskNo: taskHistory.taskNo,
            taskName: taskHistory.taskName,
            status: taskHistory.status,
            assigneeId: taskHistory.assigneeId,
            assigneeName: taskHistory.assigneeName,
            phaseId: taskHistory.phaseId,
            phaseName: taskHistory.phaseName,
            plannedStartDate: taskHistory.plannedStartDate,
            plannedEndDate: taskHistory.plannedEndDate,
            actualStartDate: taskHistory.actualStartDate,
            actualEndDate: taskHistory.actualEndDate,
            plannedManHours: taskHistory.plannedManHours,
            actualManHours: taskHistory.actualManHours,
            progressRate: taskHistory.progressRate,
          }))
        } : undefined,
      },
      include: {
        taskHistories: true,
      },
    });

    return this.toDomain(result);
  }

  async findById(id: number): Promise<WbsProgressHistory | null> {
    const result = await this.prisma.wbsProgressHistory.findUnique({
      where: { id },
      include: {
        taskHistories: {
          orderBy: { taskNo: 'asc' },
        },
      },
    });

    return result ? this.toDomain(result) : null;
  }

  async findByWbsAndDate(wbsId: number, targetDate: Date): Promise<WbsProgressHistory | null> {
    const result = await this.prisma.wbsProgressHistory.findFirst({
      where: {
        wbsId,
        recordedAt: {
          lte: targetDate,
        },
      },
      include: {
        taskHistories: {
          orderBy: { taskNo: 'asc' },
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
    });

    return result ? this.toDomain(result) : null;
  }

  async findByWbs(wbsId: number, options: HistoryQueryOptions = {}): Promise<WbsProgressHistory[]> {
    const where: {
      wbsId: number;
      recordedAt?: { gte?: Date; lte?: Date };
      recordType?: PrismaRecordType;
    } = { wbsId };

    if (options.startDate || options.endDate) {
      where.recordedAt = {};
      if (options.startDate) {
        where.recordedAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.recordedAt.lte = options.endDate;
      }
    }

    if (options.recordType) {
      where.recordType = options.recordType as PrismaRecordType;
    }

    const results = await this.prisma.wbsProgressHistory.findMany({
      where,
      include: {
        taskHistories: {
          orderBy: { taskNo: 'asc' },
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: options.limit,
      skip: options.offset,
    });

    return results.map(result => this.toDomain(result));
  }

  async countByWbs(wbsId: number, options: Omit<HistoryQueryOptions, 'limit' | 'offset'> = {}): Promise<number> {
    const where: {
      wbsId: number;
      recordedAt?: { gte?: Date; lte?: Date };
      recordType?: PrismaRecordType;
    } = { wbsId };

    if (options.startDate || options.endDate) {
      where.recordedAt = {};
      if (options.startDate) {
        where.recordedAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.recordedAt.lte = options.endDate;
      }
    }

    if (options.recordType) {
      where.recordType = options.recordType as PrismaRecordType;
    }

    return await this.prisma.wbsProgressHistory.count({ where });
  }

  async deleteOldHistories(wbsId: number, beforeDate: Date): Promise<number> {
    const result = await this.prisma.wbsProgressHistory.deleteMany({
      where: {
        wbsId,
        recordedAt: {
          lt: beforeDate,
        },
      },
    });

    return result.count;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.wbsProgressHistory.delete({
      where: { id },
    });
  }

  private toDomain(data: {
    id: number;
    wbsId: number;
    recordedAt: Date;
    recordType: string;
    snapshotName?: string | null;
    totalTaskCount: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    completionRate: { toNumber(): number };
    plannedManHours: { toNumber(): number };
    actualManHours: { toNumber(): number };
    varianceManHours: { toNumber(): number };
    metadata?: unknown;
    createdAt: Date;
    updatedAt: Date;
    taskHistories?: {
      id: number;
      wbsProgressHistoryId: number;
      taskId: number;
      taskNo: string;
      taskName: string;
      status: string;
      assigneeId?: number | null;
      assigneeName?: string | null;
      phaseId?: number | null;
      phaseName?: string | null;
      plannedStartDate?: Date | null;
      plannedEndDate?: Date | null;
      actualStartDate?: Date | null;
      actualEndDate?: Date | null;
      plannedManHours: { toNumber(): number };
      actualManHours: { toNumber(): number };
      progressRate: { toNumber(): number };
      createdAt: Date;
    }[];
  }): WbsProgressHistory {
    const taskHistories = data.taskHistories?.map((taskHistory) => 
      new TaskProgressHistory({
        id: taskHistory.id,
        wbsProgressHistoryId: taskHistory.wbsProgressHistoryId,
        taskId: taskHistory.taskId,
        taskNo: taskHistory.taskNo,
        taskName: taskHistory.taskName,
        status: taskHistory.status,
        assigneeId: taskHistory.assigneeId,
        assigneeName: taskHistory.assigneeName,
        phaseId: taskHistory.phaseId,
        phaseName: taskHistory.phaseName,
        plannedStartDate: taskHistory.plannedStartDate,
        plannedEndDate: taskHistory.plannedEndDate,
        actualStartDate: taskHistory.actualStartDate,
        actualEndDate: taskHistory.actualEndDate,
        plannedManHours: taskHistory.plannedManHours.toNumber(),
        actualManHours: taskHistory.actualManHours.toNumber(),
        progressRate: taskHistory.progressRate.toNumber(),
        createdAt: taskHistory.createdAt,
      } as TaskProgressHistoryProps)
    );

    const props: WbsProgressHistoryProps = {
      id: data.id,
      wbsId: data.wbsId,
      recordedAt: data.recordedAt,
      recordType: data.recordType as RecordType,
      snapshotName: data.snapshotName ?? undefined,
      totalTaskCount: data.totalTaskCount,
      completedCount: data.completedCount,
      inProgressCount: data.inProgressCount,
      notStartedCount: data.notStartedCount,
      completionRate: data.completionRate.toNumber(),
      plannedManHours: data.plannedManHours.toNumber(),
      actualManHours: data.actualManHours.toNumber(),
      varianceManHours: data.varianceManHours.toNumber(),
      metadata: data.metadata as Record<string, unknown> | undefined,
      taskHistories,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    return new WbsProgressHistory(props);
  }
}