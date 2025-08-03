import type {
  GeppoSearchFilters,
  GeppoPaginationOptions,
  GeppoSearchResult,
} from '@/domains/geppo/types'

export interface IGeppoRepository {
  /**
   * 作業実績をフィルタ条件で検索
   */
  searchWorkEntries(
    filters: GeppoSearchFilters,
    pagination: GeppoPaginationOptions
  ): Promise<GeppoSearchResult>

  /**
   * プロジェクト一覧を取得
   */
  // getProjects(): Promise<GeppoProject[]>

  /**
   * アクティブなプロジェクト一覧を取得
   */
  // getActiveProjects(): Promise<GeppoProject[]>

  /**
   * ユーザー一覧を取得
   */
  // getUsers(): Promise<GeppoUser[]>

  // /**
  //  * プロジェクトのサマリ情報を取得
  //  */
  // getProjectSummary(
  //   projectCode: string,
  //   dateFrom?: Date,
  //   dateTo?: Date
  // ): Promise<GeppoSummary | null>

  // /**
  //  * 部署一覧を取得
  //  */
  // getDepartments(): Promise<string[]>

  // /**
  //  * タスクカテゴリ一覧を取得
  //  */
  // getTaskCategories(): Promise<string[]>

  // /**
  //  * 特定のプロジェクトの作業実績を取得
  //  */
  // getWorkEntriesByProject(
  //   projectCode: string,
  //   dateFrom?: Date,
  //   dateTo?: Date,
  //   pagination?: GeppoPaginationOptions
  // ): Promise<GeppoSearchResult>

  // /**
  //  * 特定ユーザーの作業実績を取得
  //  */
  // getWorkEntriesByUser(
  //   userId: string,
  //   dateFrom?: Date,
  //   dateTo?: Date,
  //   pagination?: GeppoPaginationOptions
  // ): Promise<GeppoSearchResult>

  /**
   * データベース接続テスト
   */
  testConnection(): Promise<boolean>
}