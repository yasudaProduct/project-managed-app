import { QualityApplicationService } from '@/applications/quality/quality-application.service';
import { QualityReviewTarget } from '@/domains/quality/quality-review-target';
import { QualityReviewer } from '@/domains/quality/quality-reviewer';
import { QualityDocumentType, QualityReviewType, QualitySeverity, QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';
import { QualityFinding } from '@/domains/quality/quality-finding';
import { QualitySizeMetric } from '@/domains/quality/quality-size-metric';

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
  getDailyReviewManHours: jest.fn(),
};

const taskRepo = {
  findByWbsIdWithReviewInfo: jest.fn(),
  resolveUserIdByName: jest.fn(),
  findPhasesByTaskNos: jest.fn(),
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
      taskRepo as never,
    );
    taskRepo.findPhasesByTaskNos.mockResolvedValue(new Map());
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

  describe('getWbsSummary', () => {
    it('有効な評価対象全体で4指標を集計する', async () => {
      const targets = [sampleTarget(1, 1, 'T-001'), sampleTarget(2, 1, 'T-002')];
      targetRepo.findByWbs.mockResolvedValue(targets);
      findingRepo.countByTarget
        .mockResolvedValueOnce({ total: 3, major: 1 })
        .mockResolvedValueOnce({ total: 2, major: 0 });
      readRepo.getTaskManHours
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'T-001', totalHours: 10 }])
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'T-002', totalHours: 20 }]);
      reviewerRepo.findByTarget
        .mockResolvedValueOnce([
          QualityReviewer.reconstruct({
            id: 1, targetId: 1, reviewerUserId: 'u1', reviewTaskNo: 'R-001',
          }),
        ])
        .mockResolvedValueOnce([
          QualityReviewer.reconstruct({
            id: 2, targetId: 2, reviewerUserId: 'u2', reviewTaskNo: 'R-002',
          }),
        ]);
      readRepo.getReviewManHours
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'R-001', totalHours: 2 }])
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'R-002', totalHours: 0 }]);

      const summary = await service.getWbsSummary(1, 'MAN_HOUR');

      expect(summary.targetCount).toBe(2);
      expect(summary.totalSize).toBe(30);
      expect(summary.totalFindingCount).toBe(5);
      expect(summary.totalMajorCount).toBe(1);
      expect(summary.totalReviewManHours).toBe(2);
      expect(summary.reviewedTargetCount).toBe(1);
      expect(summary.defectDensity.value).toBeCloseTo(5 / 30);
      expect(summary.majorDefectDensity.value).toBeCloseTo(1 / 30);
      expect(summary.reviewDensity.value).toBeCloseTo(2 / 30);
      expect(summary.reviewCompletionRate.value).toBeCloseTo(0.5);
    });

    it('規模が0の場合は密度指標はnullになる', async () => {
      targetRepo.findByWbs.mockResolvedValue([sampleTarget(1, 1, 'T-001')]);
      findingRepo.countByTarget.mockResolvedValue({ total: 0, major: 0 });
      readRepo.getTaskManHours.mockResolvedValue([
        { wbsId: 1, taskNo: 'T-001', totalHours: 0 },
      ]);
      reviewerRepo.findByTarget.mockResolvedValue([]);

      const summary = await service.getWbsSummary(1, 'MAN_HOUR');

      expect(summary.defectDensity.value).toBeNull();
      expect(summary.reviewDensity.value).toBeNull();
    });

    it('閾値からステータスを評価する', async () => {
      targetRepo.findByWbs.mockResolvedValue([sampleTarget(1, 1, 'T-001')]);
      findingRepo.countByTarget.mockResolvedValue({ total: 10, major: 0 });
      readRepo.getTaskManHours.mockResolvedValue([
        { wbsId: 1, taskNo: 'T-001', totalHours: 10 },
      ]);
      reviewerRepo.findByTarget.mockResolvedValue([]);

      const summary = await service.getWbsSummary(1, 'MAN_HOUR', {
        defectDensity: {
          warnThreshold: 0.5,
          dangerThreshold: 0.9,
          higherIsBetter: false,
        },
      });

      expect(summary.defectDensity.value).toBeCloseTo(1);
      expect(summary.defectDensity.status).toBe('DANGER');
    });
  });

  describe('getTrend', () => {
    it('日次の指摘件数とレビュー工数から累積値と指標を返す', async () => {
      targetRepo.findByWbs.mockResolvedValue([sampleTarget(1, 1, 'T-001')]);
      readRepo.getDailyFindingCounts.mockResolvedValue([
        { date: new Date('2026-04-01'), total: 2, major: 1 },
        { date: new Date('2026-04-02'), total: 1, major: 0 },
      ]);
      reviewerRepo.findByTarget.mockResolvedValue([
        QualityReviewer.reconstruct({
          id: 1, targetId: 1, reviewerUserId: 'u1', reviewTaskNo: 'R-001',
        }),
      ]);
      readRepo.getDailyReviewManHours.mockResolvedValue([
        { date: new Date('2026-04-01'), totalHours: 1 },
        { date: new Date('2026-04-02'), totalHours: 2 },
      ]);
      readRepo.getTaskManHours.mockResolvedValue([
        { wbsId: 1, taskNo: 'T-001', totalHours: 20 },
      ]);

      const points = await service.getTrend({ wbsId: 1, sizeUnit: 'MAN_HOUR' });

      expect(points).toHaveLength(2);
      expect(points[0].date).toBe('2026-04-01');
      expect(points[0].cumulativeFindings).toBe(2);
      expect(points[0].cumulativeMajor).toBe(1);
      expect(points[0].cumulativeReviewManHours).toBe(1);
      expect(points[1].cumulativeFindings).toBe(3);
      expect(points[1].cumulativeReviewManHours).toBe(3);
      expect(points[1].defectDensity).toBeCloseTo(3 / 20);
      expect(points[1].reviewDensity).toBeCloseTo(3 / 20);
    });

    it('評価対象が無い場合は空配列', async () => {
      targetRepo.findByWbs.mockResolvedValue([]);
      const points = await service.getTrend({ wbsId: 1, sizeUnit: 'MAN_HOUR' });
      expect(points).toEqual([]);
    });
  });

  describe('getAggregated', () => {
    it('axis=target: 評価対象ごとに1行の集計行を返す', async () => {
      const targets = [sampleTarget(1, 1, 'T-001'), sampleTarget(2, 1, 'T-002')];
      targetRepo.findByWbs.mockResolvedValue(targets);
      taskRepo.findPhasesByTaskNos.mockResolvedValue(
        new Map([
          ['T-001', 'Design'],
          ['T-002', 'Code'],
        ]),
      );
      findingRepo.countByTarget
        .mockResolvedValueOnce({ total: 3, major: 1 })
        .mockResolvedValueOnce({ total: 0, major: 0 });
      readRepo.getTaskManHours
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'T-001', totalHours: 10 }])
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'T-002', totalHours: 20 }]);
      reviewerRepo.findByTarget
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const rows = await service.getAggregated(1, 'target', 'MAN_HOUR');

      expect(rows).toHaveLength(2);
      const t1 = rows.find((r) => r.key === 'T-001')!;
      expect(t1.targetCount).toBe(1);
      expect(t1.totalSize).toBe(10);
      expect(t1.findingCount).toBe(3);
      expect(t1.majorCount).toBe(1);
      expect(t1.defectDensity).toBeCloseTo(3 / 10);
    });

    it('axis=phase: フェーズごとに集約する', async () => {
      const targets = [
        sampleTarget(1, 1, 'T-001'),
        sampleTarget(2, 1, 'T-002'),
        sampleTarget(3, 1, 'T-003'),
      ];
      targetRepo.findByWbs.mockResolvedValue(targets);
      taskRepo.findPhasesByTaskNos.mockResolvedValue(
        new Map([
          ['T-001', '設計'],
          ['T-002', '設計'],
          ['T-003', 'コーディング'],
        ]),
      );
      findingRepo.countByTarget
        .mockResolvedValueOnce({ total: 2, major: 1 })
        .mockResolvedValueOnce({ total: 1, major: 0 })
        .mockResolvedValueOnce({ total: 5, major: 2 });
      readRepo.getTaskManHours
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'T-001', totalHours: 10 }])
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'T-002', totalHours: 20 }])
        .mockResolvedValueOnce([{ wbsId: 1, taskNo: 'T-003', totalHours: 30 }]);
      reviewerRepo.findByTarget
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const rows = await service.getAggregated(1, 'phase', 'MAN_HOUR');

      expect(rows).toHaveLength(2);
      const design = rows.find((r) => r.key === '設計')!;
      expect(design.targetCount).toBe(2);
      expect(design.totalSize).toBe(30);
      expect(design.findingCount).toBe(3);
      expect(design.majorCount).toBe(1);

      const coding = rows.find((r) => r.key === 'コーディング')!;
      expect(coding.targetCount).toBe(1);
      expect(coding.totalSize).toBe(30);
      expect(coding.findingCount).toBe(5);
    });

    it('axis=reviewer: 担当者ごとにレビュー工数を集約する', async () => {
      const targets = [sampleTarget(1, 1, 'T-001')];
      targetRepo.findByWbs.mockResolvedValue(targets);
      taskRepo.findPhasesByTaskNos.mockResolvedValue(new Map());
      findingRepo.countByTarget.mockResolvedValue({ total: 4, major: 2 });
      readRepo.getTaskManHours.mockResolvedValue([
        { wbsId: 1, taskNo: 'T-001', totalHours: 10 },
      ]);
      reviewerRepo.findByTarget.mockResolvedValue([
        QualityReviewer.reconstruct({
          id: 1, targetId: 1, reviewerUserId: 'userA', reviewTaskNo: 'R-A',
        }),
        QualityReviewer.reconstruct({
          id: 2, targetId: 1, reviewerUserId: 'userB', reviewTaskNo: 'R-B',
        }),
      ]);
      readRepo.getReviewManHours.mockResolvedValue([
        { wbsId: 1, taskNo: 'R-A', totalHours: 3 },
        { wbsId: 1, taskNo: 'R-B', totalHours: 5 },
      ]);

      const rows = await service.getAggregated(1, 'reviewer', 'MAN_HOUR');

      expect(rows).toHaveLength(2);
      const a = rows.find((r) => r.key === 'userA')!;
      expect(a.totalReviewManHours).toBe(3);
      const b = rows.find((r) => r.key === 'userB')!;
      expect(b.totalReviewManHours).toBe(5);
    });

    it('axis=date: 指摘発生日ごとに件数を集約する', async () => {
      const targets = [sampleTarget(1, 1, 'T-001')];
      targetRepo.findByWbs.mockResolvedValue(targets);
      taskRepo.findPhasesByTaskNos.mockResolvedValue(new Map());
      findingRepo.countByTarget.mockResolvedValue({ total: 3, major: 1 });
      readRepo.getTaskManHours.mockResolvedValue([
        { wbsId: 1, taskNo: 'T-001', totalHours: 10 },
      ]);
      reviewerRepo.findByTarget.mockResolvedValue([]);
      findingRepo.findByTarget.mockResolvedValue([
        QualityFinding.reconstruct({
          id: 1, targetId: 1, severity: QualitySeverity.MAJOR,
          foundAt: new Date('2026-04-01T00:00:00Z'),
        }),
        QualityFinding.reconstruct({
          id: 2, targetId: 1, severity: QualitySeverity.MINOR,
          foundAt: new Date('2026-04-01T00:00:00Z'),
        }),
        QualityFinding.reconstruct({
          id: 3, targetId: 1, severity: QualitySeverity.MINOR,
          foundAt: new Date('2026-04-02T00:00:00Z'),
        }),
      ]);

      const rows = await service.getAggregated(1, 'date', 'MAN_HOUR');

      expect(rows).toHaveLength(2);
      const d1 = rows.find((r) => r.key === '2026-04-01')!;
      expect(d1.findingCount).toBe(2);
      expect(d1.majorCount).toBe(1);
      const d2 = rows.find((r) => r.key === '2026-04-02')!;
      expect(d2.findingCount).toBe(1);
      expect(d2.majorCount).toBe(0);
    });

    it('規模単位PAGE時はQualitySizeMetricから取得する', async () => {
      const targets = [sampleTarget(1, 1, 'T-001')];
      targetRepo.findByWbs.mockResolvedValue(targets);
      taskRepo.findPhasesByTaskNos.mockResolvedValue(new Map());
      findingRepo.countByTarget.mockResolvedValue({ total: 2, major: 0 });
      sizeRepo.findByTarget.mockResolvedValue([
        QualitySizeMetric.reconstruct({
          id: 1, targetId: 1, unit: QualitySizeUnit.PAGE,
          value: 20, measuredAt: new Date(),
        }),
      ]);
      reviewerRepo.findByTarget.mockResolvedValue([]);

      const rows = await service.getAggregated(1, 'target', QualitySizeUnit.PAGE);

      expect(readRepo.getTaskManHours).not.toHaveBeenCalled();
      expect(rows[0].totalSize).toBe(20);
      expect(rows[0].defectDensity).toBeCloseTo(2 / 20);
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
