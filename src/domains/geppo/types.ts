// Geppo月報システムのドメインタイプ定義

export interface Geppo {
  id: number
  userId: string
  projectName: string
  yyyyMM: string
  taskName: string
  wbsId: string
  biko: string
  status: string
  day01: number
  day02: number
  day03: number
  day04: number
  day05: number
  day06: number
  day07: number
  day08: number
  day09: number
  day10: number
  day11: number
  day12: number
  day13: number
  day14: number
  day15: number
  day16: number
  day17: number
  day18: number
  day19: number
  day20: number
  day21: number
  day22: number
  day23: number
  day24: number
  day25: number
  day26: number
  day27: number
  day28: number
  day29: number
  day30: number
  day31: number
}

// export interface GeppoProject {
//   projectCode: string
//   projectName: string
//   isActive: boolean
//   description?: string
// }

// export interface GeppoUser {
//   userId: string
//   userKanji: string
//   userKana: string
//   email?: string
//   department?: string
//   isActive: boolean
// }

export interface GeppoSearchFilters {
  projectName?: string
  userId?: string
  dateFrom?: Date | string
  dateTo?: Date | string
}

export interface GeppoPaginationOptions {
  page: number
  limit: number
  sortBy?: keyof Geppo
  sortOrder?: 'asc' | 'desc'
}

export interface GeppoSearchResult {
  geppos: Geppo[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// export interface GeppoSummary {
//   projectCode: string
//   projectName: string
//   totalUsers: number
//   totalWorkDays: number
//   totalWorkHours: number
//   averageWorkHours: number
//   period: {
//     from: Date
//     to: Date
//   }
// }