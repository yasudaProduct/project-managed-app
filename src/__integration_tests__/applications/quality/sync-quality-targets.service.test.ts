import { SyncQualityTargetsService } from '@/applications/quality/sync-quality-targets.service';
import {
  QualityReviewTargetPrismaRepository,
  QualityReviewerPrismaRepository,
} from '@/infrastructures/quality/quality-review-target-prisma.repository';
import { QualityTaskPrismaRepository } from '@/infrastructures/quality/quality-task-prisma.repository';
import { ExcelWbs } from '@/domains/sync/ExcelWbs';
import {
  cleanupQualityDataByWbs,
  cleanupTestData,
  seedTestProject,
  testIds,
} from '../../helpers';

function makeRow(overrides: Partial<ExcelWbs>): ExcelWbs {
  return {
    ROW_NO: 1,
    PROJECT_ID: 'P-1',
    WBS_ID: 'W-001',
    PHASE: 'D1',
    ACTIVITY: 'ACT',
    TASK: '設計書A',
    TANTO: 'author',
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

describe('SyncQualityTargetsService Integration Tests', () => {
  let service: SyncQualityTargetsService;
  let targetRepo: QualityReviewTargetPrismaRepository;
  let reviewerRepo: QualityReviewerPrismaRepository;

  beforeAll(async () => {
    targetRepo = new QualityReviewTargetPrismaRepository();
    reviewerRepo = new QualityReviewerPrismaRepository();
    const taskRepo = new QualityTaskPrismaRepository();
    service = new SyncQualityTargetsService(targetRepo, reviewerRepo, taskRepo);
    await seedTestProject(global.prisma);
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma);
  });

  beforeEach(async () => {
    await cleanupQualityDataByWbs(global.prisma, testIds.wbsId);
  });

  describe('syncFromExcelRows', () => {
    it('TANTO_REV のあるタスクのみ評価対象として作成される', async () => {
      const rows: ExcelWbs[] = [
        makeRow({ WBS_ID: 'W-001', TASK: '設計書A', TANTO: 'author1', TANTO_REV: 'reviewer1' }),
        makeRow({ WBS_ID: 'W-002', TASK: 'コーディングB', TANTO: 'author2', TANTO_REV: null }),
        makeRow({ WBS_ID: 'W-003', TASK: '設計書C', TANTO: 'author3', TANTO_REV: '' }),
      ];

      const result = await service.syncFromExcelRows(testIds.wbsId, rows);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);

      const targets = await targetRepo.findByWbs(testIds.wbsId, { isActive: true });
      expect(targets).toHaveLength(1);
      expect(targets[0].taskNo).toBe('W-001');
      expect(targets[0].name).toBe('設計書A');
    });

    it('TASK名が同一の行は同一評価対象の複数レビュアーとして登録される', async () => {
      const rows: ExcelWbs[] = [
        makeRow({ WBS_ID: 'W-010', TASK: '設計書X', TANTO: 'authorX', TANTO_REV: 'reviewerA' }),
        makeRow({ WBS_ID: 'W-011', TASK: '設計書X', TANTO: 'authorX', TANTO_REV: 'reviewerB' }),
        makeRow({ WBS_ID: 'W-012', TASK: '設計書X', TANTO: 'authorX', TANTO_REV: 'reviewerC' }),
      ];

      const result = await service.syncFromExcelRows(testIds.wbsId, rows);

      expect(result.created).toBe(1);
      const targets = await targetRepo.findByWbs(testIds.wbsId, { isActive: true });
      expect(targets).toHaveLength(1);
      const reviewers = await reviewerRepo.findByTarget(targets[0].id!);
      expect(reviewers).toHaveLength(3);
      expect(reviewers.map((r) => r.reviewerUserId).sort()).toEqual([
        'reviewerA',
        'reviewerB',
        'reviewerC',
      ]);
      expect(reviewers.map((r) => r.reviewTaskNo).sort()).toEqual([
        'W-010',
        'W-011',
        'W-012',
      ]);
    });

    it('再同期で TANTO_REV が外れたタスクは isActive=false 化される', async () => {
      const first: ExcelWbs[] = [
        makeRow({ WBS_ID: 'W-020', TASK: '設計書P', TANTO: 'a', TANTO_REV: 'r1' }),
        makeRow({ WBS_ID: 'W-021', TASK: '設計書Q', TANTO: 'b', TANTO_REV: 'r2' }),
      ];
      await service.syncFromExcelRows(testIds.wbsId, first);

      const second: ExcelWbs[] = [
        makeRow({ WBS_ID: 'W-020', TASK: '設計書P', TANTO: 'a', TANTO_REV: 'r1' }),
        // 設計書Q から TANTO_REV を外した
        makeRow({ WBS_ID: 'W-021', TASK: '設計書Q', TANTO: 'b', TANTO_REV: null }),
      ];
      const result = await service.syncFromExcelRows(testIds.wbsId, second);

      expect(result.deactivated).toBe(1);
      const active = await targetRepo.findByWbs(testIds.wbsId, { isActive: true });
      const inactive = await targetRepo.findByWbs(testIds.wbsId, { isActive: false });
      expect(active.map((t) => t.taskNo)).toEqual(['W-020']);
      expect(inactive.map((t) => t.taskNo)).toEqual(['W-021']);
    });

    it('再同期時は既存の評価対象IDが保持される（論理結合キーの永続化）', async () => {
      const rows: ExcelWbs[] = [
        makeRow({ WBS_ID: 'W-030', TASK: '設計書Z', TANTO: 'a', TANTO_REV: 'r1' }),
      ];
      await service.syncFromExcelRows(testIds.wbsId, rows);
      const before = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-030');

      // 同じキーで再同期
      await service.syncFromExcelRows(testIds.wbsId, rows);
      const after = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-030');

      expect(after).not.toBeNull();
      expect(after!.id).toBe(before!.id);
    });

    it('再同期時はレビュアーが洗い替えられる', async () => {
      const first: ExcelWbs[] = [
        makeRow({ WBS_ID: 'W-040', TASK: 'テストA', TANTO: 'a', TANTO_REV: 'oldReviewer' }),
      ];
      await service.syncFromExcelRows(testIds.wbsId, first);

      const targetBefore = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-040');
      const reviewersBefore = await reviewerRepo.findByTarget(targetBefore!.id!);
      expect(reviewersBefore[0].reviewerUserId).toBe('oldReviewer');

      const second: ExcelWbs[] = [
        makeRow({ WBS_ID: 'W-040', TASK: 'テストA', TANTO: 'a', TANTO_REV: 'newReviewer' }),
      ];
      await service.syncFromExcelRows(testIds.wbsId, second);

      const targetAfter = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-040');
      const reviewersAfter = await reviewerRepo.findByTarget(targetAfter!.id!);
      expect(reviewersAfter).toHaveLength(1);
      expect(reviewersAfter[0].reviewerUserId).toBe('newReviewer');
    });

    it('TASK名が空の行はスキップされる', async () => {
      const rows: ExcelWbs[] = [
        makeRow({ WBS_ID: 'W-050', TASK: '', TANTO_REV: 'reviewer' }),
        makeRow({ WBS_ID: 'W-051', TASK: '   ', TANTO_REV: 'reviewer' }),
      ];

      const result = await service.syncFromExcelRows(testIds.wbsId, rows);

      expect(result.created).toBe(0);
      const targets = await targetRepo.findByWbs(testIds.wbsId);
      expect(targets).toHaveLength(0);
    });
  });
});
