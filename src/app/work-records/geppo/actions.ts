'use server'

import { container } from '@/lib/inversify.config'
import { SYMBOL } from '@/types/symbol'
import type { IGeppoApplicationService } from '@/applications/geppo/geppo-application-service'
import type { GeppoSearchFilters, GeppoPaginationOptions } from '@/domains/geppo/types'

/**
 * データベース接続状態を確認
 */
export async function checkGeppoConnection() {
  try {
    const geppoService = container.get<IGeppoApplicationService>(SYMBOL.IGeppoApplicationService)
    const connected = await geppoService.checkConnection()

    return {
      success: true,
      connected
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
 * フィルタオプションを取得
 */
export async function getGeppoFilterOptions() {
  try {
    const geppoService = container.get<IGeppoApplicationService>(SYMBOL.IGeppoApplicationService)
    const filterOptions = await geppoService.getFilterOptions()

    return {
      success: true,
      filterOptions
    }
  } catch (error) {
    console.error('Filter options error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get filter options',
      filterOptions: {
        projects: [],
        users: [],
        departments: [],
        taskCategories: []
      }
    }
  }
}

/**
 * 作業実績を検索
 * @param filters 検索条件
 * @param pagination ページネーション
 * @returns 検索結果
 */
export async function searchGeppoWorkEntries(
  filters: GeppoSearchFilters,
  pagination: GeppoPaginationOptions
) {
  // TODO: queryへ移行する
  try {
    const geppoService = container.get<IGeppoApplicationService>(SYMBOL.IGeppoApplicationService)

    // 日付文字列をDateオブジェクトに変換
    const processedFilters: GeppoSearchFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom as string) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo as string) : undefined
    }

    const result = await geppoService.searchWorkEntries(processedFilters, pagination)

    return {
      success: true,
      result
    }
  } catch (error) {
    console.error('Work entries search error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
      result: {
        geppos: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }
    }
  }
}