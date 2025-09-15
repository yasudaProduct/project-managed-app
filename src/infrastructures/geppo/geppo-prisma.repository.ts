import { injectable } from 'inversify'
import { geppoPrisma } from '@/lib/prisma/geppo'
import type { IGeppoRepository } from '@/applications/geppo/repositories/igeppo.repository'
import type { GeppoSearchFilters, GeppoPaginationOptions, GeppoSearchResult } from '@/domains/geppo/types'

@injectable()
export class GeppoPrismaRepository implements IGeppoRepository {

  async testConnection(): Promise<boolean> {
    try {
      await geppoPrisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('Geppo database connection test failed:', error)
      return false
    }
  }

  /**
   * 作業実績を検索
   * @param filters 検索条件
   * @param pagination ページネーション
   * @returns 検索結果
   */
  async searchWorkEntries(
    filters: GeppoSearchFilters,
    pagination: GeppoPaginationOptions
  ): Promise<GeppoSearchResult> {
    console.log("-------------------------")
    console.log(filters)
    try {
      // WHERE条件の構築
      const where: Record<string, unknown> = {}

      if (filters.PROJECT_ID) {
        where.PROJECT_ID = filters.PROJECT_ID
      }

      if (filters.MEMBER_ID) {
        where.MEMBER_ID = filters.MEMBER_ID
      }

      if (filters.dateFrom || filters.dateTo) {
        const dateFilter: { gte?: string; lte?: string } = {}
        if (filters.dateFrom) {
          const fromStr = filters.dateFrom instanceof Date
            ? filters.dateFrom.toISOString().slice(0, 7).replace('-', '')
            : filters.dateFrom.toString().replace('-', '')
          dateFilter.gte = fromStr
        }
        if (filters.dateTo) {
          const toStr = filters.dateTo instanceof Date
            ? filters.dateTo.toISOString().slice(0, 7).replace('-', '')
            : filters.dateTo.toString().replace('-', '')
          dateFilter.lte = toStr
        }
        where.GEPPO_YYYYMM = dateFilter
      }

      // ソート条件の構築
      const orderBy: Record<string, string> = {}
      const sortBy = pagination.sortBy || 'GEPPO_YYYYMM'
      const sortOrder = pagination.sortOrder || 'desc'

      switch (sortBy) {
        case 'GEPPO_YYYYMM':
          orderBy.GEPPO_YYYYMM = sortOrder
          break
        case 'PROJECT_ID':
          orderBy.PROJECT_ID = sortOrder
          break
        case 'MEMBER_ID':
          orderBy.MEMBER_ID = sortOrder
          break
        default:
          orderBy.GEPPO_YYYYMM = sortOrder
      }

      // 総件数の取得
      const total = await geppoPrisma.geppo.count({ where })

      // データの取得
      const skip = (pagination.page - 1) * pagination.limit
      const geppos = await geppoPrisma.geppo.findMany({
        where,
        orderBy,
        skip,
        take: pagination.limit
      })

      const totalPages = Math.ceil(total / pagination.limit)

      return {
        geppos: geppos.map(g => ({
          MEMBER_ID: g.MEMBER_ID || '',
          GEPPO_YYYYMM: g.GEPPO_YYYYMM || '',
          ROW_NO: g.ROW_NO || 0,
          COMPANY_NAME: g.COMPANY_NAME || '',
          MEMBER_NAME: g.MEMBER_NAME || '',
          PROJECT_ID: g.PROJECT_ID || '',
          PROJECT_SUB_ID: g.PROJECT_SUB_ID || '',
          WBS_NO: g.WBS_NO || '',
          WBS_NAME: g.WBS_NAME || '',
          WORK_NAME: g.WORK_NAME || '',
          WORK_STATUS: g.WORK_STATUS || '',
          day01: g.DAY01 || 0,
          day02: g.DAY02 || 0,
          day03: g.DAY03 || 0,
          day04: g.DAY04 || 0,
          day05: g.DAY05 || 0,
          day06: g.DAY06 || 0,
          day07: g.DAY07 || 0,
          day08: g.DAY08 || 0,
          day09: g.DAY09 || 0,
          day10: g.DAY10 || 0,
          day11: g.DAY11 || 0,
          day12: g.DAY12 || 0,
          day13: g.DAY13 || 0,
          day14: g.DAY14 || 0,
          day15: g.DAY15 || 0,
          day16: g.DAY16 || 0,
          day17: g.DAY17 || 0,
          day18: g.DAY18 || 0,
          day19: g.DAY19 || 0,
          day20: g.DAY20 || 0,
          day21: g.DAY21 || 0,
          day22: g.DAY22 || 0,
          day23: g.DAY23 || 0,
          day24: g.DAY24 || 0,
          day25: g.DAY25 || 0,
          day26: g.DAY26 || 0,
          day27: g.DAY27 || 0,
          day28: g.DAY28 || 0,
          day29: g.DAY29 || 0,
          day30: g.DAY30 || 0,
          day31: g.DAY31 || 0
        })),
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1
      }

    } catch (error) {
      console.error('Failed to search work entries:', error)
      throw new Error('作業実績の検索に失敗しました')
    }
  }
}