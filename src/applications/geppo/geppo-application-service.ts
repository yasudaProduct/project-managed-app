import { injectable, inject } from 'inversify'
import type { IGeppoRepository } from './repositories/igeppo.repository'
import type { IProjectRepository } from '../projects/iproject-repository'
import type {
  GeppoSearchFilters,
  GeppoPaginationOptions,
  GeppoSearchResult,
} from '@/domains/geppo/types'
import { SYMBOL } from '@/types/symbol'
import { Project } from '@/types/project'
import { User } from '@/types/user'
import type { IUserRepository } from '../user/iuser-repositroy'

export interface IGeppoApplicationService {
  /**
   * 作業実績を検索
   */
  searchWorkEntries(
    filters: GeppoSearchFilters,
    pagination: GeppoPaginationOptions
  ): Promise<GeppoSearchResult>

  /**
   * フィルタ用の基本データを取得
   */
  getFilterOptions(): Promise<{
    projects: Project[]
    users: User[]
  }>

  /**
   * データベース接続状態を確認
   */
  checkConnection(): Promise<boolean>
}

@injectable()
export class GeppoApplicationService implements IGeppoApplicationService {
  constructor(
    @inject(SYMBOL.IGeppoRepository)
    private readonly geppoRepository: IGeppoRepository,
    @inject(SYMBOL.IProjectRepository)
    private readonly projectRepository: IProjectRepository,
    @inject(SYMBOL.IUserRepository)
    private readonly userRepository: IUserRepository
  ) { }

  async searchWorkEntries(
    filters: GeppoSearchFilters,
    pagination: GeppoPaginationOptions
  ): Promise<GeppoSearchResult> {
    try {
      // バリデーション
      this.validateSearchFilters(filters)
      this.validatePaginationOptions(pagination)

      return await this.geppoRepository.searchWorkEntries(filters, pagination)
    } catch (error) {
      console.error('Failed to search work entries:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('作業実績の検索に失敗しました')
    }
  }


  async getFilterOptions(): Promise<{
    projects: Project[]
    users: User[]
  }> {
    try {
      const projects = await this.projectRepository.findAll()

      const activeProjects = projects.filter(p => p.getStatus() === 'ACTIVE')

      // const users = await this.userRepository.findAll()

      return {
        projects: activeProjects.map(p => ({
          id: p.id!,
          name: p.name,
          status: p.getStatus(),
          description: p.description,
          startDate: p.startDate,
          endDate: p.endDate
        })),
        users: []
      }
    } catch (error) {
      console.error('Failed to get filter options:', error)
      throw new Error('フィルタオプションの取得に失敗しました')
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      return await this.geppoRepository.testConnection()
    } catch (error) {
      console.error('Database connection failed:', error)
      return false
    }
  }

  private validateSearchFilters(filters: GeppoSearchFilters): void {
    if (filters.dateFrom && filters.dateTo) {
      const dateFrom = filters.dateFrom instanceof Date ? filters.dateFrom : new Date(filters.dateFrom)
      const dateTo = filters.dateTo instanceof Date ? filters.dateTo : new Date(filters.dateTo)

      if (dateFrom > dateTo) {
        throw new Error('開始日は終了日より前の日付を指定してください')
      }

      // 検索期間の上限チェック（1年以内）
      const oneYearMs = 365 * 24 * 60 * 60 * 1000
      if (dateTo.getTime() - dateFrom.getTime() > oneYearMs) {
        throw new Error('検索期間は1年以内で指定してください')
      }
    }
  }

  private validatePaginationOptions(pagination: GeppoPaginationOptions): void {
    if (pagination.page < 1) {
      throw new Error('ページ番号は1以上で指定してください')
    }

    if (pagination.limit < 1 || pagination.limit > 1000) {
      throw new Error('取得件数は1〜1000件の範囲で指定してください')
    }
  }
}