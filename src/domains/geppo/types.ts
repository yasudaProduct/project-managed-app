// Geppo月報システムのドメインタイプ定義

export interface Geppo {
  MEMBER_ID: string
  GEPPO_YYYYMM: string
  ROW_NO: number
  COMPANY_NAME?: string
  MEMBER_NAME?: string
  PROJECT_ID?: string
  PROJECT_SUB_ID?: string
  WBS_NO?: string
  WBS_NAME?: string
  WORK_NAME?: string
  WORK_STATUS?: string
  day01?: number
  day02?: number
  day03?: number
  day04?: number
  day05?: number
  day06?: number
  day07?: number
  day08?: number
  day09?: number
  day10?: number
  day11?: number
  day12?: number
  day13?: number
  day14?: number
  day15?: number
  day16?: number
  day17?: number
  day18?: number
  day19?: number
  day20?: number
  day21?: number
  day22?: number
  day23?: number
  day24?: number
  day25?: number
  day26?: number
  day27?: number
  day28?: number
  day29?: number
  day30?: number
  day31?: number
}

export interface GeppoSearchFilters {
  PROJECT_ID?: string
  MEMBER_ID?: string
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