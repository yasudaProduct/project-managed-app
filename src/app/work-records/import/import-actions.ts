'use server'

import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import type { IGeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service'
import type { GeppoImportOptions } from '@/domains/geppo-import/geppo-import-result'
import { ProjectMappingService } from '@/infrastructures/geppo-import/project-mapping.service'

/**
 * データベース接続状態を確認
 */
export async function checkGeppoConnection() {
  try {
    const geppoService = container.get<IGeppoImportApplicationService>(SYMBOL.IGeppoImportApplicationService)
    // 簡単な接続テストとして空のバリデーションを実行
    await geppoService.validateImportData({
      targetMonth: '2024-01',
      dryRun: true,
      updateMode: 'merge'
    })

    return {
      success: true,
      connected: true
    }
  } catch (error) {
    console.error('Connection test error:', error)
    return {
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    }
  }
}

/**
 * インポート可能プロジェクト一覧を取得
 */
export async function getAvailableProjectsForImport(targetMonth: string) {
  try {
    const projectMappingService = container.get<ProjectMappingService>(
      SYMBOL.ProjectMappingService
    )
    
    const availableProjects = await projectMappingService.getAvailableProjectsForImport(targetMonth)
    
    return {
      success: true,
      availableProjects
    }
  } catch (error) {
    console.error('Get available projects error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get available projects',
      availableProjects: []
    }
  }
}

/**
 * インポートデータのバリデーション
 */
export async function validateGeppoImport(options: GeppoImportOptions) {
  try {
    const importService = container.get<IGeppoImportApplicationService>(
      SYMBOL.IGeppoImportApplicationService
    )
    
    const validation = await importService.validateImportData(options)
    
    return {
      success: true,
      validation
    }
  } catch (error) {
    console.error('Validation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

/**
 * インポートプレビューを取得
 */
export async function getGeppoImportPreview(options: GeppoImportOptions) {
  try {
    const importService = container.get<IGeppoImportApplicationService>(
      SYMBOL.IGeppoImportApplicationService
    )
    
    const preview = await importService.getImportPreview(options)
    
    return {
      success: true,
      preview
    }
  } catch (error) {
    console.error('Preview error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Preview failed'
    }
  }
}

/**
 * インポート実行
 */
export async function executeGeppoImport(options: GeppoImportOptions) {
  try {
    const importService = container.get<IGeppoImportApplicationService>(
      SYMBOL.IGeppoImportApplicationService
    )
    
    const result = await importService.executeImport(options)
    
    return {
      success: true,
      result
    }
  } catch (error) {
    console.error('Import execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed'
    }
  }
}