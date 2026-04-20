import {
  QualityReviewTargetPrismaRepository,
  QualityReviewerPrismaRepository,
} from '@/infrastructures/quality/quality-review-target-prisma.repository';
import { QualityReviewTarget } from '@/domains/quality/quality-review-target';
import { QualityReviewer } from '@/domains/quality/quality-reviewer';
import {
  QualityDocumentType,
  QualityReviewType,
} from '@/domains/quality/value-objects/quality-enums';
import {
  cleanupQualityDataByWbs,
  cleanupTestData,
  seedTestProject,
  testIds,
} from '../../helpers';

describe('QualityReviewTargetPrismaRepository Integration Tests', () => {
  let repo: QualityReviewTargetPrismaRepository;

  beforeAll(async () => {
    repo = new QualityReviewTargetPrismaRepository();
    await seedTestProject(global.prisma);
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma);
  });

  beforeEach(async () => {
    await cleanupQualityDataByWbs(global.prisma, testIds.wbsId);
  });

  describe('upsert / findByWbs / findByWbsAndTaskNo', () => {
    it('新規作成できること', async () => {
      const target = QualityReviewTarget.create({
        wbsId: testIds.wbsId,
        taskNo: 'T-QM-001',
        name: '設計書A',
      });

      const saved = await repo.upsert(target);

      expect(saved.id).toBeGreaterThan(0);
      expect(saved.wbsId).toBe(testIds.wbsId);
      expect(saved.taskNo).toBe('T-QM-001');
      expect(saved.name).toBe('設計書A');
      expect(saved.isActive).toBe(true);
    });

    it('同一 wbsId + taskNo での upsert は既存レコードを更新する', async () => {
      const target1 = QualityReviewTarget.create({
        wbsId: testIds.wbsId,
        taskNo: 'T-QM-002',
        name: '初期名称',
      });
      const first = await repo.upsert(target1);

      const target2 = QualityReviewTarget.reconstruct({
        id: first.id!,
        wbsId: testIds.wbsId,
        taskNo: 'T-QM-002',
        name: '更新後名称',
        documentType: QualityDocumentType.DESIGN,
        reviewType: QualityReviewType.FORMAL,
        isActive: true,
      });
      const second = await repo.upsert(target2);

      expect(second.id).toBe(first.id);
      expect(second.name).toBe('更新後名称');
      expect(second.documentType).toBe(QualityDocumentType.DESIGN);
      expect(second.reviewType).toBe(QualityReviewType.FORMAL);
    });

    it('findByWbs は isActive フィルタでしぼり込める', async () => {
      const active = QualityReviewTarget.create({
        wbsId: testIds.wbsId,
        taskNo: 'T-QM-ACT',
        name: 'Active',
      });
      const inactiveTarget = QualityReviewTarget.create({
        wbsId: testIds.wbsId,
        taskNo: 'T-QM-INACT',
        name: 'Inactive',
      });
      await repo.upsert(active);
      await repo.upsert(inactiveTarget);
      await repo.deactivateMissing(testIds.wbsId, ['T-QM-ACT']);

      const activeOnly = await repo.findByWbs(testIds.wbsId, { isActive: true });
      const inactiveOnly = await repo.findByWbs(testIds.wbsId, { isActive: false });

      expect(activeOnly.map((t) => t.taskNo)).toContain('T-QM-ACT');
      expect(activeOnly.map((t) => t.taskNo)).not.toContain('T-QM-INACT');
      expect(inactiveOnly.map((t) => t.taskNo)).toContain('T-QM-INACT');
    });

    it('findByWbsAndTaskNo は既存レコードを返す', async () => {
      const t = QualityReviewTarget.create({
        wbsId: testIds.wbsId,
        taskNo: 'T-QM-FIND',
        name: 'find',
      });
      const saved = await repo.upsert(t);

      const found = await repo.findByWbsAndTaskNo(testIds.wbsId, 'T-QM-FIND');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(saved.id);
    });
  });

  describe('deactivateMissing', () => {
    it('アクティブリストに含まれない対象だけ isActive=false にする', async () => {
      await repo.upsert(QualityReviewTarget.create({
        wbsId: testIds.wbsId, taskNo: 'T-KEEP', name: 'keep',
      }));
      await repo.upsert(QualityReviewTarget.create({
        wbsId: testIds.wbsId, taskNo: 'T-DROP', name: 'drop',
      }));

      const deactivated = await repo.deactivateMissing(testIds.wbsId, ['T-KEEP']);

      expect(deactivated).toBe(1);
      const kept = await repo.findByWbsAndTaskNo(testIds.wbsId, 'T-KEEP');
      const dropped = await repo.findByWbsAndTaskNo(testIds.wbsId, 'T-DROP');
      expect(kept!.isActive).toBe(true);
      expect(dropped!.isActive).toBe(false);
    });

    it('isActiveがすでにfalseのものは再度 false にされずカウントされない', async () => {
      const t = await repo.upsert(QualityReviewTarget.create({
        wbsId: testIds.wbsId, taskNo: 'T-ALREADY', name: 'x',
      }));
      await repo.deactivateMissing(testIds.wbsId, []); // first run
      const second = await repo.deactivateMissing(testIds.wbsId, []); // second run should be 0

      expect(second).toBe(0);
      const after = await repo.findByWbsAndTaskNo(testIds.wbsId, 'T-ALREADY');
      expect(after!.isActive).toBe(false);
      expect(after!.id).toBe(t.id);
    });
  });

  describe('論理結合キーの永続化', () => {
    it('WbsTask が削除されても QualityReviewTarget は残り、同じIDを保持する', async () => {
      const target = await repo.upsert(QualityReviewTarget.create({
        wbsId: testIds.wbsId, taskNo: 'T-LOGICAL', name: 'logical',
      }));
      const originalId = target.id!;

      // WbsTask を作成 → 削除（洗い替えシミュレーション）
      const task = await global.prisma.wbsTask.create({
        data: {
          taskNo: 'T-LOGICAL',
          wbsId: testIds.wbsId,
          name: 'logical task',
          phaseId: testIds.phaseId,
          status: 'NOT_STARTED',
        },
      });
      await global.prisma.wbsTask.delete({ where: { id: task.id } });

      // QualityReviewTarget が残っていることを確認
      const reFound = await repo.findByWbsAndTaskNo(testIds.wbsId, 'T-LOGICAL');
      expect(reFound).not.toBeNull();
      expect(reFound!.id).toBe(originalId);
    });
  });
});

describe('QualityReviewerPrismaRepository Integration Tests', () => {
  let targetRepo: QualityReviewTargetPrismaRepository;
  let reviewerRepo: QualityReviewerPrismaRepository;

  beforeAll(async () => {
    targetRepo = new QualityReviewTargetPrismaRepository();
    reviewerRepo = new QualityReviewerPrismaRepository();
    await seedTestProject(global.prisma);
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma);
  });

  beforeEach(async () => {
    await cleanupQualityDataByWbs(global.prisma, testIds.wbsId);
  });

  it('replaceForTarget は既存レビュアーを置き換える', async () => {
    const target = await targetRepo.upsert(QualityReviewTarget.create({
      wbsId: testIds.wbsId, taskNo: 'T-REV', name: 'review target',
    }));

    // 初回: 2名登録
    await reviewerRepo.replaceForTarget(target.id!, [
      QualityReviewer.create({
        targetId: target.id!, reviewerUserId: 'userA', reviewTaskNo: 'R-A',
      }),
      QualityReviewer.create({
        targetId: target.id!, reviewerUserId: 'userB', reviewTaskNo: 'R-B',
      }),
    ]);
    const firstRound = await reviewerRepo.findByTarget(target.id!);
    expect(firstRound).toHaveLength(2);

    // 2回目: 1名に置き換え
    await reviewerRepo.replaceForTarget(target.id!, [
      QualityReviewer.create({
        targetId: target.id!, reviewerUserId: 'userC', reviewTaskNo: 'R-C',
      }),
    ]);
    const secondRound = await reviewerRepo.findByTarget(target.id!);
    expect(secondRound).toHaveLength(1);
    expect(secondRound[0].reviewerUserId).toBe('userC');
    expect(secondRound[0].reviewTaskNo).toBe('R-C');
  });

  it('空配列で replaceForTarget すると全削除される', async () => {
    const target = await targetRepo.upsert(QualityReviewTarget.create({
      wbsId: testIds.wbsId, taskNo: 'T-EMPTY-REV', name: 'x',
    }));
    await reviewerRepo.replaceForTarget(target.id!, [
      QualityReviewer.create({
        targetId: target.id!, reviewerUserId: 'u1', reviewTaskNo: 'R-1',
      }),
    ]);
    expect(await reviewerRepo.findByTarget(target.id!)).toHaveLength(1);

    await reviewerRepo.replaceForTarget(target.id!, []);

    expect(await reviewerRepo.findByTarget(target.id!)).toHaveLength(0);
  });
});
