import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { WbsSyncApplicationService } from '@/applications/wbs-sync/wbs-sync-application.service';
import { ExcelWbs } from '@/domains/sync/ExcelWbs';
import type { IExcelWbsRepository } from '@/applications/wbs-sync/IExcelWbsRepository';
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import type { ISyncLogRepository } from '@/applications/wbs-sync/ISyncLogRepository';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import { cleanupTestData, seedTestProject, testIds } from '../../helpers';

/**
 * WbsSyncApplicationService.syncDiff をアプリケーションサービス層から検証する統合テスト。
 * Excelソース(IExcelWbsRepository)はスタブにし、他は実リポジトリ＋実DBで通す。
 */
describe('WbsSyncApplicationService.syncDiff（統合・Excelスタブ）', () => {
  let service: WbsSyncApplicationService;
  let taskRepository: ITaskRepository;
  // スタブが返すExcel行（テストごとに差し替える）
  let excelRows: ExcelWbs[] = [];

  const makeRow = (overrides: Partial<ExcelWbs>): ExcelWbs => ({
    ROW_NO: 1,
    PROJECT_ID: testIds.projectId,
    WBS_ID: 'D1-0001',
    PHASE: 'テストフェーズ', // seedのフェーズ名に一致させる
    ACTIVITY: '',
    TASK: 'タスク',
    TANTO: null,
    TANTO_REV: null,
    KIJUN_START_DATE: new Date('2025-05-01'),
    KIJUN_END_DATE: new Date('2025-05-31'),
    YOTEI_START_DATE: new Date('2025-05-01'),
    YOTEI_END_DATE: new Date('2025-05-31'),
    JISSEKI_START_DATE: null,
    JISSEKI_END_DATE: null,
    KIJUN_KOSU: 10,
    YOTEI_KOSU: 20,
    JISSEKI_KOSU: null,
    KIJUN_KOSU_BUFFER: null,
    STATUS: '着手中',
    BIKO: null,
    PROGRESS_RATE: 30,
    ...overrides,
  });

  beforeAll(async () => {
    await seedTestProject(global.prisma);

    const excelStub: IExcelWbsRepository = {
      findByWbsName: async () => excelRows,
      findDeletedSince: async () => [],
    };

    service = new WbsSyncApplicationService(
      container.get<IWbsRepository>(SYMBOL.IWbsRepository),
      excelStub,
      container.get<ISyncLogRepository>(SYMBOL.ISyncLogRepository),
      container.get<IPhaseRepository>(SYMBOL.IPhaseRepository),
      container.get<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository),
      container.get<ITaskRepository>(SYMBOL.ITaskRepository),
    );
    taskRepository = container.get<ITaskRepository>(SYMBOL.ITaskRepository);
  });

  afterAll(async () => {
    await global.prisma.taskProgressSnapshot
      .deleteMany({ where: { wbsId: testIds.wbsId } })
      .catch(() => {});
    await global.prisma.syncLog
      .deleteMany({ where: { projectId: testIds.projectId } })
      .catch(() => {});
    await global.prisma.wbsTask
      .deleteMany({ where: { wbsId: testIds.wbsId } })
      .catch(() => {});
    await cleanupTestData(global.prisma);
  });

  it('初回同期：全件createされ、スナップショットが記録される', async () => {
    excelRows = [
      makeRow({ WBS_ID: 'D1-0001', ROW_NO: 1, PROGRESS_RATE: 30, STATUS: '着手中' }),
      makeRow({ WBS_ID: 'D1-0002', ROW_NO: 2, PROGRESS_RATE: 0, STATUS: '未着手' }),
    ];

    const result = await service.syncDiff(testIds.wbsId);

    expect(result.success).toBe(true);
    expect(result.addedCount).toBe(2);
    expect(result.updatedCount).toBe(0);
    expect(result.deletedCount).toBe(0);

    const state = await taskRepository.findSyncStateByWbsId(testIds.wbsId);
    expect(state.map((s) => s.taskNo).sort()).toEqual(['D1-0001', 'D1-0002']);
    expect(state.every((s) => !s.isDeleted)).toBe(true);

    const snaps = await global.prisma.taskProgressSnapshot.findMany({
      where: { wbsId: testIds.wbsId },
    });
    expect(snaps).toHaveLength(2);
    expect(snaps.every((s) => !s.isRemoved)).toBe(true);
  });

  it('再同期：消失タスクはsoft-delete、存続はupdate、2世代目スナップショットが追記される', async () => {
    excelRows = [
      // D1-0002 を除外（消失）、D1-0001 は進捗更新
      makeRow({ WBS_ID: 'D1-0001', ROW_NO: 1, PROGRESS_RATE: 60, STATUS: '着手中' }),
    ];

    const result = await service.syncDiff(testIds.wbsId);

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);
    expect(result.deletedCount).toBe(1);
    expect(result.addedCount).toBe(0);

    // 有効タスクは D1-0001 のみ
    const active = await taskRepository.findActiveByWbsId(testIds.wbsId);
    expect(active.map((t) => t.taskNo.getValue())).toEqual(['D1-0001']);

    // D1-0002 は tombstone（論理削除）
    const state = await taskRepository.findSyncStateByWbsId(testIds.wbsId);
    expect(state.find((s) => s.taskNo === 'D1-0002')!.isDeleted).toBe(true);

    // スナップショットは2世代分蓄積（初回2 + 再同期: 更新1 + tombstone1 = 4）
    const snaps = await global.prisma.taskProgressSnapshot.findMany({
      where: { wbsId: testIds.wbsId },
    });
    expect(snaps.length).toBeGreaterThanOrEqual(4);
    const d2snaps = snaps
      .filter((s) => s.taskNo === 'D1-0002')
      .sort((a, b) => a.snapshotAt.getTime() - b.snapshotAt.getTime());
    expect(d2snaps[d2snaps.length - 1].isRemoved).toBe(true); // 最新はtombstone
  });

  it('事前検証：不正行があるとDBを一切更新せずFAILEDで返る（原子性）', async () => {
    const before = await taskRepository.findSyncStateByWbsId(testIds.wbsId);

    excelRows = [
      makeRow({ WBS_ID: 'D1-0001', ROW_NO: 1 }),
      makeRow({ WBS_ID: 'D1-0003', ROW_NO: 2, PHASE: '存在しないフェーズ' }), // フェーズ不正
    ];

    const result = await service.syncDiff(testIds.wbsId);

    expect(result.success).toBe(false);
    expect(result.errorDetails).toBeDefined();

    // DBが変化していない（D1-0003は作成されない・件数不変）
    const after = await taskRepository.findSyncStateByWbsId(testIds.wbsId);
    expect(after.map((s) => s.taskNo).sort()).toEqual(before.map((s) => s.taskNo).sort());
    expect(after.some((s) => s.taskNo === 'D1-0003')).toBe(false);
  });

  it('replace成功：全タスクを原子的に置換し、孤児化する進捗スナップショット履歴をクリアする', async () => {
    // 直前までにスナップショットと既存タスク（D1-0001有効＋D1-0002 tombstone）がある前提
    const beforeSnaps = await global.prisma.taskProgressSnapshot.count({
      where: { wbsId: testIds.wbsId },
    });
    expect(beforeSnaps).toBeGreaterThan(0);

    // replace（洗い替え）を実行
    excelRows = [makeRow({ WBS_ID: 'D1-0001', ROW_NO: 1 })];
    const result = await service.replaceAll(testIds.wbsId);
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2); // D1-0001有効 + D1-0002 tombstone
    expect(result.addedCount).toBe(1);

    // 有効タスクは D1-0001 のみ（全置換）
    const active = await taskRepository.findActiveByWbsId(testIds.wbsId);
    expect(active.map((t) => t.taskNo.getValue())).toEqual(['D1-0001']);

    // スナップショット履歴は0件（クリアされる）
    const afterSnaps = await global.prisma.taskProgressSnapshot.count({
      where: { wbsId: testIds.wbsId },
    });
    expect(afterSnaps).toBe(0);
  });

  it('replace失敗（不正行）：事前検証で中断し、タスクもスナップショットも一切変更しない', async () => {
    // まず diff でスナップショットを蓄積
    excelRows = [makeRow({ WBS_ID: 'D1-0001', ROW_NO: 1, PROGRESS_RATE: 40 })];
    const diff = await service.syncDiff(testIds.wbsId);
    expect(diff.success).toBe(true);

    const snapsBefore = await global.prisma.taskProgressSnapshot.count({
      where: { wbsId: testIds.wbsId },
    });
    expect(snapsBefore).toBeGreaterThan(0);
    const stateBefore = (await taskRepository.findSyncStateByWbsId(testIds.wbsId))
      .map((s) => `${s.taskNo}:${s.isDeleted}`)
      .sort();

    // 不正行（存在しないフェーズ）を含むExcelで replace → 失敗させる
    excelRows = [
      makeRow({ WBS_ID: 'D1-0001', ROW_NO: 1 }),
      makeRow({ WBS_ID: 'D1-0009', ROW_NO: 2, PHASE: '存在しないフェーズ' }),
    ];
    const result = await service.replaceAll(testIds.wbsId);
    expect(result.success).toBe(false);

    // 失敗時はスナップショットが保持される（データ損失なし）
    const snapsAfter = await global.prisma.taskProgressSnapshot.count({
      where: { wbsId: testIds.wbsId },
    });
    expect(snapsAfter).toBe(snapsBefore);

    // タスクも一切変更されていない（部分置換が起きない＝二重計上の原因を作らない）
    const stateAfter = (await taskRepository.findSyncStateByWbsId(testIds.wbsId))
      .map((s) => `${s.taskNo}:${s.isDeleted}`)
      .sort();
    expect(stateAfter).toEqual(stateBefore);
    expect(stateAfter.some((s) => s.startsWith('D1-0009'))).toBe(false);
  });
});
