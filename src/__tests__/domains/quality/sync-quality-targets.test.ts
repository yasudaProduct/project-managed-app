import { SyncQualityTargetsService } from '@/applications/quality/sync-quality-targets.service';
import { ExcelWbs } from '@/domains/sync/ExcelWbs';
import type {
  IQualityReviewTargetRepository,
  IQualityReviewerRepository,
} from '@/applications/quality/i-quality-review-target.repository';
import type { IQualityTaskRepository } from '@/applications/quality/i-quality-task.repository';

function buildExcelRow(overrides: Partial<ExcelWbs> = {}): ExcelWbs {
  return {
    ROW_NO: 1,
    PROJECT_ID: 'P001',
    WBS_ID: 'T-001',
    PHASE: 'DESIGN',
    ACTIVITY: '',
    TASK: '基本設計書作成',
    TANTO: 'user1',
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
    STATUS: '',
    BIKO: null,
    PROGRESS_RATE: null,
    ...overrides,
  };
}

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
  findByWbsIdWithReviewInfo: jest.fn(),
};

describe('SyncQualityTargetsService', () => {
  let service: SyncQualityTargetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SyncQualityTargetsService(
      mockTargetRepo as unknown as IQualityReviewTargetRepository,
      mockReviewerRepo as unknown as IQualityReviewerRepository,
      mockTaskRepo as unknown as IQualityTaskRepository,
    );
  });

  describe('syncForWbs', () => {
    it('TANTO_REVに値があるタスクを評価対象として同期する', async () => {
      mockTaskRepo.findByWbsIdWithReviewInfo.mockResolvedValue([
        {
          taskNo: 'T-001',
          wbsId: 1,
          name: '基本設計書作成',
          tantoRev: '山田太郎',
          reviewTasks: [
            { taskNo: 'T-010', tanto: '山田太郎' },
          ],
        },
      ]);

      mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 100 }));
      mockTargetRepo.deactivateMissing.mockResolvedValue(0);
      mockReviewerRepo.replaceForTarget.mockResolvedValue(undefined);

      const result = await service.syncForWbs(1);

      expect(result.created).toBeGreaterThanOrEqual(0);
      expect(mockTargetRepo.upsert).toHaveBeenCalledTimes(1);
      expect(mockReviewerRepo.replaceForTarget).toHaveBeenCalledTimes(1);
    });

    it('TANTO_REVが空のタスクは評価対象にしない', async () => {
      mockTaskRepo.findByWbsIdWithReviewInfo.mockResolvedValue([
        {
          taskNo: 'T-002',
          wbsId: 1,
          name: '実装タスク',
          tantoRev: null,
          reviewTasks: [],
        },
      ]);

      mockTargetRepo.deactivateMissing.mockResolvedValue(0);

      const result = await service.syncForWbs(1);

      expect(mockTargetRepo.upsert).not.toHaveBeenCalled();
      expect(result.created + result.updated).toBe(0);
    });

    it('同名タスクが複数ある場合（複数レビュアー）、全員をQualityReviewerに登録する', async () => {
      mockTaskRepo.findByWbsIdWithReviewInfo.mockResolvedValue([
        {
          taskNo: 'T-001',
          wbsId: 1,
          name: '基本設計書作成',
          tantoRev: '山田太郎',
          reviewTasks: [
            { taskNo: 'T-010', tanto: '山田太郎' },
            { taskNo: 'T-011', tanto: '佐藤花子' },
          ],
        },
      ]);

      mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 100 }));
      mockTargetRepo.deactivateMissing.mockResolvedValue(0);
      mockReviewerRepo.replaceForTarget.mockResolvedValue(undefined);

      await service.syncForWbs(1);

      const reviewersArg = mockReviewerRepo.replaceForTarget.mock.calls[0][1];
      expect(reviewersArg).toHaveLength(2);
    });

    it('インポートで消えたタスクはisActive=falseにする', async () => {
      mockTaskRepo.findByWbsIdWithReviewInfo.mockResolvedValue([]);
      mockTargetRepo.deactivateMissing.mockResolvedValue(3);

      const result = await service.syncForWbs(1);

      expect(mockTargetRepo.deactivateMissing).toHaveBeenCalledWith(1, []);
      expect(result.deactivated).toBe(3);
    });
  });

  describe('syncFromExcelRows', () => {
    it('TANTO_REVがある行を評価対象として登録する', async () => {
      const rows = [
        buildExcelRow({ WBS_ID: 'T-010', TASK: '基本設計書作成', TANTO_REV: '山田太郎' }),
        buildExcelRow({ WBS_ID: 'T-020', TASK: '実装', TANTO_REV: null }),
      ];
      mockTargetRepo.findByWbsAndTaskNo.mockResolvedValue(null);
      mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 100 }));
      mockTargetRepo.deactivateMissing.mockResolvedValue(0);
      mockReviewerRepo.replaceForTarget.mockResolvedValue(undefined);

      const result = await service.syncFromExcelRows(1, rows);

      expect(mockTargetRepo.upsert).toHaveBeenCalledTimes(1);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('同一TASK名で複数行ある場合は1つの評価対象に全員をレビュアーとして登録する', async () => {
      const rows = [
        buildExcelRow({ WBS_ID: 'T-010', TASK: '基本設計書作成', TANTO_REV: '山田太郎' }),
        buildExcelRow({ WBS_ID: 'T-011', TASK: '基本設計書作成', TANTO_REV: '佐藤花子' }),
        buildExcelRow({ WBS_ID: 'T-012', TASK: '基本設計書作成', TANTO_REV: '鈴木次郎' }),
      ];
      mockTargetRepo.findByWbsAndTaskNo.mockResolvedValue(null);
      mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 200 }));
      mockTargetRepo.deactivateMissing.mockResolvedValue(0);
      mockReviewerRepo.replaceForTarget.mockResolvedValue(undefined);

      await service.syncFromExcelRows(1, rows);

      expect(mockTargetRepo.upsert).toHaveBeenCalledTimes(1);
      const reviewersArg = mockReviewerRepo.replaceForTarget.mock.calls[0][1];
      expect(reviewersArg).toHaveLength(3);
      const userIds = reviewersArg.map((r: { reviewerUserId: string }) => r.reviewerUserId);
      expect(userIds).toEqual(expect.arrayContaining(['山田太郎', '佐藤花子', '鈴木次郎']));
    });

    it('既存の評価対象がある場合はupdatedにカウントする', async () => {
      const rows = [
        buildExcelRow({ WBS_ID: 'T-010', TASK: '基本設計書作成', TANTO_REV: '山田太郎' }),
      ];
      const existing = { id: 1, wbsId: 1, taskNo: 'T-010', name: '基本設計書作成' };
      mockTargetRepo.findByWbsAndTaskNo.mockResolvedValue(existing);
      mockTargetRepo.upsert.mockImplementation(async (t) => ({ ...t, id: 1 }));
      mockTargetRepo.deactivateMissing.mockResolvedValue(0);
      mockReviewerRepo.replaceForTarget.mockResolvedValue(undefined);

      const result = await service.syncFromExcelRows(1, rows);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
    });

    it('空文字列のTANTO_REVは評価対象にしない', async () => {
      const rows = [
        buildExcelRow({ WBS_ID: 'T-010', TASK: '基本設計書作成', TANTO_REV: '   ' }),
        buildExcelRow({ WBS_ID: 'T-020', TASK: '実装', TANTO_REV: '' }),
      ];
      mockTargetRepo.deactivateMissing.mockResolvedValue(0);

      const result = await service.syncFromExcelRows(1, rows);

      expect(mockTargetRepo.upsert).not.toHaveBeenCalled();
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('インポートに含まれなくなったタスクはisActive=falseにする', async () => {
      mockTargetRepo.deactivateMissing.mockResolvedValue(2);

      const result = await service.syncFromExcelRows(1, []);

      expect(mockTargetRepo.deactivateMissing).toHaveBeenCalledWith(1, []);
      expect(result.deactivated).toBe(2);
    });
  });
});
