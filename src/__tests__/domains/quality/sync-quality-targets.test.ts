import { SyncQualityTargetsService } from '@/applications/quality/sync-quality-targets.service';
import type {
  IQualityReviewTargetRepository,
  IQualityReviewerRepository,
} from '@/applications/quality/i-quality-review-target.repository';
import type {
  IQualityTaskRepository,
  QualitySyncTaskRow,
} from '@/applications/quality/i-quality-task.repository';

const mockTargetRepo = {
  findById: jest.fn(),
  findByWbs: jest.fn(),
  findByWbsAndTaskNo: jest.fn(),
  upsert: jest.fn(),
  deactivateMissing: jest.fn(),
};

const mockReviewerRepo = {
  replaceForTarget: jest.fn(),
  findByTarget: jest.fn(),
};

const mockTaskRepo = {
  findAllForQualitySync: jest.fn(),
  findPhasesByTaskNos: jest.fn(),
  findAssigneesByTaskNos: jest.fn(),
  findUserNamesByIds: jest.fn(),
};

function row(partial: Partial<QualitySyncTaskRow>): QualitySyncTaskRow {
  return {
    taskNo: partial.taskNo ?? 'T-000',
    name: partial.name ?? 'タスク',
    tantoRev: partial.tantoRev ?? null,
    assigneeUserId: partial.assigneeUserId ?? null,
  };
}

describe('SyncQualityTargetsService.syncForWbs', () => {
  let service: SyncQualityTargetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SyncQualityTargetsService(
      mockTargetRepo as unknown as IQualityReviewTargetRepository,
      mockReviewerRepo as unknown as IQualityReviewerRepository,
      mockTaskRepo as unknown as IQualityTaskRepository,
    );
    mockTargetRepo.findByWbsAndTaskNo.mockResolvedValue(null);
    mockTargetRepo.deactivateMissing.mockResolvedValue(0);
    mockReviewerRepo.replaceForTarget.mockResolvedValue(undefined);
  });

  it('tantoRevが非空のタスクを評価対象として登録する', async () => {
    mockTaskRepo.findAllForQualitySync.mockResolvedValue([
      row({ taskNo: 'W-010', name: '設計書A', tantoRev: 'reviewer-user-id', assigneeUserId: 'author-user-id' }),
      row({ taskNo: 'W-010-R', name: '設計書A', tantoRev: null, assigneeUserId: 'reviewer-user-id' }),
    ]);
    mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 100 }));

    const result = await service.syncForWbs(1);

    expect(mockTargetRepo.upsert).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);

    const reviewersArg = mockReviewerRepo.replaceForTarget.mock.calls[0][1];
    expect(reviewersArg).toHaveLength(1);
    expect(reviewersArg[0].reviewerUserId).toBe('reviewer-user-id');
    expect(reviewersArg[0].reviewTaskNo).toBe('W-010-R');
  });

  it('同一評価対象に複数のレビュータスクがある場合、全員をレビュアーとして登録する', async () => {
    mockTaskRepo.findAllForQualitySync.mockResolvedValue([
      row({ taskNo: 'W-012', name: '設計書C', tantoRev: 'someone', assigneeUserId: 'author-id' }),
      row({ taskNo: 'W-012-R1', name: '設計書C', tantoRev: null, assigneeUserId: 'reviewer-1' }),
      row({ taskNo: 'W-012-R2', name: '設計書C', tantoRev: null, assigneeUserId: 'reviewer-2' }),
    ]);
    mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 200 }));

    await service.syncForWbs(1);

    const reviewersArg = mockReviewerRepo.replaceForTarget.mock.calls[0][1];
    expect(reviewersArg).toHaveLength(2);
    const userIds = reviewersArg.map((r: { reviewerUserId: string }) => r.reviewerUserId);
    expect(userIds).toEqual(expect.arrayContaining(['reviewer-1', 'reviewer-2']));
    const taskNos = reviewersArg.map((r: { reviewTaskNo: string }) => r.reviewTaskNo);
    expect(taskNos).toEqual(expect.arrayContaining(['W-012-R1', 'W-012-R2']));
  });

  it('レビュータスクに担当者(assignee)がいない場合はQualityReviewerを作成しない', async () => {
    mockTaskRepo.findAllForQualitySync.mockResolvedValue([
      row({ taskNo: 'W-020', name: '設計書X', tantoRev: 'some', assigneeUserId: 'author' }),
      row({ taskNo: 'W-020-R', name: '設計書X', tantoRev: null, assigneeUserId: null }),
    ]);
    mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 300 }));

    await service.syncForWbs(1);

    expect(mockTargetRepo.upsert).toHaveBeenCalledTimes(1);
    const reviewersArg = mockReviewerRepo.replaceForTarget.mock.calls[0][1];
    expect(reviewersArg).toHaveLength(0);
  });

  it('tantoRevがあるがマッチするレビュータスクがない場合は評価対象のみ作成する', async () => {
    mockTaskRepo.findAllForQualitySync.mockResolvedValue([
      row({ taskNo: 'W-030', name: '設計書Y', tantoRev: 'some', assigneeUserId: 'author' }),
    ]);
    mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 400 }));

    await service.syncForWbs(1);

    expect(mockTargetRepo.upsert).toHaveBeenCalledTimes(1);
    const reviewersArg = mockReviewerRepo.replaceForTarget.mock.calls[0][1];
    expect(reviewersArg).toHaveLength(0);
  });

  it('tantoRevが空文字/空白のみのタスクは評価対象にしない', async () => {
    mockTaskRepo.findAllForQualitySync.mockResolvedValue([
      row({ taskNo: 'W-040', tantoRev: '' }),
      row({ taskNo: 'W-041', tantoRev: '   ' }),
      row({ taskNo: 'W-042', tantoRev: null }),
    ]);

    const result = await service.syncForWbs(1);

    expect(mockTargetRepo.upsert).not.toHaveBeenCalled();
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
  });

  it('既存の評価対象がある場合はupdatedにカウントする', async () => {
    const existing = { id: 1, wbsId: 1, taskNo: 'W-010', name: '設計書A' };
    mockTargetRepo.findByWbsAndTaskNo.mockResolvedValue(existing);
    mockTaskRepo.findAllForQualitySync.mockResolvedValue([
      row({ taskNo: 'W-010', name: '設計書A', tantoRev: 'r', assigneeUserId: 'a' }),
    ]);
    mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 1 }));

    const result = await service.syncForWbs(1);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
  });

  it('評価対象から外れたタスクはdeactivateMissingでisActive=falseにする', async () => {
    mockTaskRepo.findAllForQualitySync.mockResolvedValue([]);
    mockTargetRepo.deactivateMissing.mockResolvedValue(3);

    const result = await service.syncForWbs(1);

    expect(mockTargetRepo.deactivateMissing).toHaveBeenCalledWith(1, []);
    expect(result.deactivated).toBe(3);
  });

  it('taskNoの前方一致は"-R"で始まる必要があり、"-R"以外の接尾辞タスクを巻き込まない', async () => {
    mockTaskRepo.findAllForQualitySync.mockResolvedValue([
      row({ taskNo: 'W-010', tantoRev: 'r', assigneeUserId: 'author' }),
      row({ taskNo: 'W-0101', tantoRev: null, assigneeUserId: 'other' }),
      row({ taskNo: 'W-010-R', tantoRev: null, assigneeUserId: 'reviewer' }),
    ]);
    mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 500 }));

    await service.syncForWbs(1);

    const reviewersArg = mockReviewerRepo.replaceForTarget.mock.calls[0][1];
    expect(reviewersArg).toHaveLength(1);
    expect(reviewersArg[0].reviewTaskNo).toBe('W-010-R');
  });
});
