import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IImportJobApplicationService } from '@/applications/import-job/import-job-application.service'
import { IGeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service'
import { IWbsSyncApplicationService } from '@/applications/wbs-sync/IWbsSyncApplicationService'
import { ImportJob } from '@/domains/import-job/import-job'
import { INotificationService } from '@/applications/notification/INotificationService'
import { NotificationType } from '@/types/notification'
import { NotificationPriority } from '@/domains/notification/notification-priority'
import { NotificationChannel } from '@/domains/notification/notification-channel'
import { IWbsApplicationService } from '@/applications/wbs/wbs-application-service'

interface Params {
  id: string
}

/**
 * インポートジョブを実行
 * @param request 
 * @param context
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<Params> }
) {
  const { id } = await context.params

  try {
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)

    const job = await importJobService.getJob(id)
    if (!job) {
      return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 })
    }

    if (job.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'ジョブは保留中ではありません' },
        { status: 400 }
      )
    }

    // ジョブを開始状態にする
    await importJobService.startJob(id)

    // バックグラウンドで実際のインポート処理を実行
    executeImportInBackground(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('インポートジョブの実行に失敗しました', error)
    return NextResponse.json(
      { error: 'インポートジョブの実行に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * インポートジョブを実行
 * @param jobId 
 */
async function executeImportInBackground(jobId: string) {
  const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)

  try {
    const job = await importJobService.getJob(jobId)
    if (!job) {
      throw new Error('ジョブが見つかりません')
    }

    await importJobService.addProgress(jobId, {
      message: 'インポート処理を開始しています...',
      level: 'info',
    })

    if (job.type === 'GEPPO') {
      await executeGeppoImport(jobId, job)
    } else if (job.type === 'WBS') {
      await executeWbsImport(jobId, job)
    } else {
      throw new Error(`サポートされていないジョブタイプです: ${job.type}`)
    }
  } catch (error) {
    console.error('バックグラウンドインポートに失敗しました。:', error)
    await importJobService.failJob(jobId, {
      message: error instanceof Error ? error.message : '不明なエラー',
      error: error,
    })

    // ジョブ失敗時の通知送信
    await sendJobNotification(jobId, 'FAILED')
  }
}

/**
 * Geppoインポートを実行
 * @param jobId 
 * @param job 
 */
async function executeGeppoImport(jobId: string, job: ImportJob) {
  const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
  const geppoImportService = container.get<IGeppoImportApplicationService>(SYMBOL.IGeppoImportApplicationService)

  try {
    await importJobService.addProgress(jobId, {
      message: 'Geppoデータの取得を開始しています...',
      level: 'info',
    })

    // パラメータチェック
    // targetMonthは任意 - 指定されていない場合は全期間をインポート

    // Geppoインポート実行
    const result = await geppoImportService.executeImport({
      targetMonth: job.targetMonth,
      targetProjectNames: job.targetProjectIds,
      updateMode: 'replace',
      dryRun: (job.options.dryRun as boolean) || false,
    })

    // 進捗更新
    await importJobService.updateJobProgress(
      jobId,
      result.totalWorkRecords,
      result.successCount,
      result.errorCount
    )

    // 完了
    await importJobService.completeJob(jobId, {
      totalGeppoRecords: result.totalGeppoRecords,
      totalWorkRecords: result.totalWorkRecords,
      successCount: result.successCount,
      errorCount: result.errorCount,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      deletedCount: result.deletedCount,
    })

    await importJobService.addProgress(jobId, {
      message: `Geppoインポートが完了しました（成功: ${result.successCount}件、エラー: ${result.errorCount}件）`,
      level: 'info',
    })

    // ジョブ完了時の通知送信
    await sendJobNotification(jobId, 'COMPLETED')
  } catch (error) {
    throw error
  }
}

/**
 * 指定されたジョブIdのWBSインポートを実行
 * @param jobId 
 * @param job 
 */
async function executeWbsImport(jobId: string, job: ImportJob) {
  const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
  const wbsSyncService = container.get<IWbsSyncApplicationService>(SYMBOL.IWbsSyncApplicationService)

  try {
    await importJobService.addProgress(jobId, {
      message: 'WBSデータの同期を開始しています...',
      level: 'info',
    })

    // パラメータチェック
    if (!job.wbsId) {
      throw new Error('WBS IDはWBSのインポートに必要です')
    }

    // WBS同期実行
    const result = await wbsSyncService.replaceAll(job.wbsId)

    if (result.success) {

      // 完了
      await importJobService.completeJob(jobId, {
        recordCount: 1,
        addedCount: 0,
        updatedCount: 1,
        deletedCount: 0,
      })

      await importJobService.addProgress(jobId, {
        message: 'WBS同期が完了しました',
        level: 'info',
      })
    } else {

      await importJobService.failJob(jobId, {
        message: 'WBS同期に失敗しました',
        error: result.errorDetails,
      })

      await importJobService.addProgress(jobId, {
        message: 'WBS同期に失敗しました',
        level: 'error',
      })
    }

    // ジョブ完了時の通知送信
    await sendJobNotification(jobId, 'COMPLETED')
  } catch (error) {
    throw error
  }
}

/**
 * インポートジョブの完了/失敗通知を送信
 * @param jobId 
 * @param status 
 */
async function sendJobNotification(jobId: string, status: 'COMPLETED' | 'FAILED') {
  try {
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
    const notificationService = container.get<INotificationService>(SYMBOL.INotificationService)
    const wbsApplicationService = container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService)

    const job = await importJobService.getJob(jobId)
    if (!job) {
      // 作成者がnullの場合は通知なし
      return
    }

    // 作成者がnullの場合はWBSの担当者に通知
    const assignees = await wbsApplicationService.getAssignees(job.wbsId!)
    const sendUserIds = job.createdBy
      ? [job.createdBy]
      : assignees?.map((assignee) => assignee.assignee?.userId)
        .filter((userId) => userId !== null) ?? []

    const isSuccess = status === 'COMPLETED'
    const notificationType = isSuccess ? NotificationType.IMPORT_JOB_COMPLETED : NotificationType.IMPORT_JOB_FAILED
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
      await notificationService.createNotification({
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
    // 通知送信エラーはログのみでジョブ処理は継続
    console.error('通知送信に失敗しました:', error)
  }
}