/**
 * @jest-environment node
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  },
}))

jest.mock('@/lib/inversify.config', () => ({
  container: {
    get: jest.fn(),
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/import-jobs/[id]/execute/route'
import { container } from '@/lib/inversify.config'
import { ImportJob } from '@/domains/import-job/import-job'

/**
 * POST /api/import-jobs/{id}/execute は cron の毎分ジョブ（run-pending-import-jobs.sh）と
 * 日次/月次ジョブ（run-*-import.sh）の双方から呼ばれる。
 * 同じジョブへの重複呼び出しで二重にインポートを起動しないことを検証する。
 */
describe('POST /api/import-jobs/{id}/execute', () => {
  const mockImportJobService = {
    getJob: jest.fn(),
    startJob: jest.fn(),
    executeJobAsync: jest.fn(),
  }

  const request = {} as NextRequest
  const context = (id: string) => ({ params: Promise.resolve({ id }) })

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(container.get as jest.Mock).mockReset()
    ;(container.get as jest.Mock).mockReturnValue(mockImportJobService)
    mockImportJobService.getJob.mockReset()
    mockImportJobService.startJob.mockReset()
    mockImportJobService.executeJobAsync.mockReset()
    mockImportJobService.getJob.mockResolvedValue(
      Object.assign(ImportJob.create({ type: 'WBS', wbsId: 1, options: {} }), { id: 'job-1' })
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('ジョブを開始できた場合はバックグラウンド実行を起動して 200 を返す', async () => {
    mockImportJobService.startJob.mockResolvedValue(true)

    const response = await POST(request, context('job-1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual({ started: true })
    expect(mockImportJobService.startJob).toHaveBeenCalledWith('job-1')
    expect(mockImportJobService.executeJobAsync).toHaveBeenCalledWith('job-1')
  })

  it('既に他の実行者が開始していた（保留中でない）場合は 409 を返し、実行を起動しない', async () => {
    mockImportJobService.startJob.mockResolvedValue(false)

    const response = await POST(request, context('job-1'))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.success).toBe(false)
    expect(mockImportJobService.executeJobAsync).not.toHaveBeenCalled()
  })

  it('ジョブが存在しない場合は 404 を返す', async () => {
    mockImportJobService.getJob.mockResolvedValue(null)

    const response = await POST(request, context('missing'))

    expect(response.status).toBe(404)
    expect(mockImportJobService.startJob).not.toHaveBeenCalled()
    expect(mockImportJobService.executeJobAsync).not.toHaveBeenCalled()
  })
})
