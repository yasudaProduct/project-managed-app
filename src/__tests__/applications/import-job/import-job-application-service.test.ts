import { ImportJobApplicationService } from '@/applications/import-job/import-job-application-service'
import type { IImportJobRepository } from '@/applications/import-job/iimport-job-repository'
import type { IGeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service'
import type { IWbsSyncApplicationService } from '@/applications/wbs-sync/iwbs-sync-application-service'
import type { INotificationService } from '@/applications/notification/inotification-service'
import type { IWbsApplicationService } from '@/applications/wbs/wbs-application-service'
import { ImportJob, ImportJobOptions } from '@/domains/import-job/import-job'
import { ImportJobStatuses } from '@/domains/import-job/import-job-enums'
import type { ImportJobStatus } from '@/domains/import-job/import-job-enums'
import { NotificationType } from '@/types/notification'

/**
 * cron（docker/cron）からの定期インポートで顕在化する不具合に対するユニットテスト。
 *
 * - startJob: 同じジョブへの execute が同時に届いても（毎分の保留ジョブ実行と日次/月次ジョブの競合など）
 *   PENDING → RUNNING へ遷移できるのは1件だけにする（二重インポート防止）。
 * - 通知: WBS同期の失敗時に「完了」通知を送らない。wbsId を持たないジョブ（cron の Geppo 等）で
 *   全WBSの担当者へ通知しない。
 */

/** findById が返すインスタンスを呼び出し側で変更しても保存値が変わらないよう複製する */
const copyJob = (job: ImportJob): ImportJob =>
  Object.assign(Object.create(Object.getPrototypeOf(job)), job, {
    targetProjectIds: [...job.targetProjectIds],
    options: { ...job.options },
  })

describe('ImportJobApplicationService', () => {
  let store: Map<string, ImportJob>
  let importJobRepository: jest.Mocked<IImportJobRepository>
  let geppoImportService: jest.Mocked<IGeppoImportApplicationService>
  let wbsSyncService: jest.Mocked<IWbsSyncApplicationService>
  let notificationService: jest.Mocked<INotificationService>
  let wbsApplicationService: jest.Mocked<IWbsApplicationService>
  let service: ImportJobApplicationService

  const seedJob = (
    options: Partial<ImportJobOptions> & { createdBy?: string | null; status?: ImportJobStatus } = {}
  ): ImportJob => {
    const { status, ...createOptions } = options
    const job = ImportJob.create({ type: 'WBS', options: {}, ...createOptions })
    const id = `job-${store.size + 1}`
    const seeded = Object.assign(copyJob(job), { id, status: status ?? job.status })
    store.set(id, seeded)
    return copyJob(seeded)
  }

  /** executeJobAsync で起動したバックグラウンド処理（モックは即時解決）を完了させる */
  const flushBackground = () => new Promise((resolve) => setTimeout(resolve, 0))

  beforeEach(() => {
    store = new Map()

    importJobRepository = {
      create: jest.fn(),
      update: jest.fn().mockImplementation(async (job: ImportJob) => {
        store.set(job.id, copyJob(job))
        return copyJob(job)
      }),
      updateIfStatus: jest.fn().mockImplementation(async (job: ImportJob, expectedStatus: ImportJobStatus) => {
        const current = store.get(job.id)
        if (!current || current.status !== expectedStatus) return false
        store.set(job.id, copyJob(job))
        return true
      }),
      findById: jest.fn().mockImplementation(async (id: string) => {
        const job = store.get(id)
        return job ? copyJob(job) : null
      }),
      findAll: jest.fn(),
      findByUser: jest.fn(),
      findByStatus: jest.fn(),
      findByTypeAndStatus: jest.fn(),
      addProgress: jest.fn().mockResolvedValue(undefined),
      getProgress: jest.fn(),
    } as unknown as jest.Mocked<IImportJobRepository>

    geppoImportService = {
      executeImport: jest.fn().mockResolvedValue({
        totalGeppoRecords: 1,
        totalWorkRecords: 1,
        successCount: 1,
        errorCount: 0,
        skippedCount: 0,
        createdCount: 1,
        updatedCount: 0,
        deletedCount: 0,
        errors: [],
        importedRecords: [],
      }),
    } as unknown as jest.Mocked<IGeppoImportApplicationService>

    wbsSyncService = {
      replaceAll: jest.fn(),
      syncDiff: jest.fn().mockResolvedValue({
        success: true,
        projectId: 'PJ-1',
        recordCount: 1,
        addedCount: 1,
        updatedCount: 0,
        deletedCount: 0,
      }),
    }

    notificationService = {
      createNotification: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<INotificationService>

    wbsApplicationService = {
      getAssignees: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IWbsApplicationService>

    service = new ImportJobApplicationService(
      importJobRepository,
      geppoImportService,
      wbsSyncService,
      notificationService,
      wbsApplicationService,
    )
  })

  describe('startJob', () => {
    it('PENDINGのジョブを、PENDINGであることを条件にRUNNINGへ更新して true を返す', async () => {
      const job = seedJob({ wbsId: 10 })

      const isStarted = await service.startJob(job.id)

      expect(isStarted).toBe(true)
      expect(importJobRepository.updateIfStatus).toHaveBeenCalledWith(
        expect.objectContaining({ id: job.id, status: ImportJobStatuses.RUNNING }),
        ImportJobStatuses.PENDING,
      )
      expect(store.get(job.id)?.status).toBe(ImportJobStatuses.RUNNING)
      expect(importJobRepository.addProgress).toHaveBeenCalledWith(
        job.id,
        expect.objectContaining({ message: 'インポートジョブを開始しました' }),
      )
    })

    it('同じジョブへの開始が同時に届いた場合、開始できるのは1件だけ', async () => {
      const job = seedJob({ wbsId: 10 })

      const results = await Promise.all([service.startJob(job.id), service.startJob(job.id)])

      expect(results.filter(Boolean)).toHaveLength(1)
      expect(store.get(job.id)?.status).toBe(ImportJobStatuses.RUNNING)
      expect(importJobRepository.addProgress).toHaveBeenCalledTimes(1)
    })

    it('他の実行者が先に開始していた（条件付き更新が0件）場合は false を返し、進捗を記録しない', async () => {
      const job = seedJob({ wbsId: 10 })
      importJobRepository.updateIfStatus.mockResolvedValueOnce(false)

      const isStarted = await service.startJob(job.id)

      expect(isStarted).toBe(false)
      expect(importJobRepository.addProgress).not.toHaveBeenCalled()
    })

    it('PENDING以外のジョブは更新せず false を返す', async () => {
      const job = seedJob({ wbsId: 10, status: ImportJobStatuses.RUNNING })

      const isStarted = await service.startJob(job.id)

      expect(isStarted).toBe(false)
      expect(importJobRepository.updateIfStatus).not.toHaveBeenCalled()
      expect(importJobRepository.update).not.toHaveBeenCalled()
    })

    it('ジョブが存在しない場合は例外を投げる', async () => {
      await expect(service.startJob('missing')).rejects.toThrow('ジョブが見つかりません')
    })
  })

  describe('executeJobAsync - WBS', () => {
    it('WBS同期が成功した場合はジョブを完了にし、完了通知を送る', async () => {
      const job = seedJob({ wbsId: 10, createdBy: 'user-1' })
      await service.startJob(job.id)

      service.executeJobAsync(job.id)
      await flushBackground()

      expect(store.get(job.id)?.status).toBe(ImportJobStatuses.COMPLETED)
      expect(notificationService.createNotification).toHaveBeenCalledTimes(1)
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', type: NotificationType.IMPORT_JOB_COMPLETED }),
      )
    })

    it('WBS同期が失敗した場合はジョブを失敗にし、完了ではなく失敗通知を送る', async () => {
      const job = seedJob({ wbsId: 10, createdBy: 'user-1' })
      wbsSyncService.syncDiff.mockResolvedValueOnce({
        success: false,
        projectId: 'PJ-1',
        recordCount: 1,
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        errorDetails: { message: 'Excel側のデータが見つかりません' },
      })
      await service.startJob(job.id)

      service.executeJobAsync(job.id)
      await flushBackground()

      expect(store.get(job.id)?.status).toBe(ImportJobStatuses.FAILED)
      expect(notificationService.createNotification).toHaveBeenCalledTimes(1)
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', type: NotificationType.IMPORT_JOB_FAILED }),
      )
    })
  })

  describe('通知先', () => {
    it('createdBy がないWBSジョブは、そのWBSの担当者へ重複なく通知する', async () => {
      const job = seedJob({ wbsId: 10 })
      const assignee = (userId: string) => ({
        wbsId: 10,
        assignee: { id: 1, userId, name: userId, displayName: userId, rate: 1, costPerHour: 5000, seq: 1 },
      })
      wbsApplicationService.getAssignees.mockResolvedValueOnce([
        assignee('user-1'),
        assignee('user-1'),
        assignee('user-2'),
      ])
      await service.startJob(job.id)

      service.executeJobAsync(job.id)
      await flushBackground()

      expect(wbsApplicationService.getAssignees).toHaveBeenCalledWith(10)
      const notifiedUserIds = notificationService.createNotification.mock.calls.map(([request]) => request.userId)
      expect(notifiedUserIds).toEqual(['user-1', 'user-2'])
    })

    it('createdBy も wbsId もないジョブ（cron の Geppo など）は担当者を検索せず、誰にも通知しない', async () => {
      const job = seedJob({ type: 'GEPPO', targetMonth: '2026-09', createdBy: null })
      await service.startJob(job.id)

      service.executeJobAsync(job.id)
      await flushBackground()

      expect(store.get(job.id)?.status).toBe(ImportJobStatuses.COMPLETED)
      expect(wbsApplicationService.getAssignees).not.toHaveBeenCalled()
      expect(notificationService.createNotification).not.toHaveBeenCalled()
    })

    it('createdBy があるGeppoジョブは作成者へ通知する', async () => {
      const job = seedJob({ type: 'GEPPO', targetMonth: '2026-09', createdBy: 'user-1' })
      await service.startJob(job.id)

      service.executeJobAsync(job.id)
      await flushBackground()

      expect(wbsApplicationService.getAssignees).not.toHaveBeenCalled()
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', type: NotificationType.IMPORT_JOB_COMPLETED }),
      )
    })
  })
})
