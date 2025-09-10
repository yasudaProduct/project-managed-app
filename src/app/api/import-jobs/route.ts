import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IImportJobApplicationService } from '@/applications/import-job/import-job-application.service'
import { ImportJobType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
    const jobs = await importJobService.getUserJobs(userId)

    return NextResponse.json(jobs.map(job => ({
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
    })))
  } catch (error) {
    console.error('Failed to get import jobs:', error)
    return NextResponse.json(
      { error: 'Failed to get import jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, createdBy, ...options } = body

    if (!type || !createdBy) {
      return NextResponse.json(
        { error: 'Type and createdBy are required' },
        { status: 400 }
      )
    }

    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
    
    const job = await importJobService.createJob({
      type: type as ImportJobType,
      createdBy,
      ...options
    })

    // バックグラウンドでインポート処理を開始
    startBackgroundImport(job.id)

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create import job:', error)
    return NextResponse.json(
      { error: 'Failed to create import job' },
      { status: 500 }
    )
  }
}

async function startBackgroundImport(jobId: string) {
  // バックグラウンドでインポート処理を実行
  // この関数は非同期で実行され、レスポンスを待たない
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/import-jobs/${jobId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error('Failed to start background import:', await response.text())
    }
  } catch (error) {
    console.error('Failed to start background import:', error)
  }
}