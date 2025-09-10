import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IImportJobApplicationService } from '@/applications/import-job/import-job-application.service'

interface Params {
  id: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params
    const importJobService = container.get<IImportJobApplicationService>(SYMBOL.IImportJobApplicationService)
    
    await importJobService.cancelJob(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to cancel import job:', error)
    return NextResponse.json(
      { error: 'Failed to cancel import job' },
      { status: 500 }
    )
  }
}