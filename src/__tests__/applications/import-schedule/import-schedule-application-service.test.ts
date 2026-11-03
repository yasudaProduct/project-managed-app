import { ImportScheduleApplicationService } from '@/applications/import-schedule/import-schedule-application-service'
import type { IWbsImportScheduleRepository } from '@/applications/import-schedule/iwbs-import-schedule-repository'
import type { IImportScheduleSettingsRepository } from '@/applications/import-schedule/iimport-schedule-settings-repository'
import type { IImportJobApplicationService } from '@/applications/import-job/import-job-application-service'
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository'
import type { IProjectRepository } from '@/applications/projects/iproject-repository'
import { WbsImportSchedule } from '@/domains/import-schedule/wbs-import-schedule'
import { ImportScheduleSettings } from '@/domains/import-schedule/import-schedule-settings'
import { ImportJob } from '@/domains/import-job/import-job'
import { Wbs } from '@/domains/wbs/wbs'
import { Project } from '@/domains/project/project'
import { ProjectStatus } from '@/domains/project/project-status'

/**
 * WBSごとの定期インポート設定と、期限が来た予定からのジョブ作成。
 * ジョブの作成・実行はインポート側（IImportJobApplicationService）に任せ、スケジュール側はそれを呼ぶだけ。
 */
describe('ImportScheduleApplicationService', () => {
  // 2026-10-24 12:00:10 JST（9時・12時・17時の予定が来た直後）
  const NOW = new Date('2026-10-24T03:00:10.000Z')

  let scheduleRepository: jest.Mocked<IWbsImportScheduleRepository>
  let settingsRepository: jest.Mocked<IImportScheduleSettingsRepository>
  let importJobService: jest.Mocked<Pick<IImportJobApplicationService, 'createJob'>>
  let wbsRepository: jest.Mocked<Pick<IWbsRepository, 'findById' | 'findAll'>>
  let projectRepository: jest.Mocked<Pick<IProjectRepository, 'findAll'>>
  let service: ImportScheduleApplicationService

  const wbs1 = Wbs.createFromDb({ id: 1, name: '新規機能開発A', projectId: 'pj-1' })

  const dueSchedule = (overrides: Partial<Parameters<typeof WbsImportSchedule.createFromDb>[0]> = {}) =>
    WbsImportSchedule.createFromDb({
      wbsId: 1,
      isEnabled: true,
      cronExpression: '0 9,12,17 * * *',
      timezone: 'Asia/Tokyo',
      syncMode: 'diff',
      includeActuals: false,
      nextRunAt: new Date('2026-10-24T03:00:00.000Z'),
      lastRunAt: new Date('2026-10-24T00:00:05.000Z'),
      ...overrides,
    })

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})

    scheduleRepository = {
      findByWbsId: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      findDue: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
      updateIfNextRunAt: jest.fn().mockResolvedValue(true),
    }
    settingsRepository = {
      get: jest.fn().mockResolvedValue(ImportScheduleSettings.create(true)),
      update: jest.fn().mockResolvedValue(undefined),
    }
    let jobCount = 0
    importJobService = {
      createJob: jest.fn().mockImplementation(async (options) =>
        Object.assign(ImportJob.create(options), { id: `job-${++jobCount}` })
      ),
    }
    wbsRepository = {
      findById: jest.fn().mockImplementation(async (id: number) => (id === 1 ? wbs1 : null)),
      findAll: jest.fn().mockResolvedValue([wbs1]),
    }
    projectRepository = {
      findAll: jest.fn().mockResolvedValue([]),
    }

    service = new ImportScheduleApplicationService(
      scheduleRepository,
      settingsRepository,
      importJobService as unknown as IImportJobApplicationService,
      wbsRepository as unknown as IWbsRepository,
      projectRepository as unknown as IProjectRepository,
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('runDueSchedules', () => {
    it('期限が来た予定ごとに WBS 同期ジョブを作成し、次回実行日時を進める', async () => {
      scheduleRepository.findDue.mockResolvedValue([dueSchedule({ syncMode: 'replace' })])

      const result = await service.runDueSchedules(NOW)

      expect(scheduleRepository.findDue).toHaveBeenCalledWith(NOW)
      expect(scheduleRepository.updateIfNextRunAt).toHaveBeenCalledWith(
        expect.objectContaining({ wbsId: 1, lastRunAt: NOW, nextRunAt: new Date('2026-10-24T08:00:00.000Z') }),
        new Date('2026-10-24T03:00:00.000Z'),
      )
      expect(importJobService.createJob).toHaveBeenCalledTimes(1)
      expect(importJobService.createJob).toHaveBeenCalledWith({
        type: 'WBS',
        wbsId: 1,
        options: { syncMode: 'replace' },
      })
      expect(result).toEqual({ isSkipped: false, createdJobIds: ['job-1'] })
    })

    it('実績も取り込む設定では、WBS同期の後にそのWBSの前月・当月の実績（Geppo）ジョブを作成する', async () => {
      scheduleRepository.findDue.mockResolvedValue([dueSchedule({ includeActuals: true })])

      const result = await service.runDueSchedules(NOW)

      expect(importJobService.createJob.mock.calls.map(([options]) => options)).toEqual([
        { type: 'WBS', wbsId: 1, options: { syncMode: 'diff' } },
        { type: 'GEPPO', wbsId: 1, targetMonth: '2026-09', targetProjectIds: ['新規機能開発A'], options: {} },
        { type: 'GEPPO', wbsId: 1, targetMonth: '2026-10', targetProjectIds: ['新規機能開発A'], options: {} },
      ])
      expect(result.createdJobIds).toEqual(['job-1', 'job-2', 'job-3'])
    })

    it('次回実行日時を進められなかった（他の呼び出しが先に起動した）予定はジョブを作成しない', async () => {
      scheduleRepository.findDue.mockResolvedValue([dueSchedule()])
      scheduleRepository.updateIfNextRunAt.mockResolvedValue(false)

      const result = await service.runDueSchedules(NOW)

      expect(importJobService.createJob).not.toHaveBeenCalled()
      expect(result.createdJobIds).toEqual([])
    })

    it('全体設定で定期インポートが停止中の場合は、ジョブを作成せず次回実行日時だけ進める', async () => {
      settingsRepository.get.mockResolvedValue(ImportScheduleSettings.create(false))
      scheduleRepository.findDue.mockResolvedValue([dueSchedule()])

      const result = await service.runDueSchedules(NOW)

      expect(scheduleRepository.updateIfNextRunAt).toHaveBeenCalledWith(
        expect.objectContaining({
          lastRunAt: new Date('2026-10-24T00:00:05.000Z'),
          nextRunAt: new Date('2026-10-24T08:00:00.000Z'),
        }),
        new Date('2026-10-24T03:00:00.000Z'),
      )
      expect(importJobService.createJob).not.toHaveBeenCalled()
      expect(result).toEqual({ isSkipped: true, createdJobIds: [] })
    })

    it('WBSが見つからない予定はジョブを作成しない', async () => {
      scheduleRepository.findDue.mockResolvedValue([dueSchedule({ wbsId: 99 })])

      const result = await service.runDueSchedules(NOW)

      expect(importJobService.createJob).not.toHaveBeenCalled()
      expect(result.createdJobIds).toEqual([])
    })

    it('1件の予定でジョブ作成に失敗しても、残りの予定は処理を続ける', async () => {
      const wbs2 = Wbs.createFromDb({ id: 2, name: '保守B', projectId: 'pj-1' })
      wbsRepository.findById.mockImplementation(async (id: number) => (id === 1 ? wbs1 : id === 2 ? wbs2 : null))
      scheduleRepository.findDue.mockResolvedValue([dueSchedule({ wbsId: 1 }), dueSchedule({ wbsId: 2 })])
      importJobService.createJob
        .mockRejectedValueOnce(new Error('DB error'))
        .mockImplementationOnce(async (options) => Object.assign(ImportJob.create(options), { id: 'job-2' }))

      const result = await service.runDueSchedules(NOW)

      expect(importJobService.createJob).toHaveBeenCalledTimes(2)
      expect(result.createdJobIds).toEqual(['job-2'])
    })
  })

  describe('getWbsImportSchedule', () => {
    it('未設定のWBSは既定値（無効・毎日3:00・差分・実績なし）を返す', async () => {
      await expect(service.getWbsImportSchedule(1)).resolves.toEqual({
        wbsId: 1,
        isEnabled: false,
        cronExpression: '0 3 * * *',
        timezone: 'Asia/Tokyo',
        syncMode: 'diff',
        includeActuals: false,
        nextRunAt: null,
        lastRunAt: null,
      })
    })

    it('設定済みのWBSは日時を ISO 8601 文字列で返す', async () => {
      scheduleRepository.findByWbsId.mockResolvedValue(dueSchedule({ includeActuals: true }))

      await expect(service.getWbsImportSchedule(1)).resolves.toEqual({
        wbsId: 1,
        isEnabled: true,
        cronExpression: '0 9,12,17 * * *',
        timezone: 'Asia/Tokyo',
        syncMode: 'diff',
        includeActuals: true,
        nextRunAt: '2026-10-24T03:00:00.000Z',
        lastRunAt: '2026-10-24T00:00:05.000Z',
      })
    })
  })

  describe('updateWbsImportSchedule', () => {
    const input = {
      wbsId: 1,
      isEnabled: true,
      cronExpression: '0 * * * *',
      syncMode: 'replace' as const,
      includeActuals: true,
    }

    it('新規に保存すると、有効なら次回実行日時を計算して保存する', async () => {
      const result = await service.updateWbsImportSchedule(input, NOW)

      expect(result).toEqual({ success: true })
      expect(scheduleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          wbsId: 1,
          isEnabled: true,
          cronExpression: '0 * * * *',
          syncMode: 'replace',
          includeActuals: true,
          nextRunAt: new Date('2026-10-24T04:00:00.000Z'),
          lastRunAt: null,
        })
      )
    })

    it('既存の設定を更新しても前回実行日時は保持する', async () => {
      scheduleRepository.findByWbsId.mockResolvedValue(dueSchedule())

      await service.updateWbsImportSchedule({ ...input, isEnabled: false }, NOW)

      expect(scheduleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEnabled: false,
          nextRunAt: null,
          lastRunAt: new Date('2026-10-24T00:00:05.000Z'),
        })
      )
    })

    it('不正な cron 式はエラーを返し、保存しない', async () => {
      const result = await service.updateWbsImportSchedule({ ...input, cronExpression: '99 * * * *' }, NOW)

      expect(result).toEqual({ success: false, error: expect.stringContaining('実行タイミングの指定が不正です') })
      expect(scheduleRepository.save).not.toHaveBeenCalled()
    })

    it('WBSが存在しない場合はエラーを返し、保存しない', async () => {
      const result = await service.updateWbsImportSchedule({ ...input, wbsId: 99 }, NOW)

      expect(result).toEqual({ success: false, error: 'WBSが見つかりません' })
      expect(scheduleRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('listWbsImportSchedules', () => {
    it('すべてのWBSを、設定の有無にかかわらずプロジェクト名とともに返す（有効なものを先頭に）', async () => {
      const project = (id: string, name: string) =>
        Project.createFromDb({
          id,
          name,
          status: new ProjectStatus({ status: 'ACTIVE' }),
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: new Date('2026-12-31T00:00:00.000Z'),
        })
      wbsRepository.findAll.mockResolvedValue([
        Wbs.createFromDb({ id: 2, name: 'WBS-B', projectId: 'pj-1' }),
        Wbs.createFromDb({ id: 3, name: 'WBS-C', projectId: 'pj-1' }),
        Wbs.createFromDb({ id: 1, name: 'WBS-A', projectId: 'pj-2' }),
      ])
      projectRepository.findAll.mockResolvedValue([project('pj-1', 'プロジェクト1'), project('pj-2', 'プロジェクト2')])
      scheduleRepository.findAll.mockResolvedValue([
        dueSchedule({ wbsId: 1 }),
        dueSchedule({ wbsId: 3, isEnabled: false, nextRunAt: null }),
      ])

      const list = await service.listWbsImportSchedules()

      expect(list.map(({ wbsId, wbsName, projectName, isEnabled }) => ({ wbsId, wbsName, projectName, isEnabled }))).toEqual([
        { wbsId: 1, wbsName: 'WBS-A', projectName: 'プロジェクト2', isEnabled: true },
        { wbsId: 2, wbsName: 'WBS-B', projectName: 'プロジェクト1', isEnabled: false },
        { wbsId: 3, wbsName: 'WBS-C', projectName: 'プロジェクト1', isEnabled: false },
      ])
      expect(list[0]).toEqual(
        expect.objectContaining({
          projectId: 'pj-2',
          cronExpression: '0 9,12,17 * * *',
          nextRunAt: '2026-10-24T03:00:00.000Z',
        })
      )
      expect(list[1]).toEqual(expect.objectContaining({ cronExpression: '0 3 * * *', nextRunAt: null }))
    })
  })

  describe('全体設定', () => {
    it('定期インポート全体の有効/無効を取得する', async () => {
      await expect(service.getImportScheduleSettings()).resolves.toEqual({ isEnabled: true })
    })

    it('定期インポート全体の有効/無効を更新する', async () => {
      await service.updateImportScheduleSettings(false)

      expect(settingsRepository.update).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }))
    })
  })
})
