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
   * データベース接続テスト
   */
  testConnection(): Promise<boolean>
}