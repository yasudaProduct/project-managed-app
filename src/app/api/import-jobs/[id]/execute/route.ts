import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IImportJobApplicationService } from '@/applications/import-job/import-job-application.service'
import { IGeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service'
import { IWbsSyncApplicationService } from '@/applications/excel-sync/IWbsSyncApplicationService'
import { ImportJob } from '@/domains/import-job/import-job'

interface Params {
  id: string
}

/**
 * インポートジョブを実行
 * @param request 
 * @param context
 */
export async function POST(
  request: NextRequest,
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
    if (!job.targetMonth) {
      throw new Error('対象月が必要です')
    }

    // Geppoインポート実行
    const result = await geppoImportService.executeImport({
      targetMonth: job.targetMonth,
      targetProjectNames: job.targetProjectIds,
      updateMode: job.options.updateMode === 'replace' ? 'replace' : 'merge',
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
    const result = await wbsSyncService.executeReplaceAll(job.wbsId)

    if (!result.success) {
      await importJobService.failJob(jobId, {
        message: 'WBS同期に失敗しました',
        error: result.errorDetails,
      })
    }

    // 進捗更新（仮のデータ）
    await importJobService.updateJobProgress(
      jobId,
      1,
      1,
      0
    )

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
  } catch (error) {
    throw error
  }
}