import { NextRequest } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IImportJobApplicationService } from '@/applications/import-job/import-job-application.service'

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  const { id } = await context.params
  
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // 初期データ送信とポーリング開始
      sendUpdates(controller, id, encoder)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

async function sendUpdates(
  controller: ReadableStreamDefaultController,
  jobId: string,
  encoder: TextEncoder
) {
  const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
  let lastProgressCount = 0
  
  const sendEvent = (event: string, data: Record<string, unknown>) => {
    const message = `data: ${JSON.stringify({ type: event, ...data })}\n\n`
    controller.enqueue(encoder.encode(message))
  }

  const pollJob = async () => {
    try {
      const job = await importJobService.getJob(jobId)
      if (!job) {
        sendEvent('error', { message: 'Job not found' })
        controller.close()
        return false
      }

      // ジョブ状態を送信
      sendEvent('job_update', {
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          totalRecords: job.totalRecords,
          processedRecords: job.processedRecords,
          successCount: job.successCount,
          errorCount: job.errorCount,
          startedAt: job.startedAt?.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          errorDetails: job.errorDetails,
          result: job.result,
        }
      })

      // 進捗ログを送信（新しいもののみ）
      const progress = await importJobService.getJobProgress(jobId)
      const newProgress = progress.slice(0, progress.length - lastProgressCount)
      
      newProgress.forEach(log => {
        sendEvent('progress_update', {
          progress: {
            message: log.message,
            level: log.level,
            detail: log.detail,
            recordedAt: log.recordedAt.toISOString(),
          }
        })
      })
      
      lastProgressCount = progress.length

      // ジョブが完了している場合は接続を終了
      if (job.isFinished) {
        controller.close()
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to poll job:', error)
      sendEvent('error', { message: 'Failed to get job status' })
      return true // エラーが発生してもポーリングは続ける
    }
  }

  // 初回実行
  const shouldContinue = await pollJob()
  if (!shouldContinue) return

  // 2秒間隔でポーリング
  const interval = setInterval(async () => {
    const shouldContinue = await pollJob()
    if (!shouldContinue) {
      clearInterval(interval)
    }
  }, 2000)

  // クライアントが接続を閉じた場合の処理
  const cleanup = () => {
    clearInterval(interval)
    controller.close()
  }

  // 30分後にタイムアウト
  const timeout = setTimeout(cleanup, 30 * 60 * 1000)

  // クリーンアップ関数を返す（実際には使われないが、参考のため）
  return () => {
    clearInterval(interval)
    clearTimeout(timeout)
  }
}