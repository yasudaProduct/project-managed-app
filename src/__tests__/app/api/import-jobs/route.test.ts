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
import { POST } from '@/app/api/import-jobs/route'
import { container } from '@/lib/inversify.config'
import { ImportJob } from '@/domains/import-job/import-job'

/**
 * POST /api/import-jobs は cron（docker/cron/run-*-import.sh）からジョブを作成する入口。
 * 実行時に必ず失敗するジョブや、外部キー違反になる createdBy を受け付けないことを検証する。
 */
describe('POST /api/import-jobs', () => {
  const mockImportJobService = {
    createJob: jest.fn(),
  }

  const makeRequest = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(container.get as jest.Mock).mockReset()
    ;(container.get as jest.Mock).mockReturnValue(mockImportJobService)
    mockImportJobService.createJob.mockReset()
    mockImportJobService.createJob.mockImplementation(async (options) =>
      Object.assign(ImportJob.create(options), { id: 'job-1' })
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('body の createdBy は無視し、作成者なしでジョブを作成する（存在しないユーザーIDでの外部キー違反を防ぐ）', async () => {
    const response = await POST(makeRequest({ type: 'GEPPO', targetMonth: '2026-09', createdBy: 'system' }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('job-1')
    expect(mockImportJobService.createJob).toHaveBeenCalledTimes(1)
    const [options] = mockImportJobService.createJob.mock.calls[0]
    expect(options.createdBy).toBeUndefined()
    expect(options).toEqual(expect.objectContaining({ type: 'GEPPO', targetMonth: '2026-09' }))
  })

  it('WBSジョブは wbsId と options（同期モード）を渡して作成する', async () => {
    const response = await POST(makeRequest({ type: 'WBS', wbsId: 3, options: { syncMode: 'replace' } }))

    expect(response.status).toBe(201)
    expect(mockImportJobService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WBS', wbsId: 3, options: { syncMode: 'replace' } })
    )
  })

  it('type=WBS で wbsId がない場合は 400 を返し、ジョブを作成しない（実行時に必ず失敗するため）', async () => {
    const response = await POST(makeRequest({ type: 'WBS' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockImportJobService.createJob).not.toHaveBeenCalled()
  })

  it('wbsId が正の整数でない場合は 400 を返す', async () => {
    const response = await POST(makeRequest({ type: 'WBS', wbsId: '3' }))

    expect(response.status).toBe(400)
    expect(mockImportJobService.createJob).not.toHaveBeenCalled()
  })

  it.each(['2026-9', '2026-13', '202609', 'last month'])(
    'targetMonth が YYYY-MM 形式でない場合（%s）は 400 を返す',
    async (targetMonth) => {
      const response = await POST(makeRequest({ type: 'GEPPO', targetMonth }))

      expect(response.status).toBe(400)
      expect(mockImportJobService.createJob).not.toHaveBeenCalled()
    }
  )

  it('type が不正な場合は 400 を返す', async () => {
    const response = await POST(makeRequest({ type: 'UNKNOWN' }))

    expect(response.status).toBe(400)
    expect(mockImportJobService.createJob).not.toHaveBeenCalled()
  })
})
