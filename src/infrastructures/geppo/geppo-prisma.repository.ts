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

  async searchWorkEntries(
    filters: GeppoSearchFilters,
    pagination: GeppoPaginationOptions
  ): Promise<GeppoSearchResult> {
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
          day01: g.day01 || 0,
          day02: g.day02 || 0,
          day03: g.day03 || 0,
          day04: g.day04 || 0,
          day05: g.day05 || 0,
          day06: g.day06 || 0,
          day07: g.day07 || 0,
          day08: g.day08 || 0,
          day09: g.day09 || 0,
          day10: g.day10 || 0,
          day11: g.day11 || 0,
          day12: g.day12 || 0,
          day13: g.day13 || 0,
          day14: g.day14 || 0,
          day15: g.day15 || 0,
          day16: g.day16 || 0,
          day17: g.day17 || 0,
          day18: g.day18 || 0,
          day19: g.day19 || 0,
          day20: g.day20 || 0,
          day21: g.day21 || 0,
          day22: g.day22 || 0,
          day23: g.day23 || 0,
          day24: g.day24 || 0,
          day25: g.day25 || 0,
          day26: g.day26 || 0,
          day27: g.day27 || 0,
          day28: g.day28 || 0,
          day29: g.day29 || 0,
          day30: g.day30 || 0,
          day31: g.day31 || 0
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

  //   async getProjects(): Promise<GeppoProject[]> {
  //     try {
  //       const projects = await geppoPrisma.projects.findMany({
  //         orderBy: {
  //           projectCode: 'asc'
  //         }
  //       })

  //       return projects.map(project => ({
  //         projectCode: project.projectCode,
  //         projectName: project.projectName,
  //         isActive: project.isActive,
  //         description: project.description || undefined
  //       }))

  //     } catch (error) {
  //       console.error('Failed to get projects:', error)
  //       throw new Error('プロジェクト一覧の取得に失敗しました')
  //     }
  //   }

  //   async getActiveProjects(): Promise<GeppoProject[]> {
  //     try {
  //       const projects = await geppoPrisma.projects.findMany({
  //         where: {
  //           isActive: true
  //         },
  //         orderBy: {
  //           projectCode: 'asc'
  //         }
  //       })

  //       return projects.map(project => ({
  //         projectCode: project.projectCode,
  //         projectName: project.projectName,
  //         isActive: project.isActive,
  //         description: project.description || undefined
  //       }))

  //     } catch (error) {
  //       console.error('Failed to get active projects:', error)
  //       throw new Error('アクティブプロジェクト一覧の取得に失敗しました')
  //     }
  //   }

  //   async getUsers(): Promise<GeppoUser[]> {
  //     try {
  //       const users = await geppoPrisma.users.findMany({
  //         where: {
  //           isActive: true
  //         },
  //         orderBy: {
  //           userId: 'asc'
  //         }
  //       })

  //       return users.map(user => ({
  //         userId: user.userId,
  //         userKanji: user.userKanji,
  //         userKana: user.userKana,
  //         email: user.email || undefined,
  //         department: user.department || undefined,
  //         isActive: user.isActive
  //       }))

  //     } catch (error) {
  //       console.error('Failed to get users:', error)
  //       throw new Error('ユーザー一覧の取得に失敗しました')
  //     }
  //   }

  //   async getProjectSummary(
  //     projectCode: string,
  //     dateFrom?: Date,
  //     dateTo?: Date
  //   ): Promise<GeppoSummary | null> {
  //     try {
  //       const where: Record<string, unknown> = {
  //         projectCode
  //       }

  //       if (dateFrom || dateTo) {
  //         where.workDate = {}
  //         if (dateFrom) {
  //           where.workDate.gte = dateFrom
  //         }
  //         if (dateTo) {
  //           where.workDate.lte = dateTo
  //         }
  //       }

  //       const [summary, project] = await Promise.all([
  //         geppoPrisma.workEntries.aggregate({
  //           where,
  //           _count: {
  //             userId: true,
  //             workDate: true
  //           },
  //           _sum: {
  //             workHours: true
  //           },
  //           _avg: {
  //             workHours: true
  //           },
  //           _min: {
  //             workDate: true
  //           },
  //           _max: {
  //             workDate: true
  //           }
  //         }),
  //         geppoPrisma.projects.findUnique({
  //           where: { projectCode }
  //         })
  //       ])

  //       if (!project) {
  //         return null
  //       }

  //       // 重複除去のため、distinct countを取得
  //       const distinctUsers = await geppoPrisma.workEntries.findMany({
  //         where,
  //         select: {
  //           userId: true
  //         },
  //         distinct: ['userId']
  //       })

  //       const distinctWorkDays = await geppoPrisma.workEntries.findMany({
  //         where,
  //         select: {
  //           workDate: true
  //         },
  //         distinct: ['workDate']
  //       })

  //       return {
  //         projectCode,
  //         projectName: project.projectName,
  //         totalUsers: distinctUsers.length,
  //         totalWorkDays: distinctWorkDays.length,
  //         totalWorkHours: Number(summary._sum.workHours || 0),
  //         averageWorkHours: Number(summary._avg.workHours || 0),
  //         period: {
  //           from: dateFrom || summary._min.workDate || new Date(),
  //           to: dateTo || summary._max.workDate || new Date()
  //         }
  //       }

  //     } catch (error) {
  //       console.error('Failed to get project summary:', error)
  //       throw new Error('プロジェクトサマリの取得に失敗しました')
  //     }
  //   }

  //   async getDepartments(): Promise<string[]> {
  //     try {
  //       const result = await geppoPrisma.users.findMany({
  //         where: {
  //           department: {
  //             not: null
  //           }
  //         },
  //         select: {
  //           department: true
  //         },
  //         distinct: ['department']
  //       })

  //       return result
  //         .map(r => r.department)
  //         .filter((dept): dept is string => dept !== null)
  //         .sort()

  //     } catch (error) {
  //       console.error('Failed to get departments:', error)
  //       throw new Error('部署一覧の取得に失敗しました')
  //     }
  //   }

  //   async getTaskCategories(): Promise<string[]> {
  //     try {
  //       const result = await geppoPrisma.workEntries.findMany({
  //         where: {
  //           taskCategory: {
  //             not: null
  //           }
  //         },
  //         select: {
  //           taskCategory: true
  //         },
  //         distinct: ['taskCategory']
  //       })

  //       return result
  //         .map(r => r.taskCategory)
  //         .filter((category): category is string => category !== null && category !== '')
  //         .sort()

  //     } catch (error) {
  //       console.error('Failed to get task categories:', error)
  //       throw new Error('タスクカテゴリ一覧の取得に失敗しました')
  //     }
  //   }

  //   async getWorkEntriesByProject(
  //     projectCode: string,
  //     dateFrom?: Date,
  //     dateTo?: Date,
  //     pagination?: GeppoPaginationOptions
  //   ): Promise<GeppoSearchResult> {
  //     const filters: GeppoSearchFilters = { projectName: projectCode, dateFrom, dateTo }
  //     const paginationOptions: GeppoPaginationOptions = pagination || { page: 1, limit: 50 }

  //     return this.searchWorkEntries(filters, paginationOptions)
  //   }

  //   async getWorkEntriesByUser(
  //     userId: string,
  //     dateFrom?: Date,
  //     dateTo?: Date,
  //     pagination?: GeppoPaginationOptions
  //   ): Promise<GeppoSearchResult> {
  //     const filters: GeppoSearchFilters = { userId, dateFrom, dateTo }
  //     const paginationOptions: GeppoPaginationOptions = pagination || { page: 1, limit: 50 }

  //     return this.searchWorkEntries(filters, paginationOptions)
  //   }
}