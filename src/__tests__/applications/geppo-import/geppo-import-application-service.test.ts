import { GeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service'
import type { IGeppoRepository } from '@/applications/geppo/repositories/igeppo-repository'
import type { IWorkRecordApplicationService } from '@/applications/work-record/work-record-application-service'
import type { IProjectMappingService } from '@/applications/geppo-import/iproject-mapping-service'
import type { IUserMappingService } from '@/applications/geppo-import/iuser-mapping-service'
import type { ITaskMappingService } from '@/applications/geppo-import/itask-mapping-service'
import type { Geppo } from '@/domains/geppo/types'

/**
 * Geppoインポートの運用信頼性バグ（docs/reports/evm-operational-reliability-investigation.md
 * バグ2・バグ3）に対するユニットテスト。
 *
 * - バグ2: replaceの削除対象ユーザーは「対象geppo行のマッピング成功メンバー全員」。
 *   変換後WorkRecord(>0h)を持つユーザーに限定すると、全日0時間に訂正した月の
 *   旧実績が削除されず残り続ける。
 * - バグ3: 月の実日数を超える日（30日月のday31等）は取り込まずエラー計上する。
 *   Date.UTCの繰り上がりで翌月1日の実績になると、月範囲replaceの削除対象外で
 *   再取込のたびに増殖する。
 *
 * エンドツーエンドの再現は evm-operational-flows.integration.test.ts を参照。
 */

const WBS_NAME = 'PROJ-A'
const WBS_ID = 10

/** 全31日を0で初期化した geppo 行を作る */
const makeGeppo = (overrides: Partial<Geppo>): Geppo => {
  const days = Object.fromEntries(
    Array.from({ length: 31 }, (_, i) => [`day${String(i + 1).padStart(2, '0')}`, 0])
  )
  return {
    MEMBER_ID: 'member-1',
    GEPPO_YYYYMM: '202509',
    ROW_NO: 1,
    PROJECT_ID: WBS_NAME,
    WBS_NO: 'A1-0001',
    ...days,
    ...overrides,
  } as Geppo
}

describe('GeppoImportApplicationService', () => {
  let geppoRepository: jest.Mocked<IGeppoRepository>
  let workRecordService: jest.Mocked<IWorkRecordApplicationService>
  let projectMappingService: jest.Mocked<IProjectMappingService>
  let userMappingService: jest.Mocked<IUserMappingService>
  let taskMappingService: jest.Mocked<ITaskMappingService>
  let service: GeppoImportApplicationService

  // テストごとに差し替えるスタブデータ
  let geppoRows: Geppo[] = []

  beforeEach(() => {
    geppoRows = []

    geppoRepository = {
      searchWorkEntries: jest.fn(async () => ({
        geppos: geppoRows,
        total: geppoRows.length,
        page: 1,
        limit: 10000,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      })),
      testConnection: jest.fn(async () => true),
    }

    workRecordService = {
      getWorkRecords: jest.fn(),
      bulkCreate: jest.fn(async () => undefined),
      bulkUpsert: jest.fn(async () => ({ created: 0, updated: 0 })),
      deleteByUserAndDateRange: jest.fn(async () => 0),
    }

    projectMappingService = {
      // wbs.name 完全一致マッピングのスタブ（PROJ-A → wbsId=10）
      createProjectMap: jest.fn(async (ids: string[]) =>
        new Map(ids.filter((id) => id === WBS_NAME).map((id) => [id, String(WBS_ID)]))
      ),
      filterGeppoByTargetProjects: jest.fn(async (records: Geppo[]) => records),
      getAvailableProjectsForImport: jest.fn(),
      validateProjectMapping: jest.fn(async () => ({
        totalProjects: 1,
        mappedCount: 1,
        unmappedCount: 0,
        mappedProjects: [WBS_NAME],
        unmappedProjects: [],
        mappingRate: 1,
      })),
    }

    userMappingService = {
      createUserMap: jest.fn(async (memberIds: string[]) =>
        new Map(memberIds.map((m) => [m, `user-${m}`]))
      ),
      validateUserMapping: jest.fn(async (memberIds: string[]) => ({
        totalUsers: memberIds.length,
        mappedUsers: memberIds.length,
        unmappedUsers: [],
        mappingRate: 1,
      })),
    }

    taskMappingService = {
      createTaskMap: jest.fn(async () => new Map<string, number>()),
      validateTaskMapping: jest.fn(async () => ({
        totalTasks: 0,
        mappedTasks: 0,
        unmappedTasks: [],
        mappingRate: 1,
      })),
    }

    service = new GeppoImportApplicationService(
      geppoRepository,
      workRecordService,
      projectMappingService,
      userMappingService,
      taskMappingService
    )
  })

  describe('replaceモードの削除対象ユーザー（バグ2）', () => {
    it('全日0時間へ訂正したユーザーも削除対象になり、当月の旧実績が削除される', async () => {
      geppoRows = [makeGeppo({ GEPPO_YYYYMM: '202509' /* 全日0 */ })]
      workRecordService.deleteByUserAndDateRange.mockResolvedValue(1)

      const result = await service.executeImport({
        targetMonth: '2025-09',
        updateMode: 'replace',
        dryRun: false,
      })

      expect(workRecordService.deleteByUserAndDateRange).toHaveBeenCalledWith(
        ['user-member-1'],
        new Date('2025-09-01T00:00:00.000Z'),
        new Date('2025-09-30T00:00:00.000Z'),
        [WBS_ID]
      )
      expect(result.deletedCount).toBe(1)
      expect(result.createdCount).toBe(0)
    })

    it('実績ありユーザーと全日0時間ユーザーが混在しても、マッピング成功メンバー全員が削除対象になる', async () => {
      geppoRows = [
        makeGeppo({ MEMBER_ID: 'member-1', day01: 4 }),
        makeGeppo({ MEMBER_ID: 'member-2', ROW_NO: 2 /* 全日0 */ }),
      ]

      await service.executeImport({
        targetMonth: '2025-09',
        updateMode: 'replace',
        dryRun: false,
      })

      expect(workRecordService.deleteByUserAndDateRange).toHaveBeenCalledTimes(1)
      const [userIds] = workRecordService.deleteByUserAndDateRange.mock.calls[0]
      expect(userIds).toHaveLength(2)
      expect(userIds).toEqual(
        expect.arrayContaining(['user-member-1', 'user-member-2'])
      )
    })

    it('全期間取込（targetMonthなし）の削除範囲は対象geppo行の月範囲（先頭月の初日〜最終月の末日）になる', async () => {
      // 端の月（5月）が全日0時間でも削除範囲に含まれること
      geppoRows = [
        makeGeppo({ GEPPO_YYYYMM: '202505' /* 全日0 */ }),
        makeGeppo({ GEPPO_YYYYMM: '202507', ROW_NO: 2, day10: 3 }),
      ]

      await service.executeImport({
        updateMode: 'replace',
        dryRun: false,
      })

      expect(workRecordService.deleteByUserAndDateRange).toHaveBeenCalledWith(
        ['user-member-1'],
        new Date('2025-05-01T00:00:00.000Z'),
        new Date('2025-07-31T00:00:00.000Z'),
        [WBS_ID]
      )
    })
  })

  describe('日次展開と月の実日数（バグ3）', () => {
    it('30日月のday31はエラー計上でスキップされ、翌月1日のレコードは作られない', async () => {
      geppoRows = [makeGeppo({ GEPPO_YYYYMM: '202511', day30: 2, day31: 5 })]

      const result = await service.executeImport({
        targetMonth: '2025-11',
        updateMode: 'replace',
        dryRun: false,
      })

      expect(result.errorCount).toBe(1)
      expect(result.errors[0].errorType).toBe('INVALID_DATA')
      expect(result.errors[0].memberId).toBe('member-1')

      // 有効日（11/30）のみ作成され、12/1へのロールオーバーは発生しない
      expect(result.createdCount).toBe(1)
      const created = workRecordService.bulkCreate.mock.calls[0][0]
      expect(created).toHaveLength(1)
      expect(created[0].startDate!.toISOString()).toBe('2025-11-30T00:00:00.000Z')
    })

    it('2月29日は閏年のみ有効（非閏年はエラー計上でスキップ）', async () => {
      geppoRows = [makeGeppo({ GEPPO_YYYYMM: '202402', day29: 1 })]
      const leap = await service.executeImport({
        targetMonth: '2024-02',
        updateMode: 'replace',
        dryRun: true,
      })
      expect(leap.errorCount).toBe(0)
      expect(leap.totalWorkRecords).toBe(1)

      geppoRows = [makeGeppo({ GEPPO_YYYYMM: '202502', day29: 1 })]
      const nonLeap = await service.executeImport({
        targetMonth: '2025-02',
        updateMode: 'replace',
        dryRun: true,
      })
      expect(nonLeap.errorCount).toBe(1)
      expect(nonLeap.totalWorkRecords).toBe(0)
    })

    it('validateImportDataのexpectedWorkRecordsは実日数超の日を件数に含めない', async () => {
      geppoRows = [makeGeppo({ GEPPO_YYYYMM: '202511', day01: 1, day31: 5 })]

      const validation = await service.validateImportData({
        targetMonth: '2025-11',
        updateMode: 'replace',
        dryRun: false,
      })

      expect(validation.isValid).toBe(true)
      expect(validation.statistics.expectedWorkRecords).toBe(1)
    })
  })
})
