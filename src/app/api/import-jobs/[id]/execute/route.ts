import { NextRequest } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IImportJobApplicationService } from '@/applications/import-job/import-job-application-service'
import { createApiResponse, createApiError } from '@/lib/api-response'

interface Params {
  id: string
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<Params> }
) {
  const { id } = await context.params

  try {
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)

    const job = await importJobService.getJob(id)
    if (!job) {
      return createApiError('ジョブが見つかりません', 404)
    }

    if (job.status !== 'PENDING') {
      return createApiError('ジョブは保留中ではありません', 400)
    }

    await importJobService.startJob(id)
    importJobService.executeJobAsync(id)

    return createApiResponse({ started: true })
  } catch (error) {
    console.error('インポートジョブの実行に失敗しました', error)
    return createApiError('インポートジョブの実行に失敗しました', 500)
  }
}
