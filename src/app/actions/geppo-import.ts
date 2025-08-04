'use server'

import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import { IGeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service'
import { ProjectMappingService } from '@/infrastructures/geppo-import/project-mapping.service'
import { 
  GeppoImportOptions, 
  GeppoImportResult, 
  GeppoImportValidation, 
  GeppoImportPreview,
  ProjectImportOption
} from '@/domains/geppo-import/geppo-import-result'

export async function validateGeppoImport(options: GeppoImportOptions): Promise<GeppoImportValidation> {
  try {
    const service = container.get<IGeppoImportApplicationService>(SYMBOL.IGeppoImportApplicationService)
    return await service.validateImportData(options)
  } catch (error) {
    console.error('Failed to validate geppo import:', error)
    throw new Error('バリデーションに失敗しました')
  }
}

export async function executeGeppoImport(options: GeppoImportOptions): Promise<GeppoImportResult> {
  try {
    const service = container.get<IGeppoImportApplicationService>(SYMBOL.IGeppoImportApplicationService)
    return await service.executeImport(options)
  } catch (error) {
    console.error('Failed to execute geppo import:', error)
    throw new Error('インポート実行に失敗しました')
  }
}

export async function previewGeppoImport(options: GeppoImportOptions): Promise<GeppoImportPreview> {
  try {
    const service = container.get<IGeppoImportApplicationService>(SYMBOL.IGeppoImportApplicationService)
    return await service.getImportPreview(options)
  } catch (error) {
    console.error('Failed to get geppo import preview:', error)
    throw new Error('プレビュー取得に失敗しました')
  }
}

export async function getAvailableProjectsForImport(targetMonth: string): Promise<ProjectImportOption[]> {
  try {
    const service = container.get<ProjectMappingService>(SYMBOL.ProjectMappingService)
    return await service.getAvailableProjectsForImport(targetMonth)
  } catch (error) {
    console.error('Failed to get available projects:', error)
    throw new Error('プロジェクト取得に失敗しました')
  }
}