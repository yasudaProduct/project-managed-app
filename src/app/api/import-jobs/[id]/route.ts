import { NextRequest } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IImportJobApplicationService } from '@/applications/import-job/import-job-application-service'
import { createApiResponse, createApiError } from '@/lib/api-response'

interface Params {
  id: string
}

function formatJobDetail(job: NonNullable<Awaited<ReturnType<IImportJobApplicationService['getJob']>>>) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    totalRecords: job.totalRecords,
    processedRecords: job.processedRecords,
    successCount: job.successCount,
    errorCount: job.errorCount,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    targetMonth: job.targetMonth,
    wbsId: job.wbsId,
    errorDetails: job.errorDetails,
    result: job.result,
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)

    const job = await importJobService.getJob(id)
    if (!job) {
      return createApiError('Job not found', 404)
    }

    return createApiResponse(formatJobDetail(job))
  } catch (error) {
    console.error('Failed to get import job:', error)
    return createApiError('Failed to get import job', 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)

    const job = await importJobService.getJob(id)
    if (!job) {
      return createApiError('Job not found', 404)
    }

    if (job.isRunning) {
      return createApiError('Cannot delete running job', 400)
    }

    if (!job.isFinished) {
      await importJobService.cancelJob(id)
    }

    return createApiResponse({ deleted: true })
  } catch (error) {
    console.error('Failed to delete import job:', error)
    return createApiError('Failed to delete import job', 500)
  }
}
