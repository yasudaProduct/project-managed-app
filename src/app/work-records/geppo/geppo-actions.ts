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
 */
export async function searchGeppoWorkEntries(
  filters: GeppoSearchFilters,
  pagination: GeppoPaginationOptions
) {
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
      sortBy: 'yyyyMM',
      sortOrder: 'desc'
    }

    const result = await geppoService.searchWorkEntries(processedFilters, pagination)

    // CSVヘッダー
    const csvHeaders = [
      'ID',
      '作業日',
      'プロジェクトコード',
      'プロジェクト名',
      'ユーザーID',
      'ユーザー名（漢字）',
      'ユーザー名（カナ）',
      '開始時刻',
      '終了時刻',
      '休憩時間（分）',
      '作業時間',
      '作業内容',
      'タスクカテゴリ',
      '登録日時',
      '更新日時'
    ]

    // CSVデータの生成
    const csvRows = result.geppos.map(entry => [
      entry.id,
      new Date(entry.yyyyMM).toLocaleDateString('ja-JP'),
      entry.projectName,
      entry.projectName,
      entry.userId,
      entry.taskName,
      entry.wbsId,
      entry.biko,
      entry.status,
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