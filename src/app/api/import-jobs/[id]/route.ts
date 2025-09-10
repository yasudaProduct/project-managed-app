import { NextRequest, NextResponse } from 'next/server'
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
  try {
    const { id } = await context.params
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
    
    const job = await importJobService.getJob(id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Failed to get import job:', error)
    return NextResponse.json(
      { error: 'Failed to get import job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
    
    const job = await importJobService.getJob(id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.isRunning) {
      return NextResponse.json(
        { error: 'Cannot delete running job' },
        { status: 400 }
      )
    }

    // 実際の削除処理はここで実装
    // 現在はキャンセル処理のみ
    if (!job.isFinished) {
      await importJobService.cancelJob(id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete import job:', error)
    return NextResponse.json(
      { error: 'Failed to delete import job' },
      { status: 500 }
    )
  }
}