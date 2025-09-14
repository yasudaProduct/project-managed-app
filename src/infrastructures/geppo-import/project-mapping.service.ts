import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import { Geppo } from '@/domains/geppo/types'
import { ProjectImportOption, ProjectMappingValidation } from '@/domains/geppo-import/geppo-import-result'
import type { IGeppoRepository } from '@/applications/geppo/repositories/igeppo.repository'
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository'

@injectable()
export class ProjectMappingService {
  constructor(
    @inject(SYMBOL.IWbsRepository) private wbsRepository: IWbsRepository,
    @inject(SYMBOL.IGeppoRepository) private geppoRepository: IGeppoRepository
  ) { }

  async createProjectMap(geppoProjectIds: string[]): Promise<Map<string, string>> {
    const projectMap = new Map<string, string>()

    try {
      // 1. 既存WBSを取得
      const existingWbsList = await this.wbsRepository.findAll()

      // 2. geppo.PROJECT_ID と wbs.name を完全一致でマッピング
      for (const geppoProjectId of geppoProjectIds) {
        const matchedWbs = existingWbsList.find(w => w.name === geppoProjectId)

        if (matchedWbs) {
          projectMap.set(geppoProjectId, String(matchedWbs.id!))
        } else {
          // WBSが見つからない場合のログ
          console.warn(`WBS mapping not found for Geppo PROJECT_ID: ${geppoProjectId}`)
        }
      }

      return projectMap
    } catch (error) {
      console.error('Failed to create project map:', error)
      throw new Error('WBSマッピングの作成に失敗しました')
    }
  }

  async filterGeppoByTargetProjects(
    geppoRecords: Geppo[],
    targetProjectNames?: string[]
  ): Promise<Geppo[]> {
    if (!targetProjectNames || targetProjectNames.length === 0) {
      // 対象プロジェクトが指定されていない場合は全件返す
      return geppoRecords
    }

    try {
      // 対象名 = WBS名として扱い、Geppo.PROJECT_ID の完全一致でフィルタ
      const targetSet = new Set(targetProjectNames)
      return geppoRecords.filter(record => record.PROJECT_ID && targetSet.has(record.PROJECT_ID))
    } catch (error) {
      console.error('Failed to filter geppo by target projects:', error)
      throw new Error('WBS名によるフィルタリングに失敗しました')
    }
  }

  /**
   * インポート可能プロジェクト一覧を取得
   * @param targetMonth 
   * @returns インポート可能プロジェクト一覧
   */
  async getAvailableProjectsForImport(targetMonth: string): Promise<ProjectImportOption[]> {
    try {
      // 1. 対象月のGeppoデータからプロジェクトを取得
      const geppoRecords = await this.geppoRepository.searchWorkEntries(
        {
          dateFrom: new Date(`${targetMonth}-01`),
          dateTo: new Date(`${targetMonth}-31`)
        },
        { page: 1, limit: 10000 }
      )

      const uniqueGeppoProjectIds = [...new Set(geppoRecords.geppos.map(g => g.PROJECT_ID).filter(Boolean))]

      // 2. マッピング可能なWBSを特定（wbs.name === Geppo.PROJECT_ID）
      const existingWbsList = await this.wbsRepository.findAll()

      // 3. インポート可能なWBS一覧を作成
      const availableProjects: ProjectImportOption[] = []

      for (const wbs of existingWbsList) {
        // このWBSに対応するGeppoデータがあるかチェック（完全一致）
        const relatedGeppoProjectIds = uniqueGeppoProjectIds.filter(geppoProjectId =>
          wbs.name === geppoProjectId
        )

        if (relatedGeppoProjectIds.length > 0) {
          const recordCount = geppoRecords.geppos.filter(g =>
            g.PROJECT_ID && relatedGeppoProjectIds.includes(g.PROJECT_ID)
          ).length

          const userCount = new Set(
            geppoRecords.geppos
              .filter(g => g.PROJECT_ID && relatedGeppoProjectIds.includes(g.PROJECT_ID))
              .map(g => g.MEMBER_ID)
          ).size

          availableProjects.push({
            projectId: String(wbs.id ?? ''),
            projectName: wbs.name ?? '',
            geppoProjectIds: relatedGeppoProjectIds.filter(id => id !== undefined) as string[],
            recordCount,
            userCount,
            mappingStatus: 'mapped'
          })
        }
      }

      return availableProjects
    } catch (error) {
      console.error('Failed to get available projects for import:', error)
      throw new Error('インポート可能WBSの取得に失敗しました')
    }
  }

  async validateProjectMapping(geppoRecords: Geppo[]): Promise<ProjectMappingValidation> {
    try {
      const uniqueProjectIds = [...new Set(geppoRecords.map(g => g.PROJECT_ID).filter(Boolean))] as string[]
      const projectMap = await this.createProjectMap(uniqueProjectIds)

      const mappedProjects = uniqueProjectIds.filter(id => projectMap.has(id))
      const unmappedProjects = uniqueProjectIds.filter(id => !projectMap.has(id))

      return {
        totalProjects: uniqueProjectIds.length,
        mappedCount: mappedProjects.length,
        unmappedCount: unmappedProjects.length,
        mappedProjects,
        unmappedProjects,
        mappingRate: uniqueProjectIds.length > 0 ? mappedProjects.length / uniqueProjectIds.length : 0
      }
    } catch (error) {
      console.error('Failed to validate project mapping:', error)
      throw new Error('WBSマッピング検証に失敗しました')
    }
  }
}