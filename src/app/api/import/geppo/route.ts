import { NextRequest } from 'next/server'
import { 
  createImportResponse, 
  createImportError,
  createApiResponse,
  validateRequiredFields
} from '@/lib/api-response'
import { 
  validateGeppoImport, 
  executeGeppoImport,
  getAvailableProjectsForImport
} from '@/app/actions/geppo-import'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 必須フィールドのバリデーション
    const requiredFields = ['targetMonth']
    const validationErrors = validateRequiredFields(body, requiredFields)
    
    if (validationErrors.length > 0) {
      return createImportError(
        'Validation failed: ' + validationErrors.join(', '),
        400
      )
    }

    const { 
      targetMonth, 
      targetProjectNames, 
      updateMode = 'replace',
      dryRun = false,
      skipValidation = false
    } = body

    // 対象月の形式チェック
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return createImportError('Invalid targetMonth format. Expected YYYY-MM', 400)
    }

    const startTime = Date.now()

    // バリデーション実行（skipValidationがfalseの場合のみ）
    if (!skipValidation) {
      try {
        const validation = await validateGeppoImport({
          targetMonth,
          updateMode,
          targetProjectNames,
          dryRun: false
        })

        if (!validation.isValid && !dryRun) {
          return createImportError(
            'Validation failed: ' + validation.errors.join(', '),
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
      const result = await executeGeppoImport({
        targetMonth,
        updateMode,
        targetProjectNames,
        dryRun
      })

      const executionTime = Date.now() - startTime

      return createImportResponse({
        successCount: result.successCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        errorCount: result.errorCount,
        errors: result.errors.map(error => ({
          recordId: `${error.memberId} - ${error.date?.toLocaleDateString()}`,
          message: error.message,
          details: {
            memberId: error.memberId,
            date: error.date,
            originalError: error
          }
        })),
        executionTime
      }, dryRun ? 'Dry run completed successfully' : 'Import completed successfully')

    } catch (error) {
      console.error('Import execution error:', error)
      return createImportError('Import execution failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 500)
    }

  } catch (error) {
    console.error('API error:', error)
    return createImportError('Internal server error', 500)
  }
}

// プロジェクト一覧取得のGETエンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetMonth = searchParams.get('targetMonth')

    if (!targetMonth) {
      return createImportError('targetMonth parameter is required', 400)
    }

    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return createImportError('Invalid targetMonth format. Expected YYYY-MM', 400)
    }

    try {
      const projects = await getAvailableProjectsForImport(targetMonth)
      
      return createApiResponse({
        projects: projects.map(project => ({
          projectId: project.projectId,
          projectName: project.projectName,
          geppoProjectIds: project.geppoProjectIds,
          recordCount: project.recordCount,
          userCount: project.userCount,
          mappingStatus: project.mappingStatus
        }))
      }, 'Projects retrieved successfully')

    } catch (error) {
      console.error('Project retrieval error:', error)
      return createImportError('Failed to retrieve projects: ' + (error instanceof Error ? error.message : 'Unknown error'), 500)
    }

  } catch (error) {
    console.error('API error:', error)
    return createImportError('Internal server error', 500)
  }
}