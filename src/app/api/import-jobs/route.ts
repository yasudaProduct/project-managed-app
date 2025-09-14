import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IImportJobApplicationService } from '@/applications/import-job/import-job-application.service'
import { ImportJobType } from '@prisma/client'
import type { IWbsApplicationService } from '@/applications/wbs/wbs-application-service'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/get-current-user-id'

/**
 * インポートジョブを取得
 * @param request 
 * @returns 
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawUserId = searchParams.get('userId')
    const userId = rawUserId && rawUserId.trim() !== '' && rawUserId !== 'null' && rawUserId !== 'undefined'
      ? rawUserId
      : null
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
    const jobs = userId
      ? await importJobService.getUserJobs(userId)
      : await importJobService.getAllJobs()

    // WBS名を取得
    const wbsService = container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService)
    const wbsIdSet = new Set<number>()
    for (const job of jobs) {
      if (job.type === 'WBS' && job.wbsId) {
        wbsIdSet.add(job.wbsId)
      }
    }
    const wbsIdList = Array.from(wbsIdSet)
    const wbsMap = new Map<number, string>()
    if (wbsIdList.length > 0) {
      const results = await Promise.all(
        wbsIdList.map(async (id) => {
          const wbs = await wbsService.getWbsById(id)
          return [id, wbs?.name ?? ''] as const
        })
      )
      for (const [id, name] of results) {
        wbsMap.set(id, name)
      }
    }

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
      wbsName: job.wbsId ? (wbsMap.get(job.wbsId) ?? null) : null,
    })))
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'インポートジョブの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * インポートジョブを作成
 * @param request 
 * @returns 
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, createdBy, ...options } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Type is required' },
        { status: 400 }
      )
    }

    // 未ログインでも使えるように createdBy をフォールバック解決
    let creatorId: string | null = createdBy ?? (await getCurrentUserId())
    if (!creatorId) {
      const anyUser = await prisma.users.findFirst({ select: { id: true } })
      creatorId = anyUser?.id ?? null
    }
    if (!creatorId) {
      const systemUser = await prisma.users.upsert({
        where: { id: 'system' },
        update: {},
        create: {
          id: 'system',
          name: 'System',
          displayName: 'System',
          email: 'system@example.com',
        },
      })
      creatorId = systemUser.id
    }

    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)

    const job = await importJobService.createJob({
      type: type as ImportJobType,
      createdBy: creatorId,
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

/**
 * バックグラウンドでインポート処理を実行
 * @param jobId 
 */
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