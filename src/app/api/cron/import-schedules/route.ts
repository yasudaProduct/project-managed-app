import { NextRequest } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import type { IImportScheduleApplicationService } from '@/applications/import-schedule/import-schedule-application-service'
import type { IImportJobApplicationService } from '@/applications/import-job/import-job-application-service'
import { createApiResponse, createApiError } from '@/lib/api-response'

/**
 * POST /api/cron/import-schedules - 定期インポートの起動（cron から毎分呼ぶ）
 * 期限が来たWBSの定期インポートをジョブとして登録し、実行待ちのジョブを開始する
 * （アプリの再起動などで止まった待ち行列の再開も兼ねる）
 */
export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET environment variable is not set')
    return createApiError('サーバーの設定エラーです', 500)
  }
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return createApiError('認証に失敗しました', 401)
  }

  try {
    const scheduleService = container.get<IImportScheduleApplicationService>(
      SYMBOL.IImportScheduleApplicationService
    )
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)

    const result = await scheduleService.runDueSchedules(new Date())
    await importJobService.dispatchPendingJobs()

    return createApiResponse(result)
  } catch (error) {
    console.error('定期インポートの起動に失敗しました', error)
    return createApiError('定期インポートの起動に失敗しました', 500)
  }
}
