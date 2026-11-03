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
import { POST } from '@/app/api/cron/import-schedules/route'
import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'

/**
 * POST /api/cron/import-schedules は cron コンテナから毎分呼ばれ、
 * 期限が来たWBSの定期インポートをジョブとして登録し、待ち行列のジョブの実行を再開する。
 */
describe('POST /api/cron/import-schedules', () => {
  const mockScheduleService = {
    runDueSchedules: jest.fn(),
  }
  const mockImportJobService = {
    dispatchPendingJobs: jest.fn(),
  }
  const originalSecret = process.env.CRON_SECRET

  const makeRequest = (authorization?: string) =>
    ({
      headers: { get: (name: string) => (name.toLowerCase() === 'authorization' ? authorization ?? null : null) },
    }) as unknown as NextRequest

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    process.env.CRON_SECRET = 'test-secret'
    ;(container.get as jest.Mock).mockReset()
    ;(container.get as jest.Mock).mockImplementation((symbol: symbol) => {
      if (symbol === SYMBOL.IImportScheduleApplicationService) return mockScheduleService
      if (symbol === SYMBOL.IImportJobApplicationService) return mockImportJobService
      throw new Error(`unexpected symbol: ${String(symbol)}`)
    })
    mockScheduleService.runDueSchedules.mockReset()
    mockScheduleService.runDueSchedules.mockResolvedValue({ isSkipped: false, createdJobIds: ['job-1'] })
    mockImportJobService.dispatchPendingJobs.mockReset()
    mockImportJobService.dispatchPendingJobs.mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
    jest.restoreAllMocks()
  })

  it('期限が来た予定のジョブを登録し、待ち行列のジョブの実行を再開して結果を返す', async () => {
    const response = await POST(makeRequest('Bearer test-secret'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ isSkipped: false, createdJobIds: ['job-1'] })
    expect(mockScheduleService.runDueSchedules).toHaveBeenCalledWith(expect.any(Date))
    expect(mockImportJobService.dispatchPendingJobs).toHaveBeenCalledTimes(1)
    expect(mockScheduleService.runDueSchedules.mock.invocationCallOrder[0]).toBeLessThan(
      mockImportJobService.dispatchPendingJobs.mock.invocationCallOrder[0]
    )
  })

  it('CRON_SECRET が一致しない場合は 401 を返し、何も実行しない', async () => {
    const response = await POST(makeRequest('Bearer wrong'))

    expect(response.status).toBe(401)
    expect(mockScheduleService.runDueSchedules).not.toHaveBeenCalled()
    expect(mockImportJobService.dispatchPendingJobs).not.toHaveBeenCalled()
  })

  it('Authorization ヘッダーがない場合は 401 を返す', async () => {
    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    expect(mockScheduleService.runDueSchedules).not.toHaveBeenCalled()
  })

  it('サーバーに CRON_SECRET が設定されていない場合は 500 を返し、何も実行しない', async () => {
    delete process.env.CRON_SECRET

    const response = await POST(makeRequest('Bearer undefined'))

    expect(response.status).toBe(500)
    expect(mockScheduleService.runDueSchedules).not.toHaveBeenCalled()
  })

  it('処理中に例外が起きた場合は 500 を返す', async () => {
    mockScheduleService.runDueSchedules.mockRejectedValue(new Error('DB error'))

    const response = await POST(makeRequest('Bearer test-secret'))

    expect(response.status).toBe(500)
  })
})
