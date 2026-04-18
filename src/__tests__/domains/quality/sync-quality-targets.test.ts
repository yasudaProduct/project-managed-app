import { SyncQualityTargetsService } from '@/applications/quality/sync-quality-targets.service';
import { QualityDocumentType, QualityReviewType } from '@/domains/quality/value-objects/quality-enums';

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
      mockTargetRepo as any,
      mockReviewerRepo as any,
      mockTaskRepo as any,
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
});
