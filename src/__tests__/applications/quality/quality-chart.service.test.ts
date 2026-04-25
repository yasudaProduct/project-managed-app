import { QualityChartService } from '@/applications/quality/quality-chart.service';
import { QualityTarget } from '@/domains/quality/entities/quality-target';
import { QualityFinding } from '@/domains/quality/entities/quality-finding';
import { QualitySizeMetric } from '@/domains/quality/entities/quality-size-metric';
import { QualityTestProgress } from '@/domains/quality/entities/quality-test-progress';
import { QualitySizeUnit, FindingSource } from '@/domains/quality/value-objects/quality-enums';
import type { IQualityTargetRepository } from '@/applications/quality/repositories/i-quality-target.repository';
import type { IQualityFindingRepository } from '@/applications/quality/repositories/i-quality-finding.repository';
import type { IQualitySizeMetricRepository } from '@/applications/quality/repositories/i-quality-size-metric.repository';
import type { IQualityReviewerRepository } from '@/applications/quality/repositories/i-quality-reviewer.repository';
import type { IQualityTestProgressRepository } from '@/applications/quality/repositories/i-quality-test-progress.repository';
import type { IQualityThresholdConfigRepository } from '@/applications/quality/repositories/i-quality-threshold-config.repository';

function createMocks() {
  return {
    targetRepo: {
      findById: jest.fn(),
      findByWbs: jest.fn(),
      findByWbsAndTaskNo: jest.fn(),
      upsert: jest.fn(),
      deactivateMissing: jest.fn(),
    } as jest.Mocked<IQualityTargetRepository>,
    findingRepo: {
      findByTarget: jest.fn(),
      findByTargetIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByTarget: jest.fn(),
      deleteByTargetId: jest.fn(),
    } as jest.Mocked<IQualityFindingRepository>,
    sizeMetricRepo: {
      findByTarget: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteByTargetAndUnit: jest.fn(),
    } as jest.Mocked<IQualitySizeMetricRepository>,
    reviewerRepo: {
      findByTarget: jest.fn(),
      replaceForTarget: jest.fn(),
    } as jest.Mocked<IQualityReviewerRepository>,
    testProgressRepo: {
      findByTarget: jest.fn(),
      findByTargetAndDateRange: jest.fn(),
      upsert: jest.fn(),
      deleteByTargetId: jest.fn(),
    } as jest.Mocked<IQualityTestProgressRepository>,
    thresholdRepo: {
      findByWbs: jest.fn(),
      findByWbsAndMetric: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IQualityThresholdConfigRepository>,
  };
}

describe('QualityChartService', () => {
  describe('getScatterData', () => {
    it('散布図データを生成する', async () => {
      const mocks = createMocks();
      const service = new QualityChartService(
        mocks.targetRepo, mocks.findingRepo, mocks.sizeMetricRepo,
        mocks.reviewerRepo, mocks.testProgressRepo, mocks.thresholdRepo,
      );

      const targets = [
        QualityTarget.reconstruct({ id: 1, wbsId: 1, taskNo: 'T-001', name: 'A', isActive: true, subsystem: 'SS1' }),
        QualityTarget.reconstruct({ id: 2, wbsId: 1, taskNo: 'T-002', name: 'B', isActive: true, subsystem: 'SS1' }),
      ];
      mocks.targetRepo.findByWbs.mockResolvedValue(targets);
      mocks.findingRepo.countByTarget.mockResolvedValue(5);
      mocks.sizeMetricRepo.findByTarget.mockResolvedValue([
        QualitySizeMetric.reconstruct({ id: 1, targetId: 1, unit: QualitySizeUnit.PAGE, value: 50, measuredAt: new Date() }),
      ]);
      mocks.reviewerRepo.findByTarget.mockResolvedValue([]);
      mocks.thresholdRepo.findByWbsAndMetric.mockResolvedValue(null);

      const result = await service.getScatterData(1, QualitySizeUnit.PAGE, 'bugDensity', 'testDensity', 'none');

      expect(result.points).toBeDefined();
      expect(Array.isArray(result.points)).toBe(true);
    });
  });

  describe('getPbCurveData', () => {
    it('PB曲線データを生成する', async () => {
      const mocks = createMocks();
      const service = new QualityChartService(
        mocks.targetRepo, mocks.findingRepo, mocks.sizeMetricRepo,
        mocks.reviewerRepo, mocks.testProgressRepo, mocks.thresholdRepo,
      );

      mocks.testProgressRepo.findByTarget.mockResolvedValue([
        QualityTestProgress.reconstruct({
          id: 1, targetId: 1, date: new Date('2026-04-01'),
          plannedTotal: 100, executedTotal: 30, passedTotal: 28, failedTotal: 2, blockedTotal: 0,
        }),
        QualityTestProgress.reconstruct({
          id: 2, targetId: 1, date: new Date('2026-04-02'),
          plannedTotal: 100, executedTotal: 60, passedTotal: 55, failedTotal: 5, blockedTotal: 0,
        }),
      ]);

      const result = await service.getPbCurveData(1);

      expect(result).toHaveLength(2);
      expect(result[0].remaining).toBe(70);
      expect(result[1].bugCumulative).toBe(5);
    });
  });

  describe('getParetoData', () => {
    it('パレート図データを生成する', async () => {
      const mocks = createMocks();
      const service = new QualityChartService(
        mocks.targetRepo, mocks.findingRepo, mocks.sizeMetricRepo,
        mocks.reviewerRepo, mocks.testProgressRepo, mocks.thresholdRepo,
      );

      mocks.targetRepo.findByWbs.mockResolvedValue([
        QualityTarget.reconstruct({ id: 1, wbsId: 1, taskNo: 'T-001', name: 'A', isActive: true }),
      ]);
      mocks.findingRepo.findByTargetIds.mockResolvedValue([
        QualityFinding.reconstruct({ id: 1, targetId: 1, source: FindingSource.REVIEW, causeType: '単純ミス', foundAt: new Date() }),
        QualityFinding.reconstruct({ id: 2, targetId: 1, source: FindingSource.REVIEW, causeType: '単純ミス', foundAt: new Date() }),
        QualityFinding.reconstruct({ id: 3, targetId: 1, source: FindingSource.REVIEW, causeType: '仕様齟齬', foundAt: new Date() }),
      ]);

      const result = await service.getParetoData(1, 'causeType');

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('単純ミス');
      expect(result[0].count).toBe(2);
      expect(result[0].cumulativePercent).toBeCloseTo(66.67, 0);
      expect(result[1].cumulativePercent).toBeCloseTo(100);
    });
  });
});
