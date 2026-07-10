import { WbsSyncApplicationService } from '@/applications/wbs-sync/wbs-sync-application-service';
import { ExcelWbs, SyncErrorType, ValidationError } from '@/domains/sync/excel-wbs';
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
      replaceAllTasks: jest.fn().mockResolvedValue({ deleted: 0, added: 0 }),
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

  it('Excel内に重複したタスクNoがあると事前検証で失敗し applySyncDiff を呼ばない', async () => {
    stubExcel([
      makeExcelRow({ WBS_ID: 'D1-0001', ROW_NO: 1 }),
      makeExcelRow({ WBS_ID: 'D1-0002', ROW_NO: 3 }),
      makeExcelRow({ WBS_ID: 'D1-0001', ROW_NO: 5 }), // 重複
    ]);
    stubState([]);

    const result = await service.syncDiff(WBS_ID);

    expect(taskRepository.applySyncDiff).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    const errors = (result.errorDetails as { validationErrors: ValidationError[] })
      .validationErrors;
    const dup = errors.find((e) => e.field === 'taskNo' && e.taskNo === 'D1-0001');
    expect(dup).toBeDefined();
    expect(dup!.message).toContain('重複');
    expect(dup!.message).toContain('1, 5'); // 重複行番号が特定できる
    expect(syncLogRepository.recordSync).toHaveBeenCalledWith(
      expect.objectContaining({ syncStatus: 'FAILED' }),
    );
  });

  it('存在しない担当者は検証エラー（field=assignee）になる', async () => {
    stubExcel([makeExcelRow({ TANTO: '存在しない担当者' })]);
    stubState([]);

    const result = await service.syncDiff(WBS_ID);

    expect(result.success).toBe(false);
    const errors = (result.errorDetails as { validationErrors: ValidationError[] })
      .validationErrors;
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('assignee');
    expect(errors[0].value).toBe('存在しない担当者');
  });

  it('PROGRESS_RATE のクランプと STATUS のマッピングがドメインに反映される', async () => {
    stubExcel([
      makeExcelRow({ WBS_ID: 'D1-0001', PROGRESS_RATE: 150, STATUS: '完了' }),
      makeExcelRow({ WBS_ID: 'D1-0002', ROW_NO: 2, PROGRESS_RATE: -10, STATUS: '着手中' }),
    ]);
    stubState([]);

    await service.syncDiff(WBS_ID);

    const [t1, t2] = lastBuckets().toCreate;
    expect(t1.progressRate).toBe(100);
    expect(t1.status.status).toBe('COMPLETED');
    expect(t2.progressRate).toBe(0);
    expect(t2.status.status).toBe('IN_PROGRESS');
  });

  it('snapshotInputs に工数・単価・実績日・進捗率が時点データとして入る', async () => {
    (wbsAssigneeRepository.findByWbsId as jest.Mock).mockResolvedValue([
      { id: 7, userName: '田中', getCostPerHour: () => 4000 },
    ]);
    stubExcel([
      makeExcelRow({
        TANTO: '田中',
        KIJUN_START_DATE: new Date('2025-05-01'),
        KIJUN_END_DATE: new Date('2025-05-31'),
        KIJUN_KOSU: 10,
        YOTEI_START_DATE: new Date('2025-06-01'),
        YOTEI_END_DATE: new Date('2025-06-30'),
        YOTEI_KOSU: 20,
        JISSEKI_START_DATE: new Date('2025-06-02'),
        JISSEKI_END_DATE: new Date('2025-06-20'),
        PROGRESS_RATE: 55,
      }),
    ]);
    stubState([]);

    await service.syncDiff(WBS_ID);

    const input = lastContext().snapshotInputs[0];
    expect(input).toEqual(
      expect.objectContaining({
        taskNo: 'D1-0001',
        progressRate: 55,
        plannedManHours: 20,
        baseManHours: 10,
        costPerHour: 4000,
        plannedStart: new Date('2025-06-01'),
        plannedEnd: new Date('2025-06-30'),
        baseStart: new Date('2025-05-01'),
        baseEnd: new Date('2025-05-31'),
        actualStart: new Date('2025-06-02'),
        actualEnd: new Date('2025-06-20'),
        isRemoved: false,
      }),
    );
  });

  it('YOTEI期間が無い場合 plannedManHours は KIJUN 工数にフォールバックし、担当者未設定はデフォルト単価になる', async () => {
    stubExcel([
      makeExcelRow({
        TANTO: null,
        KIJUN_START_DATE: new Date('2025-05-01'),
        KIJUN_END_DATE: new Date('2025-05-31'),
        KIJUN_KOSU: 12,
      }),
    ]);
    stubState([]);

    await service.syncDiff(WBS_ID);

    const input = lastContext().snapshotInputs[0];
    expect(input.plannedManHours).toBe(12); // KIJUNへフォールバック
    expect(input.baseManHours).toBe(12);
    expect(input.plannedStart).toBeNull();
    expect(input.costPerHour).toBe(5000); // デフォルト単価
  });

  it('revive されたタスクも snapshotInputs に taskId 付き（isRemoved=false）で含まれる', async () => {
    stubExcel([makeExcelRow({ WBS_ID: 'D1-0001' })]);
    stubState([{ id: 5, taskNo: 'D1-0001', isDeleted: true }]);

    await service.syncDiff(WBS_ID);

    const inputs = lastContext().snapshotInputs as Array<{
      taskId: number | null;
      taskNo: string;
      isRemoved: boolean;
    }>;
    const revived = inputs.find((s) => s.taskNo === 'D1-0001')!;
    expect(revived.taskId).toBe(5);
    expect(revived.isRemoved).toBe(false);
  });

  it('WBSが存在しない場合は throw せず errorDetails を返す（Excelへアクセスしない）', async () => {
    (wbsRepository.findById as jest.Mock).mockResolvedValue(null);

    const result = await service.syncDiff(WBS_ID);

    expect(result.success).toBe(false);
    expect(result.errorDetails).toEqual({ message: 'WBSが見つかりません' });
    expect(excelWbsRepository.findByWbsName).not.toHaveBeenCalled();
  });

  it('Excelデータが0件なら VALIDATION_ERROR の SyncError を投げ FAILED ログを残す', async () => {
    stubExcel([]);
    stubState([]);

    await expect(service.syncDiff(WBS_ID)).rejects.toMatchObject({
      name: 'SyncError',
      type: SyncErrorType.VALIDATION_ERROR, // 接続エラーへ誤分類しない
    });
    expect(taskRepository.applySyncDiff).not.toHaveBeenCalled();
    expect(syncLogRepository.recordSync).toHaveBeenCalledWith(
      expect.objectContaining({ syncStatus: 'FAILED' }),
    );
  });

  it('applySyncDiff が失敗したら FAILED ログを記録し SyncError(TRANSACTION_ERROR) を投げる', async () => {
    stubExcel([makeExcelRow()]);
    stubState([]);
    (taskRepository.applySyncDiff as jest.Mock).mockRejectedValue(new Error('DB接続断'));

    await expect(service.syncDiff(WBS_ID)).rejects.toMatchObject({
      name: 'SyncError',
      type: SyncErrorType.TRANSACTION_ERROR,
    });
    expect(syncLogRepository.recordSync).toHaveBeenCalledWith(
      expect.objectContaining({
        syncStatus: 'FAILED',
        errorDetails: expect.objectContaining({ message: 'DB接続断' }),
      }),
    );
  });

  describe('replaceAll（洗い替え）の事前検証', () => {
    it('Excel内に重複したタスクNoがあると replaceAllTasks を呼ばず FAILED で返す', async () => {
      stubExcel([
        makeExcelRow({ WBS_ID: 'D1-0001', ROW_NO: 1 }),
        makeExcelRow({ WBS_ID: 'D1-0001', ROW_NO: 2 }), // 重複
      ]);

      const result = await service.replaceAll(WBS_ID);

      expect(taskRepository.replaceAllTasks).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      const errors = (result.errorDetails as { validationErrors: ValidationError[] })
        .validationErrors;
      expect(errors.some((e) => e.field === 'taskNo' && e.message.includes('重複'))).toBe(true);
      expect(syncLogRepository.recordSync).toHaveBeenCalledWith(
        expect.objectContaining({ syncStatus: 'FAILED' }),
      );
    });
  });
});
