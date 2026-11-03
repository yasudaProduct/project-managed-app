import { ImportJobApplicationService } from '@/applications/import-job/import-job-application-service'
import type { IImportJobRepository } from '@/applications/import-job/iimport-job-repository'
import type { IGeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service'
import type { IWbsSyncApplicationService } from '@/applications/wbs-sync/iwbs-sync-application-service'
import type { INotificationService } from '@/applications/notification/inotification-service'
import type { IWbsApplicationService } from '@/applications/wbs/wbs-application-service'
import type { SyncResult } from '@/domains/sync/excel-wbs'
import { ImportJob, ImportJobOptions } from '@/domains/import-job/import-job'
import { ImportJobStatuses } from '@/domains/import-job/import-job-enums'
import type { ImportJobStatus } from '@/domains/import-job/import-job-enums'
import { NotificationType } from '@/types/notification'

/**
 * インポートジョブの実行制御に対するユニットテスト。
 *
 * - インポートジョブは作成順に1件ずつ実行する（WBS洗い替えと実績取込の並行実行や、同じ対象の二重取込で
 *   データが壊れるため）。作成したジョブは実行中のジョブがなければ直ちに開始し、あれば完了後に順番に開始する。
 * - アプリの再起動などで RUNNING のまま止まったジョブはタイムアウトとして失敗にし、待ち行列を詰まらせない。
 * - 通知: WBS同期の失敗時に「完了」通知を送らない。wbsId を持たないジョブで全WBSの担当者へ通知しない。
 */

/** findById が返すインスタンスを呼び出し側で変更しても保存値が変わらないよう複製する */
const copyJob = (job: ImportJob): ImportJob =>
  Object.assign(Object.create(Object.getPrototypeOf(job)), job, {
    targetProjectIds: [...job.targetProjectIds],
    options: { ...job.options },
  })

const successfulSync: SyncResult = {
  success: true,
  projectId: 'PJ-1',
  recordCount: 1,
  addedCount: 1,
  updatedCount: 0,
  deletedCount: 0,
}

/** 外部から解決できる Promise（実行中のインポートを任意のタイミングで終わらせる） */
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('ImportJobApplicationService', () => {
  let store: Map<string, ImportJob>
  let importJobRepository: jest.Mocked<IImportJobRepository>
  let geppoImportService: jest.Mocked<IGeppoImportApplicationService>
  let wbsSyncService: jest.Mocked<IWbsSyncApplicationService>
  let notificationService: jest.Mocked<INotificationService>
  let wbsApplicationService: jest.Mocked<IWbsApplicationService>
  let service: ImportJobApplicationService

  const seedJob = (
    options: Partial<ImportJobOptions> & { createdBy?: string | null; status?: ImportJobStatus; startedAt?: Date } = {}
  ): ImportJob => {
    const { status, startedAt, ...createOptions } = options
    const job = ImportJob.create({ type: 'WBS', options: {}, ...createOptions })
    const id = `job-${store.size + 1}`
    const seeded = Object.assign(copyJob(job), { id, status: status ?? job.status, startedAt })
    store.set(id, seeded)
    return copyJob(seeded)
  }

  const statusOf = (id: string) => store.get(id)?.status

  /** executeJobAsync で起動したバックグラウンド処理（モックは即時解決）を完了させる */
  const flushBackground = () => new Promise((resolve) => setTimeout(resolve, 0))

  beforeEach(() => {
    store = new Map()

    importJobRepository = {
      create: jest.fn().mockImplementation(async (job: ImportJob) => {
        const id = `job-${store.size + 1}`
        const created = Object.assign(copyJob(job), { id })
        store.set(id, created)
        return copyJob(created)
      }),
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
      updateIfStartable: jest.fn().mockImplementation(async (job: ImportJob) => {
        const current = store.get(job.id)
        if (!current || current.status !== ImportJobStatuses.PENDING) return 'NOT_PENDING'
        const isBusy = Array.from(store.values()).some(
          (other) => other.id !== job.id && other.status === ImportJobStatuses.RUNNING
        )
        if (isBusy) return 'BUSY'
        store.set(job.id, copyJob(job))
        return 'STARTED'
      }),
      findById: jest.fn().mockImplementation(async (id: string) => {
        const job = store.get(id)
        return job ? copyJob(job) : null
      }),
      findAll: jest.fn(),
      findByUser: jest.fn(),
      findByStatus: jest.fn().mockImplementation(async (status: ImportJobStatus) =>
        Array.from(store.values())
          .filter((job) => job.status === status)
          .map(copyJob)
      ),
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
      syncDiff: jest.fn().mockResolvedValue(successfulSync),
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

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('startJob', () => {
    it('PENDINGのジョブを、開始可能であることを条件にRUNNINGへ更新して STARTED を返す', async () => {
      const job = seedJob({ wbsId: 10 })

      const result = await service.startJob(job.id)

      expect(result).toBe('STARTED')
      expect(importJobRepository.updateIfStartable).toHaveBeenCalledWith(
        expect.objectContaining({ id: job.id, status: ImportJobStatuses.RUNNING }),
      )
      expect(statusOf(job.id)).toBe(ImportJobStatuses.RUNNING)
      expect(importJobRepository.addProgress).toHaveBeenCalledWith(
        job.id,
        expect.objectContaining({ message: 'インポートジョブを開始しました' }),
      )
    })

    it('同じジョブへの開始が同時に届いた場合、開始できるのは1件だけ', async () => {
      const job = seedJob({ wbsId: 10 })

      const results = await Promise.all([service.startJob(job.id), service.startJob(job.id)])

      expect(results.filter((result) => result === 'STARTED')).toHaveLength(1)
      expect(statusOf(job.id)).toBe(ImportJobStatuses.RUNNING)
      expect(importJobRepository.addProgress).toHaveBeenCalledTimes(1)
    })

    it('他のジョブが実行中の場合は BUSY を返し、ジョブは PENDING のまま待つ', async () => {
      seedJob({ wbsId: 10, status: ImportJobStatuses.RUNNING, startedAt: new Date() })
      const job = seedJob({ wbsId: 20 })

      const result = await service.startJob(job.id)

      expect(result).toBe('BUSY')
      expect(statusOf(job.id)).toBe(ImportJobStatuses.PENDING)
      expect(importJobRepository.addProgress).not.toHaveBeenCalled()
    })

    it('他の実行者が先に開始していた（条件付き更新で NOT_PENDING）場合は NOT_PENDING を返し、進捗を記録しない', async () => {
      const job = seedJob({ wbsId: 10 })
      importJobRepository.updateIfStartable.mockResolvedValueOnce('NOT_PENDING')

      const result = await service.startJob(job.id)

      expect(result).toBe('NOT_PENDING')
      expect(importJobRepository.addProgress).not.toHaveBeenCalled()
    })

    it('PENDING以外のジョブは更新せず NOT_PENDING を返す', async () => {
      const job = seedJob({ wbsId: 10, status: ImportJobStatuses.COMPLETED })

      const result = await service.startJob(job.id)

      expect(result).toBe('NOT_PENDING')
      expect(importJobRepository.updateIfStartable).not.toHaveBeenCalled()
      expect(importJobRepository.update).not.toHaveBeenCalled()
    })

    it('ジョブが存在しない場合は例外を投げる', async () => {
      await expect(service.startJob('missing')).rejects.toThrow('ジョブが見つかりません')
    })
  })

  describe('createJob - 作成したジョブの自動実行', () => {
    it('実行中のジョブがなければ、作成したジョブを直ちに開始して実行する', async () => {
      const job = await service.createJob({ type: 'WBS', wbsId: 10, options: {} })
      await flushBackground()

      expect(statusOf(job.id)).toBe(ImportJobStatuses.COMPLETED)
      expect(wbsSyncService.syncDiff).toHaveBeenCalledWith(10)
    })

    it('他のジョブが実行中なら PENDING のまま待ち、実行中のジョブが終わると作成順に1件ずつ実行する', async () => {
      const firstSync = deferred<SyncResult>()
      wbsSyncService.syncDiff.mockReturnValueOnce(firstSync.promise)

      const first = await service.createJob({ type: 'WBS', wbsId: 10, options: {} })
      const second = await service.createJob({ type: 'GEPPO', targetMonth: '2026-09', options: {} })
      const third = await service.createJob({ type: 'GEPPO', targetMonth: '2026-10', options: {} })
      await flushBackground()

      expect(statusOf(first.id)).toBe(ImportJobStatuses.RUNNING)
      expect(statusOf(second.id)).toBe(ImportJobStatuses.PENDING)
      expect(statusOf(third.id)).toBe(ImportJobStatuses.PENDING)
      expect(geppoImportService.executeImport).not.toHaveBeenCalled()

      firstSync.resolve(successfulSync)
      await flushBackground()

      expect(statusOf(first.id)).toBe(ImportJobStatuses.COMPLETED)
      expect(statusOf(second.id)).toBe(ImportJobStatuses.COMPLETED)
      expect(statusOf(third.id)).toBe(ImportJobStatuses.COMPLETED)
      expect(geppoImportService.executeImport.mock.calls.map(([options]) => options.targetMonth)).toEqual([
        '2026-09',
        '2026-10',
      ])
    })

    it('ジョブの開始処理で例外が起きても、作成したジョブは返す（後で再実行できる）', async () => {
      importJobRepository.findByStatus.mockRejectedValueOnce(new Error('DB error'))
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const job = await service.createJob({ type: 'WBS', wbsId: 10, options: {} })

      expect(job.id).toBe('job-1')
      expect(statusOf(job.id)).toBe(ImportJobStatuses.PENDING)
    })
  })

  describe('dispatchPendingJobs', () => {
    const NOW = new Date('2026-10-24T01:00:00.000Z')
    const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000)

    it('保留中のジョブが複数あっても、開始するのは作成順で最初の1件だけ', async () => {
      const firstSync = deferred<SyncResult>()
      wbsSyncService.syncDiff.mockReturnValueOnce(firstSync.promise)
      const first = seedJob({ wbsId: 10 })
      const second = seedJob({ wbsId: 20 })

      await service.dispatchPendingJobs(NOW)
      await flushBackground()

      expect(statusOf(first.id)).toBe(ImportJobStatuses.RUNNING)
      expect(statusOf(second.id)).toBe(ImportJobStatuses.PENDING)
    })

    it('タイムアウトした RUNNING ジョブを失敗にしてから、保留中のジョブを開始する', async () => {
      const stale = seedJob({ wbsId: 10, status: ImportJobStatuses.RUNNING, startedAt: minutesAgo(31) })
      const pending = seedJob({ wbsId: 20 })

      await service.dispatchPendingJobs(NOW)
      await flushBackground()

      expect(statusOf(stale.id)).toBe(ImportJobStatuses.FAILED)
      expect(store.get(stale.id)?.errorDetails).toEqual(
        expect.objectContaining({ message: expect.stringContaining('タイムアウト') }),
      )
      expect(statusOf(pending.id)).toBe(ImportJobStatuses.COMPLETED)
    })

    it('タイムアウトしていない RUNNING ジョブがあれば、保留中のジョブは開始しない', async () => {
      const running = seedJob({ wbsId: 10, status: ImportJobStatuses.RUNNING, startedAt: minutesAgo(29) })
      const pending = seedJob({ wbsId: 20 })

      await service.dispatchPendingJobs(NOW)
      await flushBackground()

      expect(statusOf(running.id)).toBe(ImportJobStatuses.RUNNING)
      expect(statusOf(pending.id)).toBe(ImportJobStatuses.PENDING)
      expect(wbsSyncService.syncDiff).not.toHaveBeenCalled()
    })
  })

  describe('executeJobAsync - WBS', () => {
    it('WBS同期が成功した場合はジョブを完了にし、完了通知を送る', async () => {
      const job = seedJob({ wbsId: 10, createdBy: 'user-1' })
      await service.startJob(job.id)

      service.executeJobAsync(job.id)
      await flushBackground()

      expect(statusOf(job.id)).toBe(ImportJobStatuses.COMPLETED)
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

      expect(statusOf(job.id)).toBe(ImportJobStatuses.FAILED)
      expect(notificationService.createNotification).toHaveBeenCalledTimes(1)
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', type: NotificationType.IMPORT_JOB_FAILED }),
      )
    })

    it('実行が終わると、待っていた保留中のジョブを開始する', async () => {
      const job = seedJob({ wbsId: 10 })
      const waiting = seedJob({ type: 'GEPPO', targetMonth: '2026-10' })
      await service.startJob(job.id)

      service.executeJobAsync(job.id)
      await flushBackground()

      expect(statusOf(job.id)).toBe(ImportJobStatuses.COMPLETED)
      expect(statusOf(waiting.id)).toBe(ImportJobStatuses.COMPLETED)
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

    it('createdBy も wbsId もないジョブは担当者を検索せず、誰にも通知しない', async () => {
      const job = seedJob({ type: 'GEPPO', targetMonth: '2026-09', createdBy: null })
      await service.startJob(job.id)

      service.executeJobAsync(job.id)
      await flushBackground()

      expect(statusOf(job.id)).toBe(ImportJobStatuses.COMPLETED)
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
