import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import { WorkRecord } from '@/domains/work-record/work-record'
import {
  GeppoImportOptions,
  GeppoImportResult,
  GeppoImportValidation,
  GeppoImportRecord,
  GeppoImportError,
  ProjectMappingValidation
} from '@/domains/geppo-import/geppo-import-result'
import type { IGeppoRepository } from '@/applications/geppo/repositories/igeppo-repository'
import type { IWorkRecordApplicationService } from '@/applications/work-record/work-record-application-service'
import type { IProjectMappingService } from '@/applications/geppo-import/iproject-mapping-service'
import type { IUserMappingService } from '@/applications/geppo-import/iuser-mapping-service'
import type { ITaskMappingService, TaskMappingEntry } from '@/applications/geppo-import/itask-mapping-service'
import { buildTaskMapKey } from '@/applications/geppo-import/itask-mapping-service'
import { Geppo, GeppoSearchFilters } from '@/domains/geppo/types'
import { utcDateFromYmd } from '@/utils/date-util'

/**
 * GeppoのYYYYMM＋日から作業実績日（WorkRecord.date）用のDateを生成する。
 *
 * WorkRecord.date は Prisma の `@db.Date`（TZなしの暦日）に保存され、Prisma は
 * Date の **UTC** の暦日を書き込む。`new Date(year, month, day)` はローカルTZの
 * 0時を表すため、UTC+9(JST)等の環境で生成すると前日（例: 9/3→9/2）として
 * 保存され、ガントチャート上の実績日が1日ずれる原因になる。
 * 日付ポリシー（保存は常にUTC）に従い、`Date.UTC` でUTC 0時として構築する。
 */
export function createUtcDateFromYearMonthDay(yyyymm: string, day: number): Date {
  const year = parseInt(yyyymm.substring(0, 4))
  const month = parseInt(yyyymm.substring(4, 6)) - 1 // Dateは0ベース
  return new Date(Date.UTC(year, month, day))
}

export interface IGeppoImportApplicationService {
  validateImportData(options: GeppoImportOptions): Promise<GeppoImportValidation>
  executeImport(options: GeppoImportOptions): Promise<GeppoImportResult>
}

@injectable()
export class GeppoImportApplicationService implements IGeppoImportApplicationService {
  constructor(
    @inject(SYMBOL.IGeppoRepository) private geppoRepository: IGeppoRepository,
    @inject(SYMBOL.IWorkRecordApplicationService) private workRecordService: IWorkRecordApplicationService,
    @inject(SYMBOL.ProjectMappingService) private projectMappingService: IProjectMappingService,
    @inject(SYMBOL.UserMappingService) private userMappingService: IUserMappingService,
    @inject(SYMBOL.TaskMappingService) private taskMappingService: ITaskMappingService
  ) { }

  async validateImportData(options: GeppoImportOptions): Promise<GeppoImportValidation> {
    try {
      // 1. Geppoデータ取得
      let geppoRecords = await this.getGeppoRecords(options.targetMonth)

      if (geppoRecords.length === 0) {
        const periodDescription = options.targetMonth ? `対象月 ${options.targetMonth}` : '指定期間'
        return this.createEmptyValidation([`${periodDescription}のGeppoデータが見つかりません`])
      }

      // 2. インポート対象プロジェクトによるフィルタリング
      if (options.targetProjectNames && options.targetProjectNames.length > 0) {
        geppoRecords = await this.projectMappingService.filterGeppoByTargetProjects(
          geppoRecords,
          options.targetProjectNames
        )

        if (geppoRecords.length === 0) {
          return this.createEmptyValidation([
            `指定されたプロジェクト（${options.targetProjectNames.join(', ')}）に対応するGeppoデータが見つかりません`
          ])
        }
      }

      // 3. ユーザーマッピング検証
      const uniqueMemberIds = [...new Set(geppoRecords.map(g => g.MEMBER_ID))]
      const userMappingResult = await this.userMappingService.validateUserMapping(uniqueMemberIds)

      // 4. プロジェクトマッピング検証
      const projectMappingResult = await this.projectMappingService.validateProjectMapping(geppoRecords)

      // 5. タスクマッピング検証（PROJECT_ID + WBS_NO の複合キーで WBS スコープ内のみ照合）
      const uniqueGeppoProjectIds = [...new Set(geppoRecords.map(g => g.PROJECT_ID).filter((p): p is string => Boolean(p)))]
      const projectToWbsIdMap = await this.projectMappingService.createProjectMap(uniqueGeppoProjectIds)
      const taskMappingEntries = this.buildTaskMappingEntries(geppoRecords, projectToWbsIdMap)
      const taskMappingResult = await this.taskMappingService.validateTaskMapping(taskMappingEntries)

      // 6. エラー・警告の判定
      const errors: string[] = []
      const warnings: string[] = []

      if (userMappingResult.unmappedUsers.length > 0) {
        errors.push(`マッピングできないユーザーがあります: ${userMappingResult.unmappedUsers.join(', ')}`)
      }

      if (projectMappingResult.unmappedProjects.length > 0) {
        warnings.push(`マッピングできないプロジェクトがあります: ${projectMappingResult.unmappedProjects.join(', ')}`)
      }

      if (taskMappingResult.unmappedTasks.length > 0) {
        warnings.push(`マッピングできないタスクがあります: ${taskMappingResult.unmappedTasks.join(', ')}`)
      }

      // 7. プロジェクト別統計作成
      const projectBreakdown = this.createProjectBreakdown(geppoRecords, projectMappingResult)

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        userMapping: userMappingResult,
        projectMapping: {
          totalProjects: projectMappingResult.totalProjects,
          mappedProjects: projectMappingResult.mappedCount,
          unmappedProjects: projectMappingResult.unmappedProjects,
          mappingRate: projectMappingResult.mappingRate
        },
        taskMapping: taskMappingResult,
        statistics: {
          totalGeppoRecords: geppoRecords.length,
          expectedWorkRecords: this.calculateExpectedWorkRecords(geppoRecords),
          projectBreakdown
        }
      }
    } catch (error) {
      console.error('Failed to validate import data:', error)
      return this.createEmptyValidation([
        error instanceof Error ? error.message : 'バリデーション中にエラーが発生しました'
      ])
    }
  }

  /**
   * Geppoインポート実行
   * @param options 
   * @returns 
   * @description
   * 1. バリデーション
   * 2. Geppoデータ取得とフィルタリング
   * 3. データ変換・マッピング
   * 4. ドライランの場合は実際の更新は行わない
   * 5. 更新モードに応じた処理
   * 6. WorkRecordへの保存（トランザクション処理）
   * 7. 結果レポート生成
   */
  async executeImport(options: GeppoImportOptions): Promise<GeppoImportResult> {
    try {
      // 1. バリデーション
      const validation = await this.validateImportData(options)
      if (!validation.isValid) {
        throw new Error(`インポート前バリデーションエラー: ${validation.errors.join(', ')}`)
      }

      // 2. Geppoデータ取得とフィルタリング
      let geppoRecords = await this.getGeppoRecords(options.targetMonth)
      if (options.targetProjectNames && options.targetProjectNames.length > 0) {
        geppoRecords = await this.projectMappingService.filterGeppoByTargetProjects(
          geppoRecords,
          options.targetProjectNames
        )
      }

      // 3. データ変換・マッピング
      const { workRecords, errors, mappedUserIds } = await this.convertGeppoToWorkRecords(geppoRecords)

      // 4. ドライランの場合は実際の更新は行わない
      if (options.dryRun) {
        return {
          totalGeppoRecords: geppoRecords.length,
          totalWorkRecords: workRecords.length,
          successCount: workRecords.length,
          errorCount: errors.length,
          skippedCount: 0,
          createdCount: workRecords.length,
          updatedCount: 0,
          deletedCount: 0,
          errors,
          importedRecords: this.convertWorkRecordsToImportRecords(workRecords)
        }
      }

      // 5. 更新モードに応じた処理
      let createdCount = 0
      let updatedCount = 0
      let deletedCount = 0

      if (options.updateMode === 'replace') {
        // replaceモード: 既存データを削除してから新規作成
        // 削除対象はインポート対象WBSに限定する（別WBSの実績を消さないため）
        // 削除対象ユーザーは「対象geppo行のMEMBER_ID全員（マッピング成功者）」。
        // 「変換後WorkRecord（>0h）を持つユーザー」に限定すると、当月の実績を
        // 全日0時間に訂正したユーザーが削除対象から漏れ、旧実績が残り続ける。
        const userIds = mappedUserIds
        const uniqueGeppoProjectIdsForDelete = [...new Set(geppoRecords.map(g => g.PROJECT_ID).filter((p): p is string => Boolean(p)))]
        const projectToWbsIdMapForDelete = await this.projectMappingService.createProjectMap(uniqueGeppoProjectIdsForDelete)
        const wbsIds = [...new Set(
          [...projectToWbsIdMapForDelete.values()]
            .map(v => Number(v))
            .filter(v => Number.isFinite(v))
        )]

        if (userIds.length > 0 && wbsIds.length > 0) {
          if (options.targetMonth) {
            // 特定月の場合は月単位で削除（月末はUTCで算出。"-31"連結は6月等でInvalid Dateになるため不可）
            const [ty, tm] = options.targetMonth.split('-').map((v) => parseInt(v, 10))
            const monthStart = utcDateFromYmd(ty, tm, 1)
            const monthEnd = new Date(Date.UTC(ty, tm, 0)) // 当月末日（翌月0日）
            deletedCount = await this.workRecordService.deleteByUserAndDateRange(userIds, monthStart, monthEnd, wbsIds)
          } else {
            // 全期間の場合は、対象geppo行の月範囲（先頭月の初日〜最終月の末日）で削除。
            // 変換後WorkRecordの日付範囲を使うと、端の月を全日0時間に訂正したときに
            // その月が削除範囲から外れ、旧実績が残り続ける（月次replaceと同じ根の問題）
            const months = [...new Set(
              geppoRecords.map(g => g.GEPPO_YYYYMM).filter((m): m is string => Boolean(m))
            )].sort()
            if (months.length > 0) {
              const [minY, minM] = [parseInt(months[0].substring(0, 4), 10), parseInt(months[0].substring(4, 6), 10)]
              const lastMonth = months[months.length - 1]
              const [maxY, maxM] = [parseInt(lastMonth.substring(0, 4), 10), parseInt(lastMonth.substring(4, 6), 10)]
              const minDate = utcDateFromYmd(minY, minM, 1)
              const maxDate = new Date(Date.UTC(maxY, maxM, 0)) // 最終月の末日（翌月0日）
              deletedCount = await this.workRecordService.deleteByUserAndDateRange(userIds, minDate, maxDate, wbsIds)
            }
          }
        }

        await this.workRecordService.bulkCreate(workRecords)
        createdCount = workRecords.length
      } else {
        // mergeモード: 差分更新
        const result = await this.workRecordService.bulkUpsert(workRecords)
        createdCount = result.created
        updatedCount = result.updated
      }

      return {
        totalGeppoRecords: geppoRecords.length,
        totalWorkRecords: workRecords.length,
        successCount: workRecords.length - errors.length,
        errorCount: errors.length,
        skippedCount: 0,
        createdCount,
        updatedCount,
        deletedCount,
        errors,
        importedRecords: []
      }
    } catch (error) {
      console.error('Failed to execute import:', error)
      throw new Error(error instanceof Error ? error.message : 'インポート実行中にエラーが発生しました')
    }
  }

  private buildTaskMappingEntries(
    geppoRecords: Geppo[],
    projectToWbsIdMap: Map<string, string>
  ): TaskMappingEntry[] {
    const seen = new Set<string>()
    const entries: TaskMappingEntry[] = []
    for (const geppo of geppoRecords) {
      const projectId = geppo.PROJECT_ID
      const wbsNo = geppo.WBS_NO
      if (!projectId || !wbsNo) continue

      const wbsIdStr = projectToWbsIdMap.get(projectId)
      if (!wbsIdStr) continue

      const wbsId = Number(wbsIdStr)
      if (!Number.isFinite(wbsId)) continue

      const dedupKey = buildTaskMapKey(projectId, wbsNo)
      if (seen.has(dedupKey)) continue
      seen.add(dedupKey)

      entries.push({ projectId, wbsNo, wbsId })
    }
    return entries
  }

  private async getGeppoRecords(targetMonth?: string): Promise<Geppo[]> {
    const filters: GeppoSearchFilters = {}

    if (targetMonth) {
      // 特定の月が指定されている場合（月末はUTCで算出。"-31"連結は6月等でInvalid Dateになる）
      const [ty, tm] = targetMonth.split('-').map((v) => parseInt(v, 10))
      filters.dateFrom = utcDateFromYmd(ty, tm, 1)
      filters.dateTo = new Date(Date.UTC(ty, tm, 0)) // 当月末日（翌月0日）
    }
    // targetMonthが指定されていない場合は、全期間を対象とする（フィルタなし）


    const result = await this.geppoRepository.searchWorkEntries(filters, { page: 1, limit: 10000 })
    return result.geppos
  }

  private async convertGeppoToWorkRecords(geppoRecords: Geppo[]): Promise<{
    workRecords: WorkRecord[]
    errors: GeppoImportError[]
    /** 対象geppo行のMEMBER_IDのうちユーザーへマッピングできた全員（作業時間の有無を問わない） */
    mappedUserIds: string[]
  }> {
    const workRecords: WorkRecord[] = []
    const errors: GeppoImportError[] = []

    // マッピングを事前に作成
    const uniqueMemberIds = [...new Set(geppoRecords.map(g => g.MEMBER_ID))]
    const uniqueGeppoProjectIds = [...new Set(geppoRecords.map(g => g.PROJECT_ID).filter((p): p is string => Boolean(p)))]

    const userMap = await this.userMappingService.createUserMap(uniqueMemberIds)
    const projectToWbsIdMap = await this.projectMappingService.createProjectMap(uniqueGeppoProjectIds)
    const taskMappingEntries = this.buildTaskMappingEntries(geppoRecords, projectToWbsIdMap)
    const taskMap = await this.taskMappingService.createTaskMap(taskMappingEntries)

    const mappedUserIds = [...new Set(
      uniqueMemberIds
        .map(memberId => userMap.get(memberId))
        .filter((id): id is string => Boolean(id))
    )]

    for (const geppo of geppoRecords) {
      const userId = userMap.get(geppo.MEMBER_ID)
      if (!userId) {
        // ユーザーマッピングエラーは既にバリデーションで検出されているのでスキップ
        continue
      }


      const taskId = geppo.PROJECT_ID && geppo.WBS_NO
        ? taskMap.get(buildTaskMapKey(geppo.PROJECT_ID, geppo.WBS_NO))
        : undefined

      const wbsIdStr = geppo.PROJECT_ID
        ? projectToWbsIdMap.get(geppo.PROJECT_ID)
        : undefined
      const wbsId = wbsIdStr ? Number(wbsIdStr) : undefined

      // 日次データに展開
      // 月の実日数を超える日（30日月のday31等）は取り込まずエラー計上する。
      // Date.UTC はオーバーフローを翌月へ繰り上げるため、そのまま生成すると
      // 翌月1日の実績になり、月範囲replaceの削除対象外で再取込のたびに増殖する。
      const daysInMonth = this.getDaysInMonth(geppo.GEPPO_YYYYMM)
      for (let day = 1; day <= 31; day++) {
        const dayField = `day${day.toString().padStart(2, '0')}` as keyof Geppo
        const hoursWorked = geppo[dayField] as number

        if (hoursWorked > 0) {
          if (day > daysInMonth) {
            errors.push({
              memberId: geppo.MEMBER_ID,
              projectId: geppo.PROJECT_ID,
              date: this.createDateFromYearMonthDay(geppo.GEPPO_YYYYMM, daysInMonth),
              errorType: 'INVALID_DATA',
              message: `${geppo.GEPPO_YYYYMM}に存在しない日（${day}日）に作業時間${hoursWorked}hが入力されているためスキップしました`,
              originalData: geppo
            })
            continue
          }
          try {
            const workDate = this.createDateFromYearMonthDay(geppo.GEPPO_YYYYMM, day)

            const workRecord = WorkRecord.createFromGeppo({
              userId,
              taskId,
              wbsId: wbsId && Number.isFinite(wbsId) ? wbsId : undefined,
              date: workDate,
              hoursWorked
            })
            workRecords.push(workRecord)
          } catch (error) {
            errors.push({
              memberId: geppo.MEMBER_ID,
              projectId: geppo.PROJECT_ID,
              date: this.createDateFromYearMonthDay(geppo.GEPPO_YYYYMM, day),
              errorType: 'INVALID_DATA',
              message: error instanceof Error ? error.message : 'データ変換エラー',
              originalData: geppo
            })
          }
        }
      }
    }

    return { workRecords, errors, mappedUserIds }
  }

  /**
   * YYYYMMと日付からDateオブジェクトを作成
   * @param yyyymm
   * @param day
   * @returns
   */
  private createDateFromYearMonthDay(yyyymm: string, day: number): Date {
    // 保存はUTC前提（ローカルTZ解釈だとサーバーTZ次第で日付が1日ずれる）
    return createUtcDateFromYearMonthDay(yyyymm, day)
  }

  /** YYYYMMの月の実日数（例: 202511 → 30） */
  private getDaysInMonth(yyyymm: string): number {
    const year = parseInt(yyyymm.substring(0, 4), 10)
    const month = parseInt(yyyymm.substring(4, 6), 10)
    return new Date(Date.UTC(year, month, 0)).getUTCDate() // 翌月0日 = 当月末日
  }

  private convertWorkRecordsToImportRecords(workRecords: WorkRecord[]): GeppoImportRecord[] {
    return workRecords.map(wr => ({
      memberId: wr.userId!,
      date: wr.startDate!,
      hoursWorked: wr.manHours!
    }))
  }

  private createEmptyValidation(errors: string[]): GeppoImportValidation {
    return {
      isValid: false,
      errors,
      warnings: [],
      userMapping: { totalUsers: 0, mappedUsers: 0, unmappedUsers: [], mappingRate: 0 },
      projectMapping: { totalProjects: 0, mappedProjects: 0, unmappedProjects: [], mappingRate: 0 },
      taskMapping: { totalTasks: 0, mappedTasks: 0, unmappedTasks: [], mappingRate: 0 },
      statistics: { totalGeppoRecords: 0, expectedWorkRecords: 0, projectBreakdown: [] }
    }
  }

  private createProjectBreakdown(
    geppoRecords: Geppo[],
    projectMapping: ProjectMappingValidation
  ) {
    const breakdown = new Map<string, { recordCount: number; userCount: number; users: Set<string> }>()

    geppoRecords.forEach(record => {
      const projectId = record.PROJECT_ID || 'unknown'
      if (!breakdown.has(projectId)) {
        breakdown.set(projectId, { recordCount: 0, userCount: 0, users: new Set() })
      }

      const project = breakdown.get(projectId)!
      project.recordCount++
      project.users.add(record.MEMBER_ID)
    })

    return Array.from(breakdown.entries()).map(([projectId, stats]) => ({
      projectId,
      recordCount: stats.recordCount,
      userCount: stats.users.size,
      mappingStatus: projectMapping.mappedProjects.includes(projectId)
        ? 'mapped' as const
        : 'unmapped' as const
    }))
  }

  private calculateExpectedWorkRecords(geppoRecords: Geppo[]): number {
    let total = 0
    geppoRecords.forEach(record => {
      // 月の実日数を超える日はインポートされない（エラー計上）ため件数に含めない
      const daysInMonth = this.getDaysInMonth(record.GEPPO_YYYYMM)
      for (let day = 1; day <= daysInMonth; day++) {
        const dayField = `day${day.toString().padStart(2, '0')}` as keyof Geppo
        const hours = record[dayField] as number
        if (hours > 0) {
          total++
        }
      }
    })
    return total
  }
}