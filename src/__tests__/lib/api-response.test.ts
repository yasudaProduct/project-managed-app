jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  },
}))

import { z } from 'zod'
import {
  createApiResponse,
  createApiError,
  createImportResponse,
  createImportError,
  validateRequiredFields,
} from '@/lib/api-response'

describe('api-response', () => {
  describe('createApiResponse', () => {
    it('成功レスポンスを返す', async () => {
      const response = createApiResponse({ id: 1 }, '作成しました', 201)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.data).toEqual({ id: 1 })
      expect(body.message).toBe('作成しました')
      expect(body.timestamp).toBeDefined()
    })

    it('message 省略時は message フィールドを含まない', async () => {
      const response = createApiResponse(['a', 'b'])
      const body = await response.json()

      expect(body.success).toBe(true)
      expect(body.data).toEqual(['a', 'b'])
      expect(body.message).toBeUndefined()
    })
  })

  describe('createApiError', () => {
    it('エラーレスポンスを返す', async () => {
      const response = createApiError('取得に失敗しました', 500)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBe('取得に失敗しました')
      expect(body.timestamp).toBeDefined()
    })

    it('Zod エラー詳細を errors に含められる', async () => {
      const schema = z.object({ name: z.string().min(1) })
      const result = schema.safeParse({ name: '' })
      if (result.success) {
        throw new Error('expected validation failure')
      }

      const response = createApiError('入力データが正しくありません', 400, result.error.errors)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.errors).toEqual(result.error.errors)
    })
  })

  describe('createImportResponse', () => {
    it('インポート成功レスポンスを返す', async () => {
      const response = createImportResponse(
        { totalRecords: 10, successCount: 8, errorCount: 2 },
        'インポートが完了しました'
      )
      const body = await response.json()

      expect(body.success).toBe(true)
      expect(body.data.totalRecords).toBe(10)
      expect(body.message).toBe('インポートが完了しました')
    })
  })

  describe('createImportError', () => {
    it('インポートエラーレスポンスを返す', async () => {
      const response = createImportError('インポートに失敗しました', 422, [{ row: 1, message: 'invalid' }])
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.success).toBe(false)
      expect(body.error).toBe('インポートに失敗しました')
      expect(body.errors).toEqual([{ row: 1, message: 'invalid' }])
    })
  })

  describe('validateRequiredFields', () => {
    it('必須フィールドが揃っている場合は null を返す', () => {
      expect(validateRequiredFields({ type: 'WBS', name: 'test' }, ['type', 'name'])).toBeNull()
    })

    it('必須フィールドが欠けている場合はエラーメッセージを返す', () => {
      expect(validateRequiredFields({ name: 'test' }, ['type'])).toBe('type is required')
      expect(validateRequiredFields({ type: '' }, ['type'])).toBe('type is required')
    })
  })
})
