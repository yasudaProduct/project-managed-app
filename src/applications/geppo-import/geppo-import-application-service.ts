import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import { WorkRecord } from '@/domains/work-records/work-recoed'
import {
  GeppoImportOptions,
  GeppoImportResult,
  GeppoImportValidation,
  GeppoImportPreview,
  GeppoImportRecord,
  GeppoImportError,
  ProjectMappingValidation
} from '@/domains/geppo-import/geppo-import-result'
import type { IGeppoRepository } from '@/applications/geppo/repositories/igeppo.repository'
import type { IWorkRecordApplicationService } from '@/applications/work-record/work-record-application-service'
import { ProjectMappingService } from '@/infrastructures/geppo-import/project-mapping.service'
import { UserMappingService } from '@/infrastructures/geppo-import/user-mapping.service'
import { TaskMappingService } from '@/infrastructures/geppo-import/task-mapping.service'
import { Geppo, GeppoSearchFilters } from '@/domains/geppo/types'

export interface IGeppoImportApplicationService {
  validateImportData(options: GeppoImportOptions): Promise<GeppoImportValidation>
  executeImport(options: GeppoImportOptions): Promise<GeppoImportResult>
  getImportPreview(options: GeppoImportOptions): Promise<GeppoImportPreview>
}

@injectable()
export class GeppoImportApplicationService implements IGeppoImportApplicationService {
  constructor(
    @inject(SYMBOL.IGeppoRepository) private geppoRepository: IGeppoRepository,
    @inject(SYMBOL.IWorkRecordApplicationService) private workRecordService: IWorkRecordApplicationService,
    @inject(SYMBOL.ProjectMappingService) private projectMappingService: ProjectMappingService,
    @inject(SYMBOL.UserMappingService) private userMappingService: UserMappingService,
    @inject(SYMBOL.TaskMappingService) private taskMappingService: TaskMappingService
  ) { }

  async validateImportData(options: GeppoImportOptions): Promise<GeppoImportValidation> {
    try {
      // 1. Geppoデータ取得
      let geppoRecords = await this.getGeppoRecords(options.targetMonth)

      if (geppoRecords.length === 0) {
        return this.createEmptyValidation([`対象月 ${options.targetMonth} のGeppoデータが見つかりません`])
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

      // 5. タスクマッピング検証
      const uniqueWbsNos = [...new Set(geppoRecords.map(g => g.WBS_NO).filter((wbs): wbs is string => Boolean(wbs)))]
      const taskMappingResult = await this.taskMappingService.validateTaskMapping(uniqueWbsNos)

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
      const { workRecords, errors } = await this.convertGeppoToWorkRecords(geppoRecords)

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
        const userIds = [...new Set(workRecords.map(wr => wr.userId!).filter(Boolean))]
        const monthStart = new Date(`${options.targetMonth}-01`)
        const monthEnd = new Date(`${options.targetMonth}-31`)

        deletedCount = await this.workRecordService.deleteByUserAndDateRange(userIds, monthStart, monthEnd)
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

  async getImportPreview(options: GeppoImportOptions): Promise<GeppoImportPreview> {
    try {
      const validation = await this.validateImportData(options)

      // サンプルレコードを生成（最初の10件）
      let geppoRecords = await this.getGeppoRecords(options.targetMonth)
      if (options.targetProjectNames && options.targetProjectNames.length > 0) {
        geppoRecords = await this.projectMappingService.filterGeppoByTargetProjects(
          geppoRecords,
          options.targetProjectNames
        )
      }

      const { workRecords } = await this.convertGeppoToWorkRecords(geppoRecords.slice(0, 10))
      const sampleRecords = this.convertWorkRecordsToImportRecords(workRecords)

      // サマリー統計を作成
      const summary = {
        totalWorkRecords: validation.statistics.expectedWorkRecords,
        byProject: new Map<string, number>(),
        byUser: new Map<string, number>(),
        byDate: new Map<string, number>()
      }

      return {
        validation,
        sampleRecords,
        summary
      }
    } catch (error) {
      console.error('Failed to get import preview:', error)
      throw new Error(error instanceof Error ? error.message : 'プレビュー取得中にエラーが発生しました')
    }
  }

  private async getGeppoRecords(targetMonth: string): Promise<Geppo[]> {
    const filters: GeppoSearchFilters = {
      dateFrom: new Date(`${targetMonth}-01`),
      dateTo: new Date(`${targetMonth}-31`)
    }

    const result = await this.geppoRepository.searchWorkEntries(filters, { page: 1, limit: 10000 })
    return result.geppos
  }

  private async convertGeppoToWorkRecords(geppoRecords: Geppo[]): Promise<{
    workRecords: WorkRecord[]
    errors: GeppoImportError[]
  }> {
    const workRecords: WorkRecord[] = []
    const errors: GeppoImportError[] = []

    // マッピングを事前に作成
    const uniqueMemberIds = [...new Set(geppoRecords.map(g => g.MEMBER_ID))]
    const uniqueWbsNos = [...new Set(geppoRecords.map(g => g.WBS_NO).filter((wbs): wbs is string => Boolean(wbs)))]

    const userMap = await this.userMappingService.createUserMap(uniqueMemberIds)
    const taskMap = await this.taskMappingService.createTaskMap(uniqueWbsNos)

    for (const geppo of geppoRecords) {
      console.log("--convertGeppoToWorkRecords--")
      console.log(geppo)
      console.log(geppo.MEMBER_ID)
      console.log(userMap.get(geppo.MEMBER_ID))
      console.log("--------------------------------")
      const userId = userMap.get(geppo.MEMBER_ID)
      if (!userId) {
        // ユーザーマッピングエラーは既にバリデーションで検出されているのでスキップ
        continue
      }


      const taskId = taskMap.get(geppo.WBS_NO || '')

      // 日次データに展開
      for (let day = 1; day <= 31; day++) {
        const dayField = `day${day.toString().padStart(2, '0')}` as keyof Geppo
        const hoursWorked = geppo[dayField] as number

        if (hoursWorked > 0) {
          try {
            const workDate = this.createDateFromYearMonthDay(geppo.GEPPO_YYYYMM, day)

            const workRecord = WorkRecord.createFromGeppo({
              userId,
              taskId,
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

    return { workRecords, errors }
  }

  private createDateFromYearMonthDay(yyyymm: string, day: number): Date {
    const year = parseInt(yyyymm.substring(0, 4))
    const month = parseInt(yyyymm.substring(4, 6)) - 1 // Dateは0ベース
    return new Date(year, month, day)
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
      for (let day = 1; day <= 31; day++) {
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