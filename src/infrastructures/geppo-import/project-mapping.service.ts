import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import { Geppo } from '@/domains/geppo/types'
import { ProjectImportOption, ProjectMappingValidation } from '@/domains/geppo-import/geppo-import-result'
import type { IGeppoRepository } from '@/applications/geppo/repositories/igeppo.repository'
import type { IProjectRepository } from '@/applications/projects/iproject-repository'

@injectable()
export class ProjectMappingService {
  constructor(
    @inject(SYMBOL.IProjectRepository) private projectRepository: IProjectRepository,
    @inject(SYMBOL.IGeppoRepository) private geppoRepository: IGeppoRepository
  ) { }

  async createProjectMap(geppoProjectIds: string[]): Promise<Map<string, string>> {
    const projectMap = new Map<string, string>()

    try {
      // 1. 既存プロジェクトを取得
      const existingProjects = await this.projectRepository.findAll()

      // 2. geppo.PROJECT_ID と projects.name でマッピング
      for (const geppoProjectId of geppoProjectIds) {
        const matchedProject = existingProjects.find(p =>
          p.name === geppoProjectId ||           // 完全一致
          p.name.includes(geppoProjectId) ||     // 部分一致
          geppoProjectId.includes(p.name)        // 逆部分一致
        )

        if (matchedProject) {
          projectMap.set(geppoProjectId, matchedProject.id!)
        } else {
          // プロジェクトが見つからない場合のログ
          console.warn(`Project mapping not found: ${geppoProjectId}`)
        }
      }

      return projectMap
    } catch (error) {
      console.error('Failed to create project map:', error)
      throw new Error('プロジェクトマッピングの作成に失敗しました')
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
      // 1. 対象プロジェクト名に対応するGeppo PROJECT_IDを特定
      const existingProjects = await this.projectRepository.findAll()
      const targetProjects = existingProjects.filter(p =>
        targetProjectNames.includes(p.name)
      )

      if (targetProjects.length === 0) {
        console.warn('No matching projects found for target project names:', targetProjectNames)
        return []
      }

      // 2. projects.name → geppo.PROJECT_ID の逆マッピングを作成
      const targetGeppoProjectIds = new Set<string>()

      for (const project of targetProjects) {
        // projects.name に対応する geppo.PROJECT_ID を検索
        const matchingGeppoProjectIds = geppoRecords
          .map(g => g.PROJECT_ID)
          .filter(Boolean)
          .filter(geppoProjectId =>
            project.name === geppoProjectId ||           // 完全一致
            project.name.includes(geppoProjectId!) ||    // 部分一致
            geppoProjectId!.includes(project.name)       // 逆部分一致
          )

        matchingGeppoProjectIds.forEach(id => targetGeppoProjectIds.add(id!))
      }

      // 3. 対象PROJECT_IDでフィルタリング
      return geppoRecords.filter(record =>
        record.PROJECT_ID && targetGeppoProjectIds.has(record.PROJECT_ID)
      )
    } catch (error) {
      console.error('Failed to filter geppo by target projects:', error)
      throw new Error('プロジェクトフィルタリングに失敗しました')
    }
  }

  async getAvailableProjectsForImport(targetMonth: string): Promise<ProjectImportOption[]> {
    try {
      // 1. 対象月のGeppoデータからプロジェクトを取得
      const geppoRecords = await this.geppoRepository.searchWorkEntries(
        { dateFrom: new Date(`${targetMonth}-01`), dateTo: new Date(`${targetMonth}-31`) },
        { page: 1, limit: 10000 }
      )

      const uniqueGeppoProjectIds = [...new Set(geppoRecords.geppos.map(g => g.PROJECT_ID).filter(Boolean))]

      // 2. マッピング可能なプロジェクトを特定
      const existingProjects = await this.projectRepository.findAll()

      // 3. インポート可能なプロジェクト一覧を作成
      const availableProjects: ProjectImportOption[] = []

      for (const project of existingProjects) {
        // このプロジェクトに対応するGeppoデータがあるかチェック
        const relatedGeppoProjectIds = uniqueGeppoProjectIds.filter(geppoProjectId =>
          project.name === geppoProjectId ||
          project.name.includes(geppoProjectId ?? '') ||
          geppoProjectId?.includes(project.name ?? '')
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
            projectId: project.id ?? '',
            projectName: project.name ?? '',
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
      throw new Error('インポート可能プロジェクトの取得に失敗しました')
    }
  }

  async validateProjectMapping(geppoRecords: Geppo[]): Promise<ProjectMappingValidation> {
    try {
      const uniqueProjectIds = [...new Set(geppoRecords.map(g => g.PROJECT_ID).filter(Boolean))]
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
      throw new Error('プロジェクトマッピング検証に失敗しました')
    }
  }
}