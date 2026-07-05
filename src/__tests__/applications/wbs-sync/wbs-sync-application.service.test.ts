import { WbsSyncApplicationService } from '@/applications/wbs-sync/wbs-sync-application.service';
import { ExcelWbs } from '@/domains/sync/excel-wbs';
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import type { IExcelWbsRepository } from '@/applications/wbs-sync/iexcel-wbs-repository';
import type { ISyncLogRepository } from '@/applications/wbs-sync/isync-log-repository';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ITaskRepository, SyncDiffBuckets, TaskSyncState } from '@/applications/task/itask-repository';

const WBS_ID = 1;
const PROJECT_ID = 'PJ-1';
const PHASE_NAME = '設計';

function makeExcelRow(overrides: Partial<ExcelWbs> = {}): ExcelWbs {
  return {
    ROW_NO: 1,
    PROJECT_ID,
    WBS_ID: 'D1-0001',
    PHASE: PHASE_NAME,
    ACTIVITY: '',
    TASK: 'タスク',
    TANTO: null,
    TANTO_REV: null,
    KIJUN_START_DATE: null,
    KIJUN_END_DATE: null,
    YOTEI_START_DATE: null,
    YOTEI_END_DATE: null,
    JISSEKI_START_DATE: null,
    JISSEKI_END_DATE: null,
    KIJUN_KOSU: null,
    YOTEI_KOSU: null,
    JISSEKI_KOSU: null,
    KIJUN_KOSU_BUFFER: null,
    STATUS: null,
    BIKO: null,
    PROGRESS_RATE: null,
    ...overrides,
  };
}

describe('WbsSyncApplicationService.syncDiff', () => {
  let wbsRepository: jest.Mocked<IWbsRepository>;
  let excelWbsRepository: jest.Mocked<IExcelWbsRepository>;
  let syncLogRepository: jest.Mocked<ISyncLogRepository>;
  let phaseRepository: jest.Mocked<IPhaseRepository>;
  let wbsAssigneeRepository: jest.Mocked<IWbsAssigneeRepository>;
  let taskRepository: jest.Mocked<ITaskRepository>;
  let service: WbsSyncApplicationService;

  // applySyncDiff に渡されたバケット／context を取り出すヘルパ
  const lastBuckets = (): SyncDiffBuckets =>
    (taskRepository.applySyncDiff as jest.Mock).mock.calls.at(-1)![1];
  const lastContext = () =>
    (taskRepository.applySyncDiff as jest.Mock).mock.calls.at(-1)![3];

  beforeEach(() => {
    wbsRepository = { findById: jest.fn() } as unknown as jest.Mocked<IWbsRepository>;
    excelWbsRepository = { findByWbsName: jest.fn() } as unknown as jest.Mocked<IExcelWbsRepository>;
    syncLogRepository = { recordSync: jest.fn() } as unknown as jest.Mocked<ISyncLogRepository>;
    phaseRepository = { findByWbsId: jest.fn() } as unknown as jest.Mocked<IPhaseRepository>;
    wbsAssigneeRepository = { findByWbsId: jest.fn() } as unknown as jest.Mocked<IWbsAssigneeRepository>;
    taskRepository = {
      findSyncStateByWbsId: jest.fn(),
      applySyncDiff: jest.fn().mockResolvedValue({ syncLogId: 1 }),
    } as unknown as jest.Mocked<ITaskRepository>;

    // 既定のスタブ
    (wbsRepository.findById as jest.Mock).mockResolvedValue({ id: WBS_ID, name: 'WBS-A' });
    (phaseRepository.findByWbsId as jest.Mock).mockResolvedValue([{ id: 10, name: PHASE_NAME }]);
    (wbsAssigneeRepository.findByWbsId as jest.Mock).mockResolvedValue([]);

    service = new WbsSyncApplicationService(
      wbsRepository,
      excelWbsRepository,
      syncLogRepository,
      phaseRepository,
      wbsAssigneeRepository,
      taskRepository,
    );
  });

  function stubExcel(rows: ExcelWbs[]) {
    (excelWbsRepository.findByWbsName as jest.Mock).mockResolvedValue(rows);
  }
  function stubState(state: TaskSyncState[]) {
    (taskRepository.findSyncStateByWbsId as jest.Mock).mockResolvedValue(state);
  }

  it('新規タスクは toCreate に振り分けられ addedCount に計上される', async () => {
    stubExcel([
      makeExcelRow({ WBS_ID: 'D1-0001' }),
      makeExcelRow({ WBS_ID: 'D1-0002', ROW_NO: 2 }),
    ]);
    stubState([]);

    const result = await service.syncDiff(WBS_ID);

    expect(taskRepository.applySyncDiff).toHaveBeenCalledTimes(1);
    const buckets = lastBuckets();
    expect(buckets.toCreate.map((t) => t.taskNo.getValue())).toEqual(['D1-0001', 'D1-0002']);
    expect(buckets.toUpdate).toHaveLength(0);
    expect(buckets.toSoftDeleteIds).toHaveLength(0);
    expect(result.success).toBe(true);
    expect(result.addedCount).toBe(2);
    expect(result.updatedCount).toBe(0);
    expect(result.deletedCount).toBe(0);
    expect(result.recordCount).toBe(2);
    // 成功時は applySyncDiff の context 内で SyncLog を採番・記録する（recordSyncは呼ばない）
    expect(syncLogRepository.recordSync).not.toHaveBeenCalled();
    const ctx = lastContext();
    expect(ctx.syncLogData).toEqual(
      expect.objectContaining({ syncStatus: 'SUCCESS', addedCount: 2, recordCount: 2 }),
    );
    // 新規2件分のスナップショット入力（taskIdはnull＝create後にtaskNoで解決）
    expect(ctx.snapshotInputs).toHaveLength(2);
    expect(ctx.snapshotInputs.every((s: { taskId: number | null; isRemoved: boolean }) => s.taskId === null && !s.isRemoved)).toBe(true);
  });

  it('存続タスクは toUpdate に振り分けられ id を保持する', async () => {
    stubExcel([makeExcelRow({ WBS_ID: 'D1-0001' })]);
    stubState([{ id: 99, taskNo: 'D1-0001', isDeleted: false }]);

    const result = await service.syncDiff(WBS_ID);

    const buckets = lastBuckets();
    expect(buckets.toCreate).toHaveLength(0);
    expect(buckets.toUpdate).toHaveLength(1);
    expect(buckets.toUpdate[0].id).toBe(99);
    expect(buckets.toUpdate[0].taskNo.getValue()).toBe('D1-0001');
    expect(buckets.toSoftDeleteIds).toHaveLength(0);
    expect(result.updatedCount).toBe(1);
  });

  it('Excelから消えた有効タスクは toSoftDeleteIds に入る', async () => {
    stubExcel([makeExcelRow({ WBS_ID: 'D1-0001' })]);
    stubState([
      { id: 1, taskNo: 'D1-0001', isDeleted: false },
      { id: 2, taskNo: 'D1-0099', isDeleted: false }, // Excelに無い
    ]);

    const result = await service.syncDiff(WBS_ID);

    const buckets = lastBuckets();
    expect(buckets.toSoftDeleteIds).toEqual([2]);
    expect(result.deletedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
  });

  it('既にtombstoneのタスクは（Excelに無くても）削除に二重計上しない', async () => {
    stubExcel([makeExcelRow({ WBS_ID: 'D1-0001' })]);
    stubState([
      { id: 1, taskNo: 'D1-0001', isDeleted: false },
      { id: 2, taskNo: 'D1-0099', isDeleted: true }, // 既に論理削除済み
    ]);

    const result = await service.syncDiff(WBS_ID);

    expect(lastBuckets().toSoftDeleteIds).toEqual([]);
    expect(result.deletedCount).toBe(0);
  });

  it('tombstoneのtaskNoが再登場したら revive（toUpdate）になり削除にはならない', async () => {
    stubExcel([makeExcelRow({ WBS_ID: 'D1-0001' })]);
    stubState([{ id: 5, taskNo: 'D1-0001', isDeleted: true }]);

    const result = await service.syncDiff(WBS_ID);

    const buckets = lastBuckets();
    expect(buckets.toUpdate).toHaveLength(1);
    expect(buckets.toUpdate[0].id).toBe(5);
    expect(buckets.toSoftDeleteIds).toHaveLength(0);
    expect(result.updatedCount).toBe(1);
    expect(result.deletedCount).toBe(0);
  });

  it('snapshotInputs：存続はtaskId付き(isRemoved=false)、消失はtombstone(isRemoved=true)', async () => {
    stubExcel([makeExcelRow({ WBS_ID: 'D1-0001' })]);
    stubState([
      { id: 1, taskNo: 'D1-0001', isDeleted: false },
      { id: 2, taskNo: 'D1-0099', isDeleted: false }, // Excelに無い → tombstone
    ]);

    await service.syncDiff(WBS_ID);

    const inputs = lastContext().snapshotInputs as Array<{
      taskId: number | null;
      taskNo: string;
      isRemoved: boolean;
    }>;
    const active = inputs.find((s) => s.taskNo === 'D1-0001')!;
    const tombstone = inputs.find((s) => s.taskNo === 'D1-0099')!;
    expect(active.taskId).toBe(1);
    expect(active.isRemoved).toBe(false);
    expect(tombstone.taskId).toBe(2);
    expect(tombstone.isRemoved).toBe(true);
  });

  it('事前検証でエラーがあれば applySyncDiff を呼ばず FAILED で返す（原子性）', async () => {
    stubExcel([
      makeExcelRow({ WBS_ID: 'D1-0001' }),
      makeExcelRow({ WBS_ID: 'D1-0002', ROW_NO: 2, PHASE: '' }), // フェーズ必須エラー
    ]);
    stubState([]);

    const result = await service.syncDiff(WBS_ID);

    expect(taskRepository.applySyncDiff).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.addedCount).toBe(0);
    expect(result.errorDetails).toBeDefined();
    expect(syncLogRepository.recordSync).toHaveBeenCalledWith(
      expect.objectContaining({ syncStatus: 'FAILED' }),
    );
  });
});
