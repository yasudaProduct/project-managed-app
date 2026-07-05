import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import type { IImportJobRepository } from './iimport-job.repository'
import { ImportJob, ImportJobOptions, ImportJobProgress } from '@/domains/import-job/import-job'
import { ImportJobStatuses } from '@/domains/import-job/import-job-enums'
import type { IGeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service'
import type { IWbsSyncApplicationService } from '@/applications/wbs-sync/IWbsSyncApplicationService'
import { resolveWbsSyncMode } from '@/applications/wbs-sync/wbs-sync-mode'
import type { INotificationService } from '@/applications/notification/INotificationService'
import { NotificationType } from '@/types/notification'
import { NotificationPriority } from '@/domains/notification/notification-priority'
import { NotificationChannel } from '@/domains/notification/notification-channel'
import type { IWbsApplicationService } from '@/applications/wbs/wbs-application-service'

export interface IImportJobApplicationService {
  createJob(options: ImportJobOptions & { createdBy: string }): Promise<ImportJob>
  startJob(jobId: string): Promise<void>
  executeJobAsync(jobId: string): void
  updateJobProgress(jobId: string, processed: number, success: number, error: number): Promise<void>
  completeJob(jobId: string, result: Record<string, unknown>): Promise<void>
  failJob(jobId: string, errorDetails: Record<string, unknown>): Promise<void>
  cancelJob(jobId: string): Promise<void>
  addProgress(jobId: string, progress: Omit<ImportJobProgress, 'recordedAt'>): Promise<void>
  getJob(jobId: string): Promise<ImportJob | null>
  getAllJobs(limit?: number): Promise<ImportJob[]>
  getUserJobs(userId: string): Promise<ImportJob[]>
  getPendingJobs(): Promise<ImportJob[]>
  getRunningJobs(): Promise<ImportJob[]>
  getJobProgress(jobId: string): Promise<ImportJobProgress[]>
}

@injectable()
export class ImportJobApplicationService implements IImportJobApplicationService {
  constructor(
    @inject(SYMBOL.IImportJobRepository) private importJobRepository: IImportJobRepository,
    @inject(SYMBOL.IGeppoImportApplicationService)
    private geppoImportService: IGeppoImportApplicationService,
    @inject(SYMBOL.IWbsSyncApplicationService)
    private wbsSyncService: IWbsSyncApplicationService,
    @inject(SYMBOL.INotificationService)
    private notificationService: INotificationService,
    @inject(SYMBOL.IWbsApplicationService)
    private wbsApplicationService: IWbsApplicationService,
  ) { }

  /**
   * インポートジョブを作成
   * @param options 
   * @returns 
   */
  async createJob(options: ImportJobOptions & { createdBy?: string }): Promise<ImportJob> {
    const job = ImportJob.create(options)
    return await this.importJobRepository.create(job)
  }

  /**
   * インポートジョブを開始
   * @param jobId 
   * @returns 
   */
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

  /**
   * インポートジョブの進捗を更新
   * @param jobId 
   * @param processed 
   * @param success 
   * @param error 
   */
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

  /**
   * インポートジョブを完了
   * @param jobId 
   * @param result 
   */
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

  /**
   * インポートジョブを失敗
   * @param jobId 
   * @param errorDetails 
   */
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

  /**
   * インポートジョブをキャンセル
   * @param jobId 
   */
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

  /**
   * インポートジョブの進捗を追加
   * @param jobId 
   * @param progress 
   */
  async addProgress(
    jobId: string,
    progress: Omit<ImportJobProgress, 'recordedAt'>
  ): Promise<void> {
    await this.importJobRepository.addProgress(jobId, {
      ...progress,
      recordedAt: new Date(),
    })
  }

  /**
   * インポートジョブを取得
   * @param jobId 
   * @returns 
   */
  async getJob(jobId: string): Promise<ImportJob | null> {
    return await this.importJobRepository.findById(jobId)
  }

  /**
   * すべてのインポートジョブを取得
   * @param limit
   * @returns
   */
  async getAllJobs(limit: number = 100): Promise<ImportJob[]> {
    return await this.importJobRepository.findAll(limit)
  }

  /**
   * ユーザーのインポートジョブを取得
   * @param userId 
   * @returns 
   */
  async getUserJobs(userId: string): Promise<ImportJob[]> {
    return await this.importJobRepository.findByUser(userId)
  }

  /**
   * 待機中のインポートジョブを取得
   * @returns 
   */
  async getPendingJobs(): Promise<ImportJob[]> {
    return await this.importJobRepository.findByStatus(ImportJobStatuses.PENDING)
  }

  /**
   * 実行中のインポートジョブを取得
   * @returns 
   */
  async getRunningJobs(): Promise<ImportJob[]> {
    return await this.importJobRepository.findByStatus(ImportJobStatuses.RUNNING)
  }

  /**
   * インポートジョブの進捗を取得
   * @param jobId 
   * @returns 
   */
  async getJobProgress(jobId: string): Promise<ImportJobProgress[]> {
    return await this.importJobRepository.getProgress(jobId)
  }

  executeJobAsync(jobId: string): void {
    void this.executeImportInBackground(jobId)
  }

  private async executeImportInBackground(jobId: string): Promise<void> {
    try {
      const job = await this.getJob(jobId)
      if (!job) {
        throw new Error('ジョブが見つかりません')
      }

      await this.addProgress(jobId, {
        message: 'インポート処理を開始しています...',
        level: 'info',
      })

      if (job.type === 'GEPPO') {
        await this.executeGeppoImport(jobId, job)
      } else if (job.type === 'WBS') {
        await this.executeWbsImport(jobId, job)
      } else {
        throw new Error(`サポートされていないジョブタイプです: ${job.type}`)
      }
    } catch (error) {
      console.error('バックグラウンドインポートに失敗しました。:', error)
      await this.failJob(jobId, {
        message: error instanceof Error ? error.message : '不明なエラー',
        error: error,
      })

      await this.sendJobNotification(jobId, 'FAILED')
    }
  }

  private async executeGeppoImport(jobId: string, job: ImportJob): Promise<void> {
    await this.addProgress(jobId, {
      message: 'Geppoデータの取得を開始しています...',
      level: 'info',
    })

    const result = await this.geppoImportService.executeImport({
      targetMonth: job.targetMonth,
      targetProjectNames: job.targetProjectIds,
      updateMode: 'replace',
      dryRun: (job.options.dryRun as boolean) || false,
    })

    await this.updateJobProgress(
      jobId,
      result.totalWorkRecords,
      result.successCount,
      result.errorCount
    )

    await this.completeJob(jobId, {
      totalGeppoRecords: result.totalGeppoRecords,
      totalWorkRecords: result.totalWorkRecords,
      successCount: result.successCount,
      errorCount: result.errorCount,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      deletedCount: result.deletedCount,
    })

    await this.addProgress(jobId, {
      message: `Geppoインポートが完了しました（成功: ${result.successCount}件、エラー: ${result.errorCount}件）`,
      level: 'info',
    })

    await this.sendJobNotification(jobId, 'COMPLETED')
  }

  private async executeWbsImport(jobId: string, job: ImportJob): Promise<void> {
    await this.addProgress(jobId, {
      message: 'WBSデータの同期を開始しています...',
      level: 'info',
    })

    if (!job.wbsId) {
      throw new Error('WBS IDはWBSのインポートに必要です')
    }

    const syncMode = resolveWbsSyncMode(job.options)
    await this.addProgress(jobId, {
      message: `同期モード: ${syncMode === 'replace' ? '洗い替え(replace)' : '差分(diff)'}`,
      level: 'info',
    })

    const result = syncMode === 'replace'
      ? await this.wbsSyncService.replaceAll(job.wbsId)
      : await this.wbsSyncService.syncDiff(job.wbsId)

    if (result.success) {
      await this.completeJob(jobId, {
        recordCount: result.recordCount,
        addedCount: result.addedCount,
        updatedCount: result.updatedCount,
        deletedCount: result.deletedCount,
      })

      await this.addProgress(jobId, {
        message: `WBS同期が完了しました（新規: ${result.addedCount}件 / 更新: ${result.updatedCount}件 / 削除: ${result.deletedCount}件）`,
        level: 'info',
      })
    } else {
      await this.failJob(jobId, {
        message: 'WBS同期に失敗しました',
        error: result.errorDetails,
      })

      await this.addProgress(jobId, {
        message: 'WBS同期に失敗しました',
        level: 'error',
      })
    }

    await this.sendJobNotification(jobId, 'COMPLETED')
  }

  private async sendJobNotification(jobId: string, status: 'COMPLETED' | 'FAILED'): Promise<void> {
    try {
      const job = await this.getJob(jobId)
      if (!job) {
        return
      }

      const assignees = await this.wbsApplicationService.getAssignees(job.wbsId!)
      const sendUserIds = job.createdBy
        ? [job.createdBy]
        : assignees?.map((assignee) => assignee.assignee?.userId)
            .filter((userId) => userId !== null) ?? []

      const isSuccess = status === 'COMPLETED'
      const notificationType = isSuccess
        ? NotificationType.IMPORT_JOB_COMPLETED
        : NotificationType.IMPORT_JOB_FAILED
      const title = isSuccess ? 'インポートジョブが完了しました' : 'インポートジョブが失敗しました'

      let message = ''
      if (job.type === 'GEPPO') {
        const periodDescription = job.targetMonth ? `（${job.targetMonth}）` : '（全期間）'
        message = isSuccess
          ? `Geppoインポート${periodDescription}が完了しました。成功: ${job.successCount}件、エラー: ${job.errorCount}件`
          : `Geppoインポート${periodDescription}が失敗しました。`
      } else if (job.type === 'WBS') {
        const wbsName = job.wbsId ? `WBS ID: ${job.wbsId}` : 'WBS'
        message = isSuccess
          ? `${wbsName}の同期が完了しました。`
          : `${wbsName}の同期が失敗しました。`
      }

      for (const userId of sendUserIds) {
        if (!userId) continue
        await this.notificationService.createNotification({
          userId: userId,
          type: notificationType,
          priority: isSuccess ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
          title,
          message,
          data: {
            jobId: job.id,
            jobType: job.type,
            totalRecords: job.totalRecords,
            processedRecords: job.processedRecords,
            successCount: job.successCount,
            errorCount: job.errorCount,
            errorDetails: job.errorDetails,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        })
      }
    } catch (error) {
      console.error('通知送信に失敗しました:', error)
    }
  }
}