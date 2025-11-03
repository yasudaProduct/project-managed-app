import { NextRequest } from 'next/server'
import {
  createImportResponse,
  createImportError,
  createApiResponse,
  validateRequiredFields
} from '@/lib/api-response'
import {
  executeWbsSync,
  getWbsSyncPreview,
  getWbsLastSync,
} from '@/app/wbs/[id]/import/excel-sync-action'
import { getWbsById } from '@/app/wbs/[id]/actions/wbs-actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 必須フィールドのバリデーション
    const requiredFields = ['wbsId']
    const validationErrors = validateRequiredFields(body, requiredFields)

    if (validationErrors.length > 0) {
      return createImportError(
        'Validation failed: ' + validationErrors.join(', '),
        400
      )
    }

    const {
      wbsId,
      syncMode = 'replace',
      skipValidation = false
    } = body

    // WBSの存在確認
    const wbs = await getWbsById(wbsId)
    if (!wbs) {
      return createImportError('WBS not found', 404)
    }

    const startTime = Date.now()

    // バリデーション実行（skipValidationがfalseの場合のみ）
    if (!skipValidation) {
      try {
        const preview = await getWbsSyncPreview(wbsId)

        if (!preview.success || !preview.data) {
          return createImportError('Failed to get sync preview for validation', 422)
        }

        // バリデーションエラーをチェック
        if (preview.data.validationErrors && preview.data.validationErrors.length > 0) {
          const errorMessages = preview.data.validationErrors.map(error =>
            `[Excel行${error.rowNumber || '不明'}] タスク${error.taskNo}: ${error.message}` +
            (error.value !== undefined ? ` (値: ${String(error.value)})` : '')
          )

          return createImportError(
            'Validation failed: ' + errorMessages.join('; '),
            422
          )
        }

      } catch (error) {
        console.error('Validation error:', error)
        return createImportError('Validation process failed', 500)
      }
    }

    // インポート実行
    try {
      const result = await executeWbsSync(wbsId, syncMode)

      if (!result.success || !result.data) {
        return createImportError('Sync execution failed', 500)
      }

      const executionTime = Date.now() - startTime

      return createImportResponse({
        successCount: result.data.recordCount,
        createdCount: result.data.addedCount,
        updatedCount: result.data.updatedCount,
        errorCount: result.data.errorDetails ? 1 : 0,
        errors: result.data.errorDetails ? [{
          recordId: undefined,
          message: String(result.data.errorDetails.message || 'エラーが発生しました'),
          details: result.data.errorDetails
        }] : [],
        executionTime
      }, 'WBS sync completed successfully')

    } catch (error) {
      console.error('WBS sync execution error:', error)
      return createImportError('WBS sync execution failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 500)
    }

  } catch (error) {
    console.error('API error:', error)
    return createImportError('Internal server error', 500)
  }
}

// WBS同期プレビュー取得のGETエンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wbsIdParam = searchParams.get('wbsId')

    if (!wbsIdParam) {
      return createImportError('wbsId parameter is required', 400)
    }

    const wbsId = parseInt(wbsIdParam, 10)
    if (isNaN(wbsId)) {
      return createImportError('Invalid wbsId parameter', 400)
    }

    // WBSの存在確認
    const wbs = await getWbsById(wbsId)
    if (!wbs) {
      return createImportError('WBS not found', 404)
    }

    try {
      const preview = await getWbsSyncPreview(wbsId)

      if (!preview.success || !preview.data) {
        return createImportError('Failed to get sync preview', 500)
      }

      // 最終同期情報も取得
      const lastSync = await getWbsLastSync(wbsId)

      return createApiResponse({
        preview: {
          toAdd: preview.data.toAdd,
          toUpdate: preview.data.toUpdate,
          toDelete: preview.data.toDelete,
          validationErrors: preview.data.validationErrors,
          newPhases: preview.data.newPhases,
          newUsers: preview.data.newUsers,
          details: {
            toAdd: preview.data.details.toAdd,
            toUpdate: preview.data.details.toUpdate,
            toDelete: preview.data.details.toDelete
          }
        },
        lastSync: lastSync.success && lastSync.data ? {
          syncedAt: lastSync.data.syncedAt instanceof Date
            ? lastSync.data.syncedAt.toISOString()
            : lastSync.data.syncedAt,
          recordCount: lastSync.data.recordCount,
          syncStatus: lastSync.data.syncStatus
        } : null,
        wbsInfo: {
          id: wbs.id,
          name: wbs.name,
          projectId: wbs.projectId
        }
      }, 'WBS sync preview retrieved successfully')

    } catch (error) {
      console.error('Preview retrieval error:', error)
      return createImportError('Failed to retrieve sync preview: ' + (error instanceof Error ? error.message : 'Unknown error'), 500)
    }

  } catch (error) {
    console.error('API error:', error)
    return createImportError('Internal server error', 500)
  }
}