import { injectable, inject } from 'inversify'
import { SYMBOL } from '@/types/symbol'
import type { IWbsImportScheduleRepository } from './iwbs-import-schedule-repository'
import type { IImportScheduleSettingsRepository } from './iimport-schedule-settings-repository'
import type { IImportJobApplicationService } from '@/applications/import-job/import-job-application-service'
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository'
import type { IProjectRepository } from '@/applications/projects/iproject-repository'
import { WbsImportSchedule } from '@/domains/import-schedule/wbs-import-schedule'
import { ImportScheduleSettings } from '@/domains/import-schedule/import-schedule-settings'
import type {
  ImportScheduleSettingsDto,
  RunDueSchedulesResult,
  UpdateWbsImportScheduleInput,
  WbsImportScheduleDto,
  WbsImportScheduleListItemDto,
} from '@/types/import-schedule'

export interface IImportScheduleApplicationService {
  getWbsImportSchedule(wbsId: number): Promise<WbsImportScheduleDto>
  updateWbsImportSchedule(
    input: UpdateWbsImportScheduleInput,
    now?: Date
  ): Promise<{ success: boolean; error?: string }>
  listWbsImportSchedules(): Promise<WbsImportScheduleListItemDto[]>
  getImportScheduleSettings(): Promise<ImportScheduleSettingsDto>
  updateImportScheduleSettings(isEnabled: boolean): Promise<void>
  runDueSchedules(now: Date): Promise<RunDueSchedulesResult>
}

/**
 * WBSごとの定期インポート
 * 期限が来た予定をインポートジョブとして登録するところまでを担い、実行はインポートジョブ側に任せる
 * （インポートジョブ側はこのサービスに依存しないため、API から直接ジョブを作成しても同じように実行される）
 */
@injectable()
export class ImportScheduleApplicationService implements IImportScheduleApplicationService {
  constructor(
    @inject(SYMBOL.IWbsImportScheduleRepository)
    private readonly scheduleRepository: IWbsImportScheduleRepository,
    @inject(SYMBOL.IImportScheduleSettingsRepository)
    private readonly settingsRepository: IImportScheduleSettingsRepository,
    @inject(SYMBOL.IImportJobApplicationService)
    private readonly importJobService: IImportJobApplicationService,
    @inject(SYMBOL.IWbsRepository)
    private readonly wbsRepository: IWbsRepository,
    @inject(SYMBOL.IProjectRepository)
    private readonly projectRepository: IProjectRepository,
  ) { }

  async getWbsImportSchedule(wbsId: number): Promise<WbsImportScheduleDto> {
    const schedule = await this.scheduleRepository.findByWbsId(wbsId)
    return this.toDto(schedule ?? WbsImportSchedule.createDefault(wbsId))
  }

  async updateWbsImportSchedule(
    input: UpdateWbsImportScheduleInput,
    now: Date = new Date()
  ): Promise<{ success: boolean; error?: string }> {
    const wbs = await this.wbsRepository.findById(input.wbsId)
    if (!wbs) {
      return { success: false, error: 'WBSが見つかりません' }
    }

    const current = await this.scheduleRepository.findByWbsId(input.wbsId)
    let schedule: WbsImportSchedule
    try {
      schedule = current
        ? current.changeSettings(input, now)
        : WbsImportSchedule.create(input.wbsId, input, now)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }

    await this.scheduleRepository.save(schedule)
    return { success: true }
  }

  /** すべてのWBSの設定（未設定のWBSは既定値）。有効なものを先頭に、プロジェクト名・WBS名順 */
  async listWbsImportSchedules(): Promise<WbsImportScheduleListItemDto[]> {
    const [wbsList, projects, schedules] = await Promise.all([
      this.wbsRepository.findAll(),
      this.projectRepository.findAll(),
      this.scheduleRepository.findAll(),
    ])
    const projectNames = new Map(projects.map((project) => [project.id, project.name]))
    const schedulesByWbsId = new Map(schedules.map((schedule) => [schedule.wbsId, schedule]))

    return wbsList
      .filter((wbs) => wbs.id !== undefined)
      .map((wbs) => ({
        ...this.toDto(schedulesByWbsId.get(wbs.id!) ?? WbsImportSchedule.createDefault(wbs.id!)),
        wbsName: wbs.name,
        projectId: wbs.projectId,
        projectName: projectNames.get(wbs.projectId) ?? '',
      }))
      .sort(
        (a, b) =>
          Number(b.isEnabled) - Number(a.isEnabled) ||
          a.projectName.localeCompare(b.projectName, 'ja') ||
          a.wbsName.localeCompare(b.wbsName, 'ja')
      )
  }

  async getImportScheduleSettings(): Promise<ImportScheduleSettingsDto> {
    const settings = await this.settingsRepository.get()
    return { isEnabled: settings.isEnabled }
  }

  async updateImportScheduleSettings(isEnabled: boolean): Promise<void> {
    await this.settingsRepository.update(ImportScheduleSettings.create(isEnabled))
  }

  /**
   * 期限が来た予定をインポートジョブとして登録し、次回実行日時を進める
   * 全体設定で停止中の場合は、ジョブを作成せず次回実行日時だけ進める
   */
  async runDueSchedules(now: Date): Promise<RunDueSchedulesResult> {
    const settings = await this.settingsRepository.get()
    const dueSchedules = await this.scheduleRepository.findDue(now)
    const createdJobIds: string[] = []

    for (const schedule of dueSchedules) {
      if (!schedule.nextRunAt) continue

      try {
        const advanced = settings.isEnabled ? schedule.markRun(now) : schedule.skipRun(now)
        const isClaimed = await this.scheduleRepository.updateIfNextRunAt(advanced, schedule.nextRunAt)
        if (!isClaimed || !settings.isEnabled) continue

        createdJobIds.push(...(await this.createScheduledJobs(schedule, now)))
      } catch (error) {
        console.error(`定期インポートの登録に失敗しました（WBS ID: ${schedule.wbsId}）:`, error)
      }
    }

    return { isSkipped: !settings.isEnabled, createdJobIds }
  }

  /**
   * WBS同期 →（設定により）そのWBSの前月・当月の実績取込 の順にジョブを作成する
   * ジョブは作成順に1件ずつ実行されるため、実績はWBS同期の後に取り込まれる
   */
  private async createScheduledJobs(schedule: WbsImportSchedule, now: Date): Promise<string[]> {
    const wbs = await this.wbsRepository.findById(schedule.wbsId)
    if (!wbs) return []

    const jobIds: string[] = []
    const wbsJob = await this.importJobService.createJob({
      type: 'WBS',
      wbsId: schedule.wbsId,
      options: { syncMode: schedule.syncMode },
    })
    jobIds.push(wbsJob.id)

    if (schedule.includeActuals) {
      for (const targetMonth of schedule.actualsTargetMonths(now)) {
        const geppoJob = await this.importJobService.createJob({
          type: 'GEPPO',
          wbsId: schedule.wbsId,
          targetMonth,
          targetProjectIds: [wbs.name],
          options: {},
        })
        jobIds.push(geppoJob.id)
      }
    }

    return jobIds
  }

  private toDto(schedule: WbsImportSchedule): WbsImportScheduleDto {
    return {
      wbsId: schedule.wbsId,
      isEnabled: schedule.isEnabled,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      syncMode: schedule.syncMode,
      includeActuals: schedule.includeActuals,
      nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
      lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    }
  }
}
