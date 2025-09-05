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

/**
 * CSVエクスポート用のデータを取得
 */
export async function exportGeppoToCsv(filters: GeppoSearchFilters) {
  try {
    const geppoService = container.get<IGeppoApplicationService>(SYMBOL.IGeppoApplicationService)

    // 日付文字列をDateオブジェクトに変換
    const processedFilters: GeppoSearchFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom as string) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo as string) : undefined
    }

    // 全データを取得（ページネーションなし）
    const pagination: GeppoPaginationOptions = {
      page: 1,
      limit: 10000,
      sortBy: 'GEPPO_YYYYMM',
      sortOrder: 'desc'
    }

    const result = await geppoService.searchWorkEntries(processedFilters, pagination)

    // CSVヘッダー
    const csvHeaders = [
      'ID',
      '年月',
      'プロジェクトID',
      '会社名',
      'メンバーID',
      'メンバー名',
      'プロジェクトサブID',
      'WBS番号',
      'WBS名',
      '作業名',
      '作業ステータス',
      '1日', '2日', '3日', '4日', '5日', '6日', '7日', '8日', '9日', '10日',
      '11日', '12日', '13日', '14日', '15日', '16日', '17日', '18日', '19日', '20日',
      '21日', '22日', '23日', '24日', '25日', '26日', '27日', '28日', '29日', '30日', '31日'
    ]

    // CSVデータの生成
    const csvRows = result.geppos.map(entry => [
      `${entry.MEMBER_ID}-${entry.GEPPO_YYYYMM}-${entry.ROW_NO}`,
      entry.GEPPO_YYYYMM,
      entry.PROJECT_ID,
      entry.COMPANY_NAME,
      entry.MEMBER_ID,
      entry.MEMBER_NAME,
      entry.PROJECT_SUB_ID,
      entry.WBS_NO,
      entry.WBS_NAME,
      entry.WORK_NAME,
      entry.WORK_STATUS,
      entry.day01,
      entry.day02,
      entry.day03,
      entry.day04,
      entry.day05,
      entry.day06,
      entry.day07,
      entry.day08,
      entry.day09,
      entry.day10,
      entry.day11,
      entry.day12,
      entry.day13,
      entry.day14,
      entry.day15,
      entry.day16,
      entry.day17,
      entry.day18,
      entry.day19,
      entry.day20,
      entry.day21,
      entry.day22,
      entry.day23,
      entry.day24,
      entry.day25,
      entry.day26,
      entry.day27,
      entry.day28,
      entry.day29,
      entry.day30,
      entry.day31
    ])

    // CSV文字列の生成
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    // BOMを追加（Excel対応）
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    return {
      success: true,
      csvContent: csvWithBom,
      filename: `geppo_export_${new Date().toISOString().split('T')[0]}.csv`
    }
  } catch (error) {
    console.error('CSV export error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    }
  }
}