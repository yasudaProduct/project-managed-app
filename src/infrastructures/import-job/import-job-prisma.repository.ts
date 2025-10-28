import { injectable } from 'inversify'
import type { ImportJob as PrismaImportJob, Prisma, $Enums } from '@prisma/client'
import type { IImportJobRepository } from '@/applications/import-job/iimport-job.repository'
import { ImportJob, ImportJobProgress } from '@/domains/import-job/import-job'
import type { ImportJobType, ImportJobStatus } from '@/domains/import-job/import-job-enums'
import prisma from "@/lib/prisma/prisma";

@injectable()
export class ImportJobPrismaRepository implements IImportJobRepository {

  /**
   * インポートジョブを作成
   * @param job 
   * @returns 
   */
  async create(job: ImportJob): Promise<ImportJob> {
    const created = await prisma.importJob.create({
      data: {
        type: job.type as $Enums.ImportJobType,
        status: job.status as $Enums.ImportJobStatus,
        createdBy: job.createdBy ?? undefined,
        targetMonth: job.targetMonth,
        targetProjectIds: job.targetProjectIds,
        wbsId: job.wbsId,
        options: job.options as Prisma.InputJsonValue,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        successCount: job.successCount,
        errorCount: job.errorCount,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorDetails: job.errorDetails as Prisma.InputJsonValue,
        result: job.result as Prisma.InputJsonValue,
      },
    })

    return this.toDomain(created)
  }

  /**
   * インポートジョブを更新
   * @param job 
   * @returns 
   */
  async update(job: ImportJob): Promise<ImportJob> {
    const updated = await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: job.status as $Enums.ImportJobStatus,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        successCount: job.successCount,
        errorCount: job.errorCount,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorDetails: job.errorDetails as Prisma.InputJsonValue,
        result: job.result as Prisma.InputJsonValue,
      },
    })

    return this.toDomain(updated)
  }

  async findById(id: string): Promise<ImportJob | null> {
    const job = await prisma.importJob.findUnique({
      where: { id },
    })

    return job ? this.toDomain(job) : null
  }

  async findAll(limit: number = 100): Promise<ImportJob[]> {
    const jobs = await prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return jobs.map(job => this.toDomain(job))
  }

  async findByUser(userId: string, limit: number = 50): Promise<ImportJob[]> {
    const jobs = await prisma.importJob.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return jobs.map(job => this.toDomain(job))
  }

  async findByStatus(status: ImportJobStatus): Promise<ImportJob[]> {
    const jobs = await prisma.importJob.findMany({
      where: { status: status as $Enums.ImportJobStatus },
      orderBy: { createdAt: 'asc' },
    })

    return jobs.map(job => this.toDomain(job))
  }

  async findByTypeAndStatus(type: ImportJobType, status: ImportJobStatus): Promise<ImportJob[]> {
    const jobs = await prisma.importJob.findMany({
      where: { type: type as $Enums.ImportJobType, status: status as $Enums.ImportJobStatus },
      orderBy: { createdAt: 'asc' },
    })

    return jobs.map(job => this.toDomain(job))
  }

  async addProgress(jobId: string, progress: ImportJobProgress): Promise<void> {
    await prisma.importJobProgress.create({
      data: {
        jobId,
        message: progress.message,
        detail: progress.detail as Prisma.InputJsonValue,
        level: progress.level,
        recordedAt: progress.recordedAt,
      },
    })
  }

  async getProgress(jobId: string, limit: number = 100): Promise<ImportJobProgress[]> {
    const progressRecords = await prisma.importJobProgress.findMany({
      where: { jobId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    })

    return progressRecords.map(record => ({
      message: record.message,
      detail: record.detail as Record<string, unknown> | undefined,
      level: record.level as 'info' | 'warning' | 'error',
      recordedAt: record.recordedAt,
    }))
  }

  private toDomain(prismaJob: PrismaImportJob): ImportJob {
    return new ImportJob(
      prismaJob.id,
      prismaJob.type,
      prismaJob.status as ImportJobStatus,
      prismaJob.createdBy,
      prismaJob.createdAt,
      prismaJob.updatedAt,
      prismaJob.targetMonth || undefined,
      prismaJob.targetProjectIds,
      prismaJob.wbsId || undefined,
      prismaJob.options as Record<string, unknown>,
      prismaJob.totalRecords,
      prismaJob.processedRecords,
      prismaJob.successCount,
      prismaJob.errorCount,
      prismaJob.startedAt || undefined,
      prismaJob.completedAt || undefined,
      prismaJob.errorDetails as Record<string, unknown> | undefined,
      prismaJob.result as Record<string, unknown> | undefined
    )
  }
}