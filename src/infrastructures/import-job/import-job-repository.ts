import { injectable } from 'inversify'
import type { ImportJob as PrismaImportJob, Prisma, $Enums } from '@prisma/client'
import type { IImportJobRepository } from '@/applications/import-job/iimport-job-repository'
import { ImportJob, ImportJobProgress } from '@/domains/import-job/import-job'
import type { ImportJobType, ImportJobStatus } from '@/domains/import-job/import-job-enums'
import type { ImportJobStartResult } from '@/types/import-job'
import prisma from "@/lib/prisma/prisma";

@injectable()
export class ImportJobRepository implements IImportJobRepository {

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
      data: this.toUpdateData(job),
    })

    return this.toDomain(updated)
  }

  /**
   * 保存済みのステータスが expectedStatus の場合のみ更新する
   * 条件付きの単一UPDATEで判定するため、同じジョブへの同時更新でも成功するのは1件だけ
   * @param job
   * @param expectedStatus
   * @returns 更新できた場合 true
   */
  async updateIfStatus(job: ImportJob, expectedStatus: ImportJobStatus): Promise<boolean> {
    const { count } = await prisma.importJob.updateMany({
      where: { id: job.id, status: expectedStatus as $Enums.ImportJobStatus },
      data: this.toUpdateData(job),
    })

    return count === 1
  }

  /**
   * 開始したジョブ（RUNNING）を、保存済みが PENDING かつ他に RUNNING のジョブがない場合のみ保存する
   * ジョブの開始はトランザクション内のアドバイザリロックで直列化し、複数のプロセス・リクエストから
   * 同時に開始しても RUNNING になるジョブを常に1件以下にする
   * @param job
   * @returns STARTED: 保存した / BUSY: 他のジョブが実行中 / NOT_PENDING: 保存済みが PENDING ではない
   */
  async updateIfStartable(job: ImportJob): Promise<ImportJobStartResult> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('import_jobs:start'))`

      const runningCount = await tx.importJob.count({
        where: { status: 'RUNNING', id: { not: job.id } },
      })
      if (runningCount > 0) {
        return 'BUSY'
      }

      const { count } = await tx.importJob.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: this.toUpdateData(job),
      })
      return count === 1 ? 'STARTED' : 'NOT_PENDING'
    })
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
      // 同じミリ秒に作成されたジョブも作成順に並べる（cuid は作成順に増加する）
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
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

  private toUpdateData(job: ImportJob): Prisma.ImportJobUpdateManyMutationInput {
    return {
      status: job.status as $Enums.ImportJobStatus,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      successCount: job.successCount,
      errorCount: job.errorCount,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorDetails: job.errorDetails as Prisma.InputJsonValue,
      result: job.result as Prisma.InputJsonValue,
    }
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