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
  try {
    const { id } = await context.params
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)

    await importJobService.cancelJob(id)

    return createApiResponse({ cancelled: true })
  } catch (error) {
    console.error('Failed to cancel import job:', error)
    return createApiError('Failed to cancel import job', 500)
  }
}
