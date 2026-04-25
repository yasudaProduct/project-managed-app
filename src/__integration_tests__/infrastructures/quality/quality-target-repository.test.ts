import { QualityTargetPrismaRepository } from '@/infrastructures/quality/quality-target-prisma.repository';
import { QualityReviewerPrismaRepository } from '@/infrastructures/quality/quality-reviewer-prisma.repository';
import { QualityFindingPrismaRepository } from '@/infrastructures/quality/quality-finding-prisma.repository';
import { QualitySizeMetricPrismaRepository } from '@/infrastructures/quality/quality-size-metric-prisma.repository';
import { QualityTestProgressPrismaRepository } from '@/infrastructures/quality/quality-test-progress-prisma.repository';
import { QualityThresholdConfigPrismaRepository } from '@/infrastructures/quality/quality-threshold-config-prisma.repository';
import { QualityTarget } from '@/domains/quality/entities/quality-target';
import { QualityReviewer } from '@/domains/quality/entities/quality-reviewer';
import { QualityFinding } from '@/domains/quality/entities/quality-finding';
import { QualitySizeMetric } from '@/domains/quality/entities/quality-size-metric';
import { QualityTestProgress } from '@/domains/quality/entities/quality-test-progress';
import { QualityThresholdConfig } from '@/domains/quality/entities/quality-threshold-config';
import { FindingSource, QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';
import {
  cleanupQualityDataByWbs,
  cleanupTestData,
  seedTestProject,
  testIds,
} from '../../helpers';

describe('QualityTargetPrismaRepository', () => {
  let repo: QualityTargetPrismaRepository;

  beforeAll(async () => {
    repo = new QualityTargetPrismaRepository();
    await seedTestProject(global.prisma);
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma);
  });

  beforeEach(async () => {
    await cleanupQualityDataByWbs(global.prisma, testIds.wbsId);
  });

  it('新規作成とfindByWbsで取得できる', async () => {
    const target = QualityTarget.create({
      wbsId: testIds.wbsId,
      taskNo: 'T-001',
      name: '基本設計書',
      subsystem: 'ユーザー管理',
      phaseCode: 'DD',
    });

    const saved = await repo.upsert(target);
    expect(saved.id).toBeGreaterThan(0);
    expect(saved.subsystem).toBe('ユーザー管理');

    const list = await repo.findByWbs(testIds.wbsId);
    expect(list).toHaveLength(1);
    expect(list[0].taskNo).toBe('T-001');
  });

  it('deactivateMissingで不足分を非アクティブ化', async () => {
    await repo.upsert(QualityTarget.create({ wbsId: testIds.wbsId, taskNo: 'T-KEEP', name: 'keep' }));
    await repo.upsert(QualityTarget.create({ wbsId: testIds.wbsId, taskNo: 'T-DROP', name: 'drop' }));

    const count = await repo.deactivateMissing(testIds.wbsId, ['T-KEEP']);
    expect(count).toBe(1);

    const active = await repo.findByWbs(testIds.wbsId, { isActive: true });
    expect(active.map((t) => t.taskNo)).toEqual(['T-KEEP']);
  });
});

describe('QualityReviewerPrismaRepository', () => {
  let targetRepo: QualityTargetPrismaRepository;
  let reviewerRepo: QualityReviewerPrismaRepository;

  beforeAll(async () => {
    targetRepo = new QualityTargetPrismaRepository();
    reviewerRepo = new QualityReviewerPrismaRepository();
    await seedTestProject(global.prisma);
  });

  afterAll(async () => { await cleanupTestData(global.prisma); });
  beforeEach(async () => { await cleanupQualityDataByWbs(global.prisma, testIds.wbsId); });

  it('replaceForTargetでレビュアーを置き換えできる', async () => {
    const target = await targetRepo.upsert(
      QualityTarget.create({ wbsId: testIds.wbsId, taskNo: 'T-REV', name: 'x' })
    );

    await reviewerRepo.replaceForTarget(target.id!, [
      QualityReviewer.create({ targetId: target.id!, reviewerUserId: 'u1', reviewTaskNo: 'R-1', reviewHours: 2.5 }),
    ]);

    const found = await reviewerRepo.findByTarget(target.id!);
    expect(found).toHaveLength(1);
    expect(found[0].reviewHours).toBe(2.5);
  });
});

describe('QualityFindingPrismaRepository', () => {
  let targetRepo: QualityTargetPrismaRepository;
  let findingRepo: QualityFindingPrismaRepository;

  beforeAll(async () => {
    targetRepo = new QualityTargetPrismaRepository();
    findingRepo = new QualityFindingPrismaRepository();
    await seedTestProject(global.prisma);
  });

  afterAll(async () => { await cleanupTestData(global.prisma); });
  beforeEach(async () => { await cleanupQualityDataByWbs(global.prisma, testIds.wbsId); });

  it('CRUD操作ができる', async () => {
    const target = await targetRepo.upsert(
      QualityTarget.create({ wbsId: testIds.wbsId, taskNo: 'T-F', name: 'x' })
    );

    // create
    const created = await findingRepo.create(
      QualityFinding.create({
        targetId: target.id!,
        source: FindingSource.REVIEW,
        injectionPhase: '基本設計',
        causeType: '単純ミス',
        foundAt: new Date('2026-04-01'),
      })
    );
    expect(created.id).toBeGreaterThan(0);
    expect(created.injectionPhase).toBe('基本設計');

    // findByTarget
    const list = await findingRepo.findByTarget(target.id!);
    expect(list).toHaveLength(1);

    // countByTarget
    const count = await findingRepo.countByTarget(target.id!, FindingSource.REVIEW);
    expect(count).toBe(1);

    // delete
    await findingRepo.delete(created.id!);
    expect(await findingRepo.findByTarget(target.id!)).toHaveLength(0);
  });

  it('sourceでフィルタできる', async () => {
    const target = await targetRepo.upsert(
      QualityTarget.create({ wbsId: testIds.wbsId, taskNo: 'T-FS', name: 'x' })
    );

    await findingRepo.create(QualityFinding.create({ targetId: target.id!, source: FindingSource.REVIEW, foundAt: new Date('2026-04-01') }));
    await findingRepo.create(QualityFinding.create({ targetId: target.id!, source: FindingSource.TEST, foundAt: new Date('2026-04-02') }));

    const reviews = await findingRepo.findByTarget(target.id!, { source: FindingSource.REVIEW });
    expect(reviews).toHaveLength(1);
    expect(reviews[0].source).toBe(FindingSource.REVIEW);
  });
});

describe('QualitySizeMetricPrismaRepository', () => {
  let targetRepo: QualityTargetPrismaRepository;
  let metricRepo: QualitySizeMetricPrismaRepository;

  beforeAll(async () => {
    targetRepo = new QualityTargetPrismaRepository();
    metricRepo = new QualitySizeMetricPrismaRepository();
    await seedTestProject(global.prisma);
  });

  afterAll(async () => { await cleanupTestData(global.prisma); });
  beforeEach(async () => { await cleanupQualityDataByWbs(global.prisma, testIds.wbsId); });

  it('upsertとfindByTargetが動作する', async () => {
    const target = await targetRepo.upsert(
      QualityTarget.create({ wbsId: testIds.wbsId, taskNo: 'T-SM', name: 'x' })
    );

    await metricRepo.upsert(QualitySizeMetric.create({
      targetId: target.id!, unit: QualitySizeUnit.LOC, value: 5000, measuredAt: new Date('2026-04-01'),
    }));
    await metricRepo.upsert(QualitySizeMetric.create({
      targetId: target.id!, unit: QualitySizeUnit.FP, value: 100, measuredAt: new Date('2026-04-01'),
    }));

    const list = await metricRepo.findByTarget(target.id!);
    expect(list).toHaveLength(2);
    expect(list.map((m) => m.unit).sort()).toEqual(['FP', 'LOC']);
  });
});

describe('QualityTestProgressPrismaRepository', () => {
  let targetRepo: QualityTargetPrismaRepository;
  let progressRepo: QualityTestProgressPrismaRepository;

  beforeAll(async () => {
    targetRepo = new QualityTargetPrismaRepository();
    progressRepo = new QualityTestProgressPrismaRepository();
    await seedTestProject(global.prisma);
  });

  afterAll(async () => { await cleanupTestData(global.prisma); });
  beforeEach(async () => { await cleanupQualityDataByWbs(global.prisma, testIds.wbsId); });

  it('upsertとfindByTargetが動作する', async () => {
    const target = await targetRepo.upsert(
      QualityTarget.create({ wbsId: testIds.wbsId, taskNo: 'T-TP', name: 'x' })
    );

    await progressRepo.upsert(QualityTestProgress.create({
      targetId: target.id!, date: new Date('2026-04-01'),
      plannedTotal: 100, executedTotal: 30, passedTotal: 28, failedTotal: 2, blockedTotal: 0,
    }));
    await progressRepo.upsert(QualityTestProgress.create({
      targetId: target.id!, date: new Date('2026-04-02'),
      plannedTotal: 100, executedTotal: 60, passedTotal: 55, failedTotal: 5, blockedTotal: 1,
    }));

    const list = await progressRepo.findByTarget(target.id!);
    expect(list).toHaveLength(2);
    expect(list[0].date.toISOString().slice(0, 10)).toBe('2026-04-01');
    expect(list[1].executedTotal).toBe(60);
  });

  it('同一target+dateでupsertすると更新される', async () => {
    const target = await targetRepo.upsert(
      QualityTarget.create({ wbsId: testIds.wbsId, taskNo: 'T-TPU', name: 'x' })
    );

    await progressRepo.upsert(QualityTestProgress.create({
      targetId: target.id!, date: new Date('2026-04-01'),
      plannedTotal: 100, executedTotal: 30, passedTotal: 28, failedTotal: 2, blockedTotal: 0,
    }));
    await progressRepo.upsert(QualityTestProgress.create({
      targetId: target.id!, date: new Date('2026-04-01'),
      plannedTotal: 100, executedTotal: 50, passedTotal: 46, failedTotal: 4, blockedTotal: 0,
    }));

    const list = await progressRepo.findByTarget(target.id!);
    expect(list).toHaveLength(1);
    expect(list[0].executedTotal).toBe(50);
  });
});

describe('QualityThresholdConfigPrismaRepository', () => {
  let repo: QualityThresholdConfigPrismaRepository;

  beforeAll(async () => {
    repo = new QualityThresholdConfigPrismaRepository();
    await seedTestProject(global.prisma);
  });

  afterAll(async () => { await cleanupTestData(global.prisma); });
  beforeEach(async () => { await cleanupQualityDataByWbs(global.prisma, testIds.wbsId); });

  it('upsertとfindByWbsが動作する', async () => {
    await repo.upsert(QualityThresholdConfig.create({
      wbsId: testIds.wbsId, metricKey: 'bugDensity', phaseCode: 'UT',
      upperLimit: 10.0, lowerLimit: 0.5, warnThreshold: 8.0, dangerThreshold: 12.0,
    }));

    const list = await repo.findByWbs(testIds.wbsId);
    expect(list).toHaveLength(1);
    expect(list[0].metricKey).toBe('bugDensity');
    expect(list[0].upperLimit).toBe(10.0);
  });

  it('findByWbsAndMetricで取得できる', async () => {
    await repo.upsert(QualityThresholdConfig.create({
      wbsId: testIds.wbsId, metricKey: 'testDensity', phaseCode: 'IT',
      referenceValue: 5.0,
    }));

    const found = await repo.findByWbsAndMetric(testIds.wbsId, 'testDensity', 'IT');
    expect(found).not.toBeNull();
    expect(found!.referenceValue).toBe(5.0);

    const notFound = await repo.findByWbsAndMetric(testIds.wbsId, 'testDensity', 'UT');
    expect(notFound).toBeNull();
  });
});
