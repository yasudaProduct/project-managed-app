import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import type { IImportJobRepository } from './iimport-job.repository'
import { ImportJob, ImportJobOptions, ImportJobProgress } from '@/domains/import-job/import-job'
import { ImportJobStatus } from '@prisma/client'

export interface IImportJobApplicationService {
  createJob(options: ImportJobOptions & { createdBy: string }): Promise<ImportJob>
  startJob(jobId: string): Promise<void>
  updateJobProgress(jobId: string, processed: number, success: number, error: number): Promise<void>
  completeJob(jobId: string, result: Record<string, unknown>): Promise<void>
  failJob(jobId: string, errorDetails: Record<string, unknown>): Promise<void>
  cancelJob(jobId: string): Promise<void>
  addProgress(jobId: string, progress: Omit<ImportJobProgress, 'recordedAt'>): Promise<void>
  getJob(jobId: string): Promise<ImportJob | null>
  getUserJobs(userId: string): Promise<ImportJob[]>
  getPendingJobs(): Promise<ImportJob[]>
  getRunningJobs(): Promise<ImportJob[]>
  getJobProgress(jobId: string): Promise<ImportJobProgress[]>
}

@injectable()
export class ImportJobApplicationService implements IImportJobApplicationService {
  constructor(
    @inject(SYMBOL.IImportJobRepository) private importJobRepository: IImportJobRepository
  ) { }

  async createJob(options: ImportJobOptions & { createdBy: string }): Promise<ImportJob> {
    const job = ImportJob.create(options)
    return await this.importJobRepository.create(job)
  }

  async startJob(jobId: string): Promise<void> {
    const job = await this.importJobRepository.findById(jobId)
    if (!job) {
      throw new Error(`ジョブが見つかりません: ${jobId}`)
    }

    job.start()
    await this.importJobRepository.update(job)
    await this.addProgress(jobId, {
      message: 'インポートジョブを開始しました',
      level: 'info',
    })
  }

  async updateJobProgress(
    jobId: string,
    processed: number,
    success: number,
    error: number
  ): Promise<void> {
    const job = await this.importJobRepository.findById(jobId)
    if (!job) {
      throw new Error(`ジョブが見つかりません: ${jobId}`)
    }

    job.updateProgress(processed, success, error)
    await this.importJobRepository.update(job)
  }

  async completeJob(jobId: string, result: Record<string, unknown>): Promise<void> {
    const job = await this.importJobRepository.findById(jobId)
    if (!job) {
      throw new Error(`ジョブが見つかりません: ${jobId}`)
    }

    job.complete(result)
    await this.importJobRepository.update(job)
    await this.addProgress(jobId, {
      message: `インポートジョブが完了しました（成功: ${job.successCount}件、エラー: ${job.errorCount}件）`,
      level: 'info',
      detail: result,
    })
  }

  async failJob(jobId: string, errorDetails: Record<string, unknown>): Promise<void> {
    const job = await this.importJobRepository.findById(jobId)
    if (!job) {
      throw new Error(`ジョブが見つかりません: ${jobId}`)
    }

    job.fail(errorDetails)
    await this.importJobRepository.update(job)
    await this.addProgress(jobId, {
      message: 'インポートジョブが失敗しました',
      level: 'error',
      detail: errorDetails,
    })
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = await this.importJobRepository.findById(jobId)
    if (!job) {
      throw new Error(`ジョブが見つかりません: ${jobId}`)
    }

    job.cancel()
    await this.importJobRepository.update(job)
    await this.addProgress(jobId, {
      message: 'インポートジョブがキャンセルされました',
      level: 'warning',
    })
  }

  async addProgress(
    jobId: string,
    progress: Omit<ImportJobProgress, 'recordedAt'>
  ): Promise<void> {
    await this.importJobRepository.addProgress(jobId, {
      ...progress,
      recordedAt: new Date(),
    })
  }

  async getJob(jobId: string): Promise<ImportJob | null> {
    return await this.importJobRepository.findById(jobId)
  }

  async getUserJobs(userId: string): Promise<ImportJob[]> {
    return await this.importJobRepository.findByUser(userId)
  }

  async getPendingJobs(): Promise<ImportJob[]> {
    return await this.importJobRepository.findByStatus(ImportJobStatus.PENDING)
  }

  async getRunningJobs(): Promise<ImportJob[]> {
    return await this.importJobRepository.findByStatus(ImportJobStatus.RUNNING)
  }

  async getJobProgress(jobId: string): Promise<ImportJobProgress[]> {
    return await this.importJobRepository.getProgress(jobId)
  }
}