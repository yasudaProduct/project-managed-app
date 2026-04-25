import { QualityMetricsService } from '@/applications/quality/quality-metrics.service';
import { QualityTarget } from '@/domains/quality/entities/quality-target';
import { QualitySizeMetric } from '@/domains/quality/entities/quality-size-metric';
import { QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';
import type { IQualityTargetRepository } from '@/applications/quality/repositories/i-quality-target.repository';
import type { IQualityFindingRepository } from '@/applications/quality/repositories/i-quality-finding.repository';
import type { IQualitySizeMetricRepository } from '@/applications/quality/repositories/i-quality-size-metric.repository';
import type { IQualityReviewerRepository } from '@/applications/quality/repositories/i-quality-reviewer.repository';
import type { IQualityThresholdConfigRepository } from '@/applications/quality/repositories/i-quality-threshold-config.repository';

describe('QualityMetricsService', () => {
  let service: QualityMetricsService;
  let mockTargetRepo: jest.Mocked<IQualityTargetRepository>;
  let mockFindingRepo: jest.Mocked<IQualityFindingRepository>;
  let mockSizeMetricRepo: jest.Mocked<IQualitySizeMetricRepository>;
  let mockReviewerRepo: jest.Mocked<IQualityReviewerRepository>;
  let mockThresholdRepo: jest.Mocked<IQualityThresholdConfigRepository>;

  beforeEach(() => {
    mockTargetRepo = {
      findById: jest.fn(),
      findByWbs: jest.fn(),
      findByWbsAndTaskNo: jest.fn(),
      upsert: jest.fn(),
      deactivateMissing: jest.fn(),
    };
    mockFindingRepo = {
      findByTarget: jest.fn(),
      findByTargetIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByTarget: jest.fn(),
      deleteByTargetId: jest.fn(),
    };
    mockSizeMetricRepo = {
      findByTarget: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteByTargetAndUnit: jest.fn(),
    };
    mockReviewerRepo = {
      findByTarget: jest.fn(),
      replaceForTarget: jest.fn(),
    };
    mockThresholdRepo = {
      findByWbs: jest.fn(),
      findByWbsAndMetric: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    };

    service = new QualityMetricsService(
      mockTargetRepo,
      mockFindingRepo,
      mockSizeMetricRepo,
      mockReviewerRepo,
      mockThresholdRepo,
    );
  });

  describe('calcTargetMetrics', () => {
    it('評価対象ごとのIPA6指標を計算する', async () => {
      const target = QualityTarget.reconstruct({
        id: 1, wbsId: 1, taskNo: 'T-001', name: 'A', isActive: true,
      });

      mockFindingRepo.countByTarget
        .mockResolvedValueOnce(10) // REVIEW findings
        .mockResolvedValueOnce(5);  // TEST findings
      mockSizeMetricRepo.findByTarget.mockResolvedValue([
        QualitySizeMetric.reconstruct({ id: 1, targetId: 1, unit: QualitySizeUnit.PAGE, value: 50, measuredAt: new Date() }),
        QualitySizeMetric.reconstruct({ id: 2, targetId: 1, unit: QualitySizeUnit.TEST_CASE, value: 200, measuredAt: new Date() }),
      ]);
      mockReviewerRepo.findByTarget.mockResolvedValue([
        { id: 1, targetId: 1, reviewerUserId: 'u1', reviewTaskNo: 'R-1', reviewHours: 8 },
      ]);

      const result = await service.calcTargetMetrics(target, QualitySizeUnit.PAGE);

      // レビュー指摘密度 = 10 / 50 = 0.2
      expect(result.metrics.reviewFindingDensity).toBeCloseTo(0.2);
      // レビュー工数密度 = 8 / 50 = 0.16
      expect(result.metrics.reviewEffortDensity).toBeCloseTo(0.16);
      // レビュー指摘効率 = 10 / 8 = 1.25
      expect(result.metrics.reviewEfficiency).toBeCloseTo(1.25);
      // バグ密度 = 5 / 50 = 0.1
      expect(result.metrics.bugDensity).toBeCloseTo(0.1);
      // テスト密度 = 200 / 50 = 4.0
      expect(result.metrics.testDensity).toBeCloseTo(4.0);
      // テスト効率 = 5 / 200 = 0.025
      expect(result.metrics.testEfficiency).toBeCloseTo(0.025);
    });

    it('規模が未登録の場合、規模依存指標はnull', async () => {
      const target = QualityTarget.reconstruct({
        id: 1, wbsId: 1, taskNo: 'T-001', name: 'A', isActive: true,
      });

      mockFindingRepo.countByTarget.mockResolvedValue(5);
      mockSizeMetricRepo.findByTarget.mockResolvedValue([]);
      mockReviewerRepo.findByTarget.mockResolvedValue([]);

      const result = await service.calcTargetMetrics(target, QualitySizeUnit.PAGE);

      expect(result.metrics.reviewFindingDensity).toBeNull();
      expect(result.metrics.bugDensity).toBeNull();
    });
  });

  describe('getWbsSummary', () => {
    it('WBS全体のサマリーを集計する', async () => {
      const targets = [
        QualityTarget.reconstruct({ id: 1, wbsId: 1, taskNo: 'T-001', name: 'A', isActive: true }),
        QualityTarget.reconstruct({ id: 2, wbsId: 1, taskNo: 'T-002', name: 'B', isActive: true }),
      ];
      mockTargetRepo.findByWbs.mockResolvedValue(targets);
      mockFindingRepo.countByTarget.mockResolvedValue(5);
      mockSizeMetricRepo.findByTarget.mockResolvedValue([
        QualitySizeMetric.reconstruct({ id: 1, targetId: 1, unit: QualitySizeUnit.PAGE, value: 50, measuredAt: new Date() }),
      ]);
      mockReviewerRepo.findByTarget.mockResolvedValue([]);
      mockThresholdRepo.findByWbs.mockResolvedValue([]);

      const summary = await service.getWbsSummary(1, QualitySizeUnit.PAGE);

      expect(summary.targetCount).toBe(2);
      expect(summary.totalMetrics).toBeDefined();
    });
  });
});
