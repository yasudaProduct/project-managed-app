import { QualityApplicationService } from '@/applications/quality/quality-application.service';
import { QualityReviewTarget } from '@/domains/quality/quality-review-target';
import { QualityReviewer } from '@/domains/quality/quality-reviewer';
import { QualityDocumentType, QualityReviewType, QualitySeverity } from '@/domains/quality/value-objects/quality-enums';

const targetRepo = {
  findById: jest.fn(),
  findByWbs: jest.fn(),
  findByWbsAndTaskNo: jest.fn(),
  upsert: jest.fn(),
  deactivateMissing: jest.fn(),
};

const reviewerRepo = {
  replaceForTarget: jest.fn(),
  findByTarget: jest.fn(),
};

const sizeRepo = {
  findByTarget: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteByTargetAndUnit: jest.fn(),
};

const findingRepo = {
  findByTarget: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countByTarget: jest.fn(),
  deleteByTargetId: jest.fn(),
};

const readRepo = {
  getReviewManHours: jest.fn(),
  getTaskManHours: jest.fn(),
  getDailyFindingCounts: jest.fn(),
};

function sampleTarget(id: number, wbsId: number, taskNo: string) {
  return QualityReviewTarget.reconstruct({
    id,
    wbsId,
    taskNo,
    name: `task-${taskNo}`,
    documentType: QualityDocumentType.OTHER,
    reviewType: QualityReviewType.PEER,
    isActive: true,
  });
}

describe('QualityApplicationService', () => {
  let service: QualityApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QualityApplicationService(
      targetRepo as never,
      reviewerRepo as never,
      sizeRepo as never,
      findingRepo as never,
      readRepo as never,
    );
  });

  describe('getSummary', () => {
    it('レビュアーのレビュータスクからレビュー工数を集計する', async () => {
      const target = sampleTarget(10, 1, 'T-001');
      targetRepo.findById.mockResolvedValue(target);
      findingRepo.countByTarget.mockResolvedValue({ total: 3, major: 1 });
      reviewerRepo.findByTarget.mockResolvedValue([
        QualityReviewer.reconstruct({
          id: 1, targetId: 10, reviewerUserId: 'u1', reviewTaskNo: 'R-001',
        }),
        QualityReviewer.reconstruct({
          id: 2, targetId: 10, reviewerUserId: 'u2', reviewTaskNo: 'R-002',
        }),
      ]);
      readRepo.getReviewManHours.mockResolvedValue([
        { wbsId: 1, taskNo: 'R-001', totalHours: 2 },
        { wbsId: 1, taskNo: 'R-002', totalHours: 3 },
      ]);
      readRepo.getTaskManHours.mockResolvedValue([
        { wbsId: 1, taskNo: 'T-001', totalHours: 10 },
      ]);

      const summary = await service.getSummary(10, 'MAN_HOUR');

      expect(readRepo.getReviewManHours).toHaveBeenCalledWith([
        { wbsId: 1, taskNo: 'R-001' },
        { wbsId: 1, taskNo: 'R-002' },
      ]);
      expect(summary.reviewManHours).toBe(5);
      expect(summary.size).toBe(10);
      expect(summary.findingCount).toBe(3);
      expect(summary.majorCount).toBe(1);
      expect(summary.reviewDensity).toBeCloseTo(0.5);
    });

    it('評価対象が存在しない場合はエラー', async () => {
      targetRepo.findById.mockResolvedValue(null);
      await expect(service.getSummary(999, 'MAN_HOUR')).rejects.toThrow();
    });
  });

  describe('listTargetsByWbs', () => {
    it('評価対象ごとのレビュアー数と指摘件数を返す', async () => {
      targetRepo.findByWbs.mockResolvedValue([
        sampleTarget(1, 1, 'T-001'),
        sampleTarget(2, 1, 'T-002'),
      ]);
      reviewerRepo.findByTarget
        .mockResolvedValueOnce([{}, {}])
        .mockResolvedValueOnce([{}]);
      findingRepo.countByTarget
        .mockResolvedValueOnce({ total: 5, major: 2 })
        .mockResolvedValueOnce({ total: 0, major: 0 });

      const list = await service.listTargetsByWbs(1);

      expect(list).toHaveLength(2);
      expect(list[0]).toMatchObject({ id: 1, reviewerCount: 2, findingCount: 5, majorCount: 2 });
      expect(list[1]).toMatchObject({ id: 2, reviewerCount: 1, findingCount: 0, majorCount: 0 });
    });
  });

  describe('importFindings', () => {
    it('replaceモードは既存を削除してから追加する', async () => {
      findingRepo.deleteByTargetId.mockResolvedValue(10);
      findingRepo.create.mockResolvedValue({});

      const { created } = await service.importFindings(
        5,
        [
          { severity: QualitySeverity.MAJOR, foundAt: new Date() },
          { severity: QualitySeverity.MINOR, foundAt: new Date() },
        ],
        'replace',
      );

      expect(findingRepo.deleteByTargetId).toHaveBeenCalledWith(5);
      expect(findingRepo.create).toHaveBeenCalledTimes(2);
      expect(created).toBe(2);
    });

    it('mergeモードは既存を削除しない', async () => {
      findingRepo.create.mockResolvedValue({});

      await service.importFindings(
        5,
        [{ severity: QualitySeverity.INFO, foundAt: new Date() }],
        'merge',
      );

      expect(findingRepo.deleteByTargetId).not.toHaveBeenCalled();
    });
  });
});
