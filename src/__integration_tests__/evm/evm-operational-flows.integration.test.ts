import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { IEvmService } from '@/applications/evm/evm-service';
import type { IWbsEvmRepository } from '@/applications/evm/iwbs-evm-repository';
import { WbsSyncApplicationService } from '@/applications/wbs-sync/wbs-sync-application-service';
import { GeppoImportApplicationService } from '@/applications/geppo-import/geppo-import-application-service';
import type { IExcelWbsRepository } from '@/applications/wbs-sync/iexcel-wbs-repository';
import type { IGeppoRepository } from '@/applications/geppo/repositories/igeppo-repository';
import type { IWorkRecordApplicationService } from '@/applications/work-record/work-record-application-service';
import type { IProjectMappingService } from '@/applications/geppo-import/iproject-mapping-service';
import type { IUserMappingService } from '@/applications/geppo-import/iuser-mapping-service';
import type { ITaskMappingService } from '@/applications/geppo-import/itask-mapping-service';
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import type { ISyncLogRepository } from '@/applications/wbs-sync/isync-log-repository';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { ITaskApplicationService } from '@/applications/task/task-application-service';
import { ExcelWbs } from '@/domains/sync/excel-wbs';
import type { Geppo } from '@/domains/geppo/types';
import { cleanupTestData, seedTestProject, testIds } from '../helpers';

/**
 * EVM 運用フロー結合テスト
 *
 * 実運用の3パターンをエンドツーエンドで検証する:
 *   フロー1: WBS修正 → mysql.wbs 同期(diff) → EVM確認
 *   フロー2: ガントからのタスク修正（updateTask） → EVM確認
 *   フロー3: 実績記入 → mysql.geppo 取込(replace) → EVM確認
 *
 * MySQL 側（ExcelWbs / Geppo）はスタブにし、Postgres 側は実リポジトリ＋実DBで通す
 * （wbs-sync-application.integration.test.ts と同じ方針）。
 *
 * フロー3末尾の3ケースは調査レポート（docs/reports/evm-operational-reliability-investigation.md
 * バグ1〜3）で実証された既知バグのリグレッションテスト。当初は `it.failing` で
 * バグを文書化し、修正済みのため現在は通常の `it` として「あるべき挙動」を検証する。
 */

const localIds = {
  user1Id: 'evmops-member-001',
  assignee1Id: 0,
  wbsName: `EVMOPS-${Date.now()}`,
};

/** 全31日を0で初期化した geppo 行を作る */
const makeGeppoRow = (overrides: Partial<Geppo>): Geppo => {
  const days = Object.fromEntries(
    Array.from({ length: 31 }, (_, i) => [`day${String(i + 1).padStart(2, '0')}`, 0])
  );
  return {
    MEMBER_ID: localIds.user1Id,
    GEPPO_YYYYMM: '202505',
    ROW_NO: 1,
    PROJECT_ID: localIds.wbsName,
    WBS_NO: undefined,
    ...days,
    ...overrides,
  } as Geppo;
};

const makeExcelRow = (overrides: Partial<ExcelWbs>): ExcelWbs => ({
  ROW_NO: 1,
  PROJECT_ID: localIds.wbsName,
  WBS_ID: 'E1-0001',
  PHASE: 'テストフェーズ',
  ACTIVITY: '',
  TASK: '設計タスク',
  TANTO: null,
  TANTO_REV: null,
  KIJUN_START_DATE: new Date('2025-05-01'),
  KIJUN_END_DATE: new Date('2025-05-31'),
  YOTEI_START_DATE: new Date('2025-05-01'),
  YOTEI_END_DATE: new Date('2025-05-31'),
  JISSEKI_START_DATE: null,
  JISSEKI_END_DATE: null,
  KIJUN_KOSU: 20,
  YOTEI_KOSU: 20,
  JISSEKI_KOSU: null,
  KIJUN_KOSU_BUFFER: null,
  STATUS: '着手中',
  BIKO: null,
  PROGRESS_RATE: 30,
  ...overrides,
});

describe('EVM 運用フロー結合テスト', () => {
  let evmService: IEvmService;
  let wbsEvmRepository: IWbsEvmRepository;
  let taskRepository: ITaskRepository;
  let syncService: WbsSyncApplicationService;
  let geppoImportService: GeppoImportApplicationService;
  let taskAppService: ITaskApplicationService;

  // テストごとに差し替えるスタブデータ
  let excelRows: ExcelWbs[] = [];
  let geppoRows: Geppo[] = [];

  beforeAll(async () => {
    evmService = container.get<IEvmService>(SYMBOL.IEvmService);
    wbsEvmRepository = container.get<IWbsEvmRepository>(SYMBOL.IWbsEvmRepository);
    taskRepository = container.get<ITaskRepository>(SYMBOL.ITaskRepository);
    taskAppService = container.get<ITaskApplicationService>(SYMBOL.ITaskApplicationService);

    // 前回失敗時の残骸を防御的に掃除（userId は固定のため）
    await global.prisma.workRecord.deleteMany({ where: { userId: localIds.user1Id } });

    await global.prisma.users.upsert({
      where: { id: localIds.user1Id },
      update: {},
      create: {
        id: localIds.user1Id,
        email: 'evmops-member-001@example.com',
        name: '運用テスト太郎',
        displayName: '運用テスト太郎',
      },
    });

    await seedTestProject(global.prisma);
    // geppo.PROJECT_ID とのマッピングは wbs.name 完全一致のため、一意な名前に更新
    await global.prisma.wbs.update({
      where: { id: testIds.wbsId },
      data: { name: localIds.wbsName },
    });

    const assignee = await global.prisma.wbsAssignee.create({
      data: {
        wbsId: testIds.wbsId,
        assigneeId: localIds.user1Id,
        rate: 1.0,
        costPerHour: 5000,
        seq: 1,
      },
    });
    localIds.assignee1Id = assignee.id;

    const excelStub: IExcelWbsRepository = {
      findByWbsName: async () => excelRows,
      findDeletedSince: async () => [],
    };
    syncService = new WbsSyncApplicationService(
      container.get<IWbsRepository>(SYMBOL.IWbsRepository),
      excelStub,
      container.get<ISyncLogRepository>(SYMBOL.ISyncLogRepository),
      container.get<IPhaseRepository>(SYMBOL.IPhaseRepository),
      container.get<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository),
      taskRepository,
    );

    const geppoStub: IGeppoRepository = {
      searchWorkEntries: async () => ({
        geppos: geppoRows,
        total: geppoRows.length,
        page: 1,
        limit: 10000,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
      testConnection: async () => true,
    };
    geppoImportService = new GeppoImportApplicationService(
      geppoStub,
      container.get<IWorkRecordApplicationService>(SYMBOL.IWorkRecordApplicationService),
      container.get<IProjectMappingService>(SYMBOL.ProjectMappingService),
      container.get<IUserMappingService>(SYMBOL.UserMappingService),
      container.get<ITaskMappingService>(SYMBOL.TaskMappingService),
    );
  });

  afterAll(async () => {
    await global.prisma.workRecord
      .deleteMany({ where: { userId: localIds.user1Id } })
      .catch(() => {});
    await global.prisma.taskProgressSnapshot
      .deleteMany({ where: { wbsId: testIds.wbsId } })
      .catch(() => {});
    await global.prisma.syncLog
      .deleteMany({ where: { projectId: testIds.projectId } })
      .catch(() => {});
    await global.prisma.wbsTask
      .deleteMany({ where: { wbsId: testIds.wbsId } })
      .catch(() => {});
    await global.prisma.wbsAssignee
      .deleteMany({ where: { id: localIds.assignee1Id } })
      .catch(() => {});
    await cleanupTestData(global.prisma);
    await global.prisma.users
      .deleteMany({ where: { id: localIds.user1Id } })
      .catch(() => {});
  });

  // ==========================================================================
  // フロー1: WBS修正 → mysql.wbs 同期(diff) → EVM確認
  // ==========================================================================
  describe('フロー1: WBS同期(diff) → EVM', () => {
    let sync1SnapshotIds: number[] = [];

    it('初回同期直後（実績ゼロ）: PV/BACは立つが、カードのEVは実績が無い限り0（EVゲート）', async () => {
      excelRows = [makeExcelRow({ WBS_ID: 'E1-0001', PROGRESS_RATE: 30 })];
      const result = await syncService.syncDiff(testIds.wbsId);
      expect(result.success).toBe(true);

      // 予定終了日(5/31)を過ぎた評価日
      const metrics = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId,
        new Date('2025-06-15T00:00:00Z')
      );

      expect(metrics.pv).toBeCloseTo(20, 5);
      expect(metrics.pv_base).toBeCloseTo(20, 5);
      expect(metrics.bac).toBeCloseTo(20, 5);
      // 【運用上の重要挙動】ライブ計算のEVは actualStartDate（= WorkRecord の最小日付）
      // でゲートされるため、進捗率30%が同期されていても実績(geppo)未取込ならEV=0。
      // → SPI=0 / healthStatus=critical になる（「WBS同期だけしてEVM確認」の落とし穴）
      expect(metrics.ev).toBe(0);
      expect(metrics.spi).toBe(0);
      expect(metrics.cpi).toBeNull();
      expect(metrics.healthStatus).toBe('critical');
    });

    it('実績（作業記録）が入るとEVゲートが解除され EV = 予定工数 × 進捗率', async () => {
      await global.prisma.workRecord.create({
        data: {
          userId: localIds.user1Id,
          taskId: (await global.prisma.wbsTask.findFirstOrThrow({
            where: { wbsId: testIds.wbsId, taskNo: 'E1-0001' },
          })).id,
          wbsId: testIds.wbsId,
          date: new Date('2025-05-02T00:00:00Z'),
          hours_worked: 4,
        },
      });

      const metrics = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId,
        new Date('2025-06-15T00:00:00Z')
      );
      expect(metrics.ev).toBeCloseTo(20 * 0.3, 5); // 6h
      expect(metrics.ac).toBeCloseTo(4, 5);
    });

    it('再同期で進捗更新: 時系列は同期時点スナップショットのas-of値で再現され、履歴が保たれる', async () => {
      // 同期1のスナップショットを 2025-05-10 に遡及（同期実行日はテスト実行日のため）
      const snaps1 = await global.prisma.taskProgressSnapshot.findMany({
        where: { wbsId: testIds.wbsId },
      });
      sync1SnapshotIds = snaps1.map((s) => s.id);
      await global.prisma.taskProgressSnapshot.updateMany({
        where: { id: { in: sync1SnapshotIds } },
        data: { snapshotAt: new Date('2025-05-10T12:00:00Z') },
      });

      // 同期2: 進捗 30% → 60%
      excelRows = [makeExcelRow({ WBS_ID: 'E1-0001', PROGRESS_RATE: 60 })];
      const result = await syncService.syncDiff(testIds.wbsId);
      expect(result.success).toBe(true);

      // 同期2のスナップショットを 2025-05-20 に遡及
      await global.prisma.taskProgressSnapshot.updateMany({
        where: { wbsId: testIds.wbsId, id: { notIn: sync1SnapshotIds } },
        data: { snapshotAt: new Date('2025-05-20T12:00:00Z') },
      });

      const series = await evmService.getEvmTimeSeries(
        testIds.wbsId,
        new Date('2025-05-12T00:00:00Z'),
        new Date('2025-05-25T00:00:00Z'),
        'daily',
        'hours',
        'SELF_REPORTED'
      );

      const at = (iso: string) =>
        series.find((m) => m.date.toISOString().startsWith(iso))!;

      // 5/15: 同期1（30%）時点の値で再現される（現在の60%で書き換わらない）
      expect(at('2025-05-15').ev).toBeCloseTo(20 * 0.3, 5);
      // 5/25: 同期2（60%）が反映される
      expect(at('2025-05-25').ev).toBeCloseTo(20 * 0.6, 5);
      // PVはスナップショットの予定期間から按分（5/15時点: 経過14日/総30日）
      expect(at('2025-05-15').pv).toBeCloseTo(20 * (14 / 30), 5);

      // 現在カードは最新進捗60%
      const current = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId,
        new Date('2025-06-15T00:00:00Z')
      );
      expect(current.ev).toBeCloseTo(12, 5);
    });

    it('【運用注意】Excel側の進捗が空(null)のまま同期すると進捗0にリセットされEVが消える', async () => {
      excelRows = [makeExcelRow({ WBS_ID: 'E1-0001', PROGRESS_RATE: null })];
      const result = await syncService.syncDiff(testIds.wbsId);
      expect(result.success).toBe(true);

      const task = await global.prisma.wbsTask.findFirstOrThrow({
        where: { wbsId: testIds.wbsId, taskNo: 'E1-0001' },
      });
      // applySyncDiff は progressRate ?? 0 で明示リセットする（Excelが唯一の真実源）
      expect(Number(task.progressRate)).toBe(0);

      const metrics = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId,
        new Date('2025-06-15T00:00:00Z')
      );
      expect(metrics.ev).toBe(0);
    });

    it('【運用注意】タスクNo変更（採番変更）: カードEVは0に落ちるが、時系列as-ofはEVを保持し両者が食い違う。ACは維持', async () => {
      // E1-0001 → E1-0002 へ採番変更（実体は同じ作業のつもり）
      excelRows = [makeExcelRow({ WBS_ID: 'E1-0002', PROGRESS_RATE: 60 })];
      const result = await syncService.syncDiff(testIds.wbsId);
      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1); // 新taskNoは新規タスク
      expect(result.deletedCount).toBe(1); // 旧taskNoはtombstone化

      const now = new Date();
      const current = await evmService.calculateCurrentEvmMetrics(testIds.wbsId, now);
      // 新タスク(E1-0002)には作業実績が紐付いていないため、カードのEVは0に落ちる
      expect(current.ev).toBe(0);
      // ACは旧タスク経由(task.wbsId)で拾われ消えない
      expect(current.ac).toBeCloseTo(4, 5);

      // 一方、as-of時系列は新タスクのスナップショット（直接EV・ゲートなし）で 20×60%=12 を示す
      // → カード(0)と時系列末尾(12)が食い違う。採番変更運用時の既知の混乱ポイント。
      const dayBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const series = await evmService.getEvmTimeSeries(
        testIds.wbsId, dayBefore, now, 'daily', 'hours', 'SELF_REPORTED'
      );
      const last = series[series.length - 1];
      expect(last.ev).toBeCloseTo(12, 5);
    });
  });

  // ==========================================================================
  // フロー2: ガントからのタスク修正（updateTask） → EVM確認
  // ==========================================================================
  describe('フロー2: ガント編集（updateTask） → EVM', () => {
    let taskId = 0;
    let firstSnapshotIds: number[] = [];

    beforeAll(async () => {
      const task = await global.prisma.wbsTask.create({
        data: {
          taskNo: 'G2-0001',
          wbsId: testIds.wbsId,
          phaseId: testIds.phaseId,
          name: 'ガント編集対象タスク',
          status: 'IN_PROGRESS',
          progressRate: 40,
          periods: {
            create: [
              {
                startDate: new Date('2025-06-02'),
                endDate: new Date('2025-06-27'),
                type: 'KIJUN',
                kosus: { create: [{ wbsId: testIds.wbsId, kosu: 20, type: 'NORMAL' }] },
              },
              {
                startDate: new Date('2025-06-02'),
                endDate: new Date('2025-06-27'),
                type: 'YOTEI',
                kosus: { create: [{ wbsId: testIds.wbsId, kosu: 20, type: 'NORMAL' }] },
              },
            ],
          },
        },
      });
      taskId = task.id;

      // EVゲート解除用の実績
      await global.prisma.workRecord.create({
        data: {
          userId: localIds.user1Id,
          taskId,
          wbsId: testIds.wbsId,
          date: new Date('2025-06-03T00:00:00Z'),
          hours_worked: 5,
        },
      });
    });

    it('ガント相当の更新は手動スナップショット(syncLogId=null)を残す', async () => {
      // 1回目の更新（進捗40%のまま予定を保存 = スナップショット世代1）
      const res1 = await taskAppService.updateTask({
        wbsId: testIds.wbsId,
        updateTask: {
          id: taskId,
          taskNo: 'G2-0001',
          name: 'ガント編集対象タスク',
          status: 'IN_PROGRESS',
          phaseId: testIds.phaseId,
          yoteiStart: new Date('2025-06-02T00:00:00Z'),
          yoteiEnd: new Date('2025-06-27T00:00:00Z'),
          yoteiKosu: 20,
          progressRate: 40,
        },
      });
      expect(res1.success).toBe(true);

      const snaps = await global.prisma.taskProgressSnapshot.findMany({
        where: { wbsId: testIds.wbsId, taskId },
      });
      expect(snaps).toHaveLength(1);
      expect(snaps[0].syncLogId).toBeNull(); // 手動編集の印
      firstSnapshotIds = snaps.map((s) => s.id);
      await global.prisma.taskProgressSnapshot.updateMany({
        where: { id: { in: firstSnapshotIds } },
        data: { snapshotAt: new Date('2025-06-10T12:00:00Z') },
      });
    });

    it('予定工数・期間を変更してもBAC(基準)は不変。過去時系列はスナップショットの当時予定工数で固定', async () => {
      // 2回目の更新: 予定工数 20h→30h、終了日を 7/11 へ延長、進捗 40%→50%
      const res2 = await taskAppService.updateTask({
        wbsId: testIds.wbsId,
        updateTask: {
          id: taskId,
          taskNo: 'G2-0001',
          name: 'ガント編集対象タスク',
          status: 'IN_PROGRESS',
          phaseId: testIds.phaseId,
          yoteiStart: new Date('2025-06-02T00:00:00Z'),
          yoteiEnd: new Date('2025-07-11T00:00:00Z'),
          yoteiKosu: 30,
          progressRate: 50,
        },
      });
      expect(res2.success).toBe(true);

      await global.prisma.taskProgressSnapshot.updateMany({
        where: { wbsId: testIds.wbsId, taskId, id: { notIn: firstSnapshotIds } },
        data: { snapshotAt: new Date('2025-06-20T12:00:00Z') },
      });

      // 現在カード: PVは新予定(30h)基準へ即反映、BACは基準(KIJUN 20h)のまま動かない
      const current = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId,
        new Date('2025-07-20T00:00:00Z')
      );
      const otherBac = 20; // フロー1のタスク（E1-0002: KIJUN 20h）
      expect(current.bac).toBeCloseTo(otherBac + 20, 5);
      expect(current.pv).toBeCloseTo(20 /* E1-0002 */ + 30, 5);
      // EV = 30h × 50%（EVの母数は予定工数。予定増額は過去に遡ってEVを増やす点に注意）
      // ※E1-0002はライブEV=0（実績未紐付け）のため合計に寄与しない
      expect(current.ev).toBeCloseTo(30 * 0.5, 5);

      // 過去時系列: 6/15 は世代1スナップショット（20h × 40% = 8h）で固定＝履歴が書き換わらない
      const series = await evmService.getEvmTimeSeries(
        testIds.wbsId,
        new Date('2025-06-12T00:00:00Z'),
        new Date('2025-06-25T00:00:00Z'),
        'daily',
        'hours',
        'SELF_REPORTED'
      );
      const at = (iso: string) =>
        series.find((m) => m.date.toISOString().startsWith(iso))!;
      // 2025-06時点のas-ofには旧タスクE1-0001のスナップショット（60%×20h=12h）が
      // 残っている（tombstoneはテスト実行日時点のため6月には効かない）。
      // その12hを差し引いて G2-0001 単体の寄与を確認する。
      expect(at('2025-06-15').ev - 12).toBeCloseTo(20 * 0.4, 5);
      expect(at('2025-06-25').ev - 12).toBeCloseTo(30 * 0.5, 5);
    });
  });

  // ==========================================================================
  // フロー3: 実績記入 → mysql.geppo 取込(replace) → EVM確認
  // ==========================================================================
  describe('フロー3: geppo取込(replace) → EVM', () => {
    let taskId = 0;

    beforeAll(async () => {
      const task = await global.prisma.wbsTask.create({
        data: {
          taskNo: 'E3-0001',
          wbsId: testIds.wbsId,
          phaseId: testIds.phaseId,
          name: 'geppo取込対象タスク',
          status: 'IN_PROGRESS',
          progressRate: 50,
          periods: {
            create: [
              {
                startDate: new Date('2025-08-01'),
                endDate: new Date('2025-08-31'),
                type: 'KIJUN',
                kosus: { create: [{ wbsId: testIds.wbsId, kosu: 40, type: 'NORMAL' }] },
              },
              {
                startDate: new Date('2025-08-01'),
                endDate: new Date('2025-08-31'),
                type: 'YOTEI',
                kosus: { create: [{ wbsId: testIds.wbsId, kosu: 40, type: 'NORMAL' }] },
              },
            ],
          },
        },
      });
      taskId = task.id;
    });

    it('取込でWorkRecordが作られ、ACとEVゲートに反映される', async () => {
      geppoRows = [
        makeGeppoRow({
          GEPPO_YYYYMM: '202508',
          WBS_NO: 'E3-0001',
          day01: 8,
          day02: 7.5,
        }),
      ];
      const result = await geppoImportService.executeImport({
        targetMonth: '2025-08',
        updateMode: 'replace',
        dryRun: false,
      });
      expect(result.errorCount).toBe(0);
      expect(result.createdCount).toBe(2);

      const records = await global.prisma.workRecord.findMany({
        where: { userId: localIds.user1Id, taskId },
        orderBy: { date: 'asc' },
      });
      expect(records).toHaveLength(2);
      expect(records[0].date.toISOString()).toBe('2025-08-01T00:00:00.000Z');
      expect(records[0].wbsId).toBe(testIds.wbsId);

      const acMap = await wbsEvmRepository.getActualCostByDate(
        testIds.wbsId,
        new Date('2025-08-01T00:00:00Z'),
        new Date('2025-08-31T00:00:00Z'),
        'hours'
      );
      const acAug = Array.from(acMap.values()).reduce((a, b) => a + b, 0);
      expect(acAug).toBeCloseTo(15.5, 5);
    });

    it('同月を再取込してもACが二重計上されない（replaceの冪等性・正常系）', async () => {
      const result = await geppoImportService.executeImport({
        targetMonth: '2025-08',
        updateMode: 'replace',
        dryRun: false,
      });
      expect(result.deletedCount).toBe(2);
      expect(result.createdCount).toBe(2);

      const acMap = await wbsEvmRepository.getActualCostByDate(
        testIds.wbsId,
        new Date('2025-08-01T00:00:00Z'),
        new Date('2025-08-31T00:00:00Z'),
        'hours'
      );
      const acAug = Array.from(acMap.values()).reduce((a, b) => a + b, 0);
      expect(acAug).toBeCloseTo(15.5, 5);
    });

    it('WBS_NOがタスクに一致しない実績も、WBS合計ACには計上される（taskId=null / wbsId直付け）', async () => {
      geppoRows = [
        makeGeppoRow({
          GEPPO_YYYYMM: '202510',
          WBS_NO: 'NO-SUCH-TASK',
          day05: 3,
        }),
      ];
      const result = await geppoImportService.executeImport({
        targetMonth: '2025-10',
        updateMode: 'replace',
        dryRun: false,
      });
      expect(result.createdCount).toBe(1);

      const record = await global.prisma.workRecord.findFirstOrThrow({
        where: { userId: localIds.user1Id, date: new Date('2025-10-05T00:00:00Z') },
      });
      expect(record.taskId).toBeNull();
      expect(record.wbsId).toBe(testIds.wbsId);

      // タスク別集計では null キー（内訳の「未紐付け・削除済み」行）に寄る
      const byTask = await wbsEvmRepository.getActualCostByTask(
        testIds.wbsId,
        new Date('2025-10-31T00:00:00Z'),
        'hours'
      );
      expect(byTask.get(null)).toBeCloseTo(3, 5);
    });

    // ------------------------------------------------------------------
    // 以下は調査レポートのバグ1〜3のリグレッションテスト
    // ------------------------------------------------------------------

    it('【バグ1修正】wbsId未設定の旧形式実績が残っていても、再取込でACが二重計上されない', async () => {
      // wbsId列追加(2026-05-26)以前の旧データや手動登録を模擬:
      // taskIdはあるが wbsId が null の実績
      await global.prisma.workRecord.create({
        data: {
          userId: localIds.user1Id,
          taskId,
          wbsId: null,
          date: new Date('2025-06-02T00:00:00Z'),
          hours_worked: 8,
        },
      });

      // 同じ作業が geppo にも記入されており、月次取込される
      geppoRows = [
        makeGeppoRow({ GEPPO_YYYYMM: '202506', WBS_NO: 'E3-0001', day02: 8 }),
      ];
      await geppoImportService.executeImport({
        targetMonth: '2025-06',
        updateMode: 'replace',
        dryRun: false,
      });

      // replaceの削除条件はAC集計と同じ「タスク経由 OR wbsId直付け」（work-record-repository）。
      // wbsId=null の旧行も task.wbsId 経由で置換対象になり、6月のACは8hのまま。
      const acMap = await wbsEvmRepository.getActualCostByDate(
        testIds.wbsId,
        new Date('2025-06-01T00:00:00Z'),
        new Date('2025-06-30T00:00:00Z'),
        'hours'
      );
      const junTaskAc = acMap.get('2025-06-02') ?? 0;
      expect(junTaskAc).toBeCloseTo(8, 5);
    });

    it('【バグ2修正】月の実績を全て0時間に訂正して再取込すると、旧実績が削除されACが0になる', async () => {
      // 9月: まず6hを取込
      geppoRows = [
        makeGeppoRow({ GEPPO_YYYYMM: '202509', WBS_NO: 'E3-0001', day01: 6 }),
      ];
      await geppoImportService.executeImport({
        targetMonth: '2025-09',
        updateMode: 'replace',
        dryRun: false,
      });

      // geppo側で当月の実績を全て0に訂正 → 再取込
      geppoRows = [
        makeGeppoRow({ GEPPO_YYYYMM: '202509', WBS_NO: 'E3-0001' /* 全日0 */ }),
      ];
      const result = await geppoImportService.executeImport({
        targetMonth: '2025-09',
        updateMode: 'replace',
        dryRun: false,
      });

      // 削除対象ユーザーは「変換後WorkRecordを持つユーザー」ではなく
      // 「対象geppo行のマッピング成功メンバー全員」のため、全日0時間に訂正した
      // ユーザーの旧実績も削除され、当月ACは0になる。
      expect(result.deletedCount).toBe(1); // 旧6hの行
      expect(result.createdCount).toBe(0);

      const acMap = await wbsEvmRepository.getActualCostByDate(
        testIds.wbsId,
        new Date('2025-09-01T00:00:00Z'),
        new Date('2025-09-30T00:00:00Z'),
        'hours'
      );
      const acSep = Array.from(acMap.values()).reduce((a, b) => a + b, 0);
      expect(acSep).toBe(0);
    });

    it('【バグ3修正】存在しない日（30日月のday31等）の実績が翌月へロールオーバーして累積しない', async () => {
      // 11月(30日月)のday31に誤入力がある geppo 行
      geppoRows = [
        makeGeppoRow({ GEPPO_YYYYMM: '202511', WBS_NO: 'E3-0001', day31: 5 }),
      ];
      const result1 = await geppoImportService.executeImport({
        targetMonth: '2025-11',
        updateMode: 'replace',
        dryRun: false,
      });
      // 再取込（運用ではよくある）
      const result2 = await geppoImportService.executeImport({
        targetMonth: '2025-11',
        updateMode: 'replace',
        dryRun: false,
      });

      // 月の実日数を超える日はエラー計上でスキップされ（黙って捨てず取込結果で気づける）、
      // Date.UTC の繰り上がりによる翌月1日のレコードは生えない。
      expect(result1.errorCount).toBe(1);
      expect(result1.createdCount).toBe(0);
      expect(result2.errorCount).toBe(1);
      expect(result2.createdCount).toBe(0);

      const rolled = await global.prisma.workRecord.findMany({
        where: {
          userId: localIds.user1Id,
          date: { gte: new Date('2025-12-01T00:00:00Z') },
        },
      });
      expect(rolled).toHaveLength(0);
    });
  });
});
