import { SyncQualityTargetsService } from '@/applications/quality/sync-quality-targets.service';
import {
  QualityReviewTargetPrismaRepository,
  QualityReviewerPrismaRepository,
} from '@/infrastructures/quality/quality-review-target-prisma.repository';
import { QualityTaskPrismaRepository } from '@/infrastructures/quality/quality-task-prisma.repository';
import type { PrismaClient } from '@prisma/client';
import {
  cleanupQualityDataByWbs,
  cleanupTestData,
  seedTestProject,
  testIds,
} from '../../helpers';

async function ensureUser(prisma: PrismaClient, id: string, name: string) {
  await prisma.users.upsert({
    where: { id },
    update: { name, displayName: name },
    create: {
      id,
      email: `${id}@example.com`,
      name,
      displayName: name,
    },
  });
}

async function ensureAssignee(
  prisma: PrismaClient,
  wbsId: number,
  userId: string,
): Promise<number> {
  const existing = await prisma.wbsAssignee.findFirst({
    where: { wbsId, assigneeId: userId },
  });
  if (existing) return existing.id;
  const created = await prisma.wbsAssignee.create({
    data: { wbsId, assigneeId: userId },
  });
  return created.id;
}

async function createTask(
  prisma: PrismaClient,
  args: {
    wbsId: number;
    taskNo: string;
    name: string;
    phaseId: number;
    tantoRev?: string | null;
    assigneeId?: number | null;
  },
): Promise<number> {
  const created = await prisma.wbsTask.create({
    data: {
      wbsId: args.wbsId,
      taskNo: args.taskNo,
      name: args.name,
      phaseId: args.phaseId,
      tantoRev: args.tantoRev ?? null,
      assigneeId: args.assigneeId ?? null,
      status: 'NOT_STARTED',
    },
  });
  return created.id;
}

async function cleanupWbsTasks(prisma: PrismaClient, wbsId: number) {
  await prisma.wbsTask.deleteMany({ where: { wbsId } });
  await prisma.wbsAssignee.deleteMany({ where: { wbsId } });
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

    await ensureUser(global.prisma, 'author-1', '著者太郎');
    await ensureUser(global.prisma, 'reviewer-1', 'レビュアー一郎');
    await ensureUser(global.prisma, 'reviewer-2', 'レビュアー二郎');
  });

  afterAll(async () => {
    await cleanupWbsTasks(global.prisma, testIds.wbsId);
    await global.prisma.users.deleteMany({
      where: { id: { in: ['author-1', 'reviewer-1', 'reviewer-2'] } },
    });
    await cleanupTestData(global.prisma);
  });

  beforeEach(async () => {
    await cleanupQualityDataByWbs(global.prisma, testIds.wbsId);
    await cleanupWbsTasks(global.prisma, testIds.wbsId);
  });

  describe('syncForWbs', () => {
    it('tantoRev が非空の WbsTask のみ評価対象として作成される', async () => {
      const authorAssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'author-1');

      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-001',
        name: '設計書A',
        phaseId: testIds.phaseId,
        tantoRev: 'reviewer-1',
        assigneeId: authorAssigneeId,
      });
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-002',
        name: 'コーディングB',
        phaseId: testIds.phaseId,
        tantoRev: null,
        assigneeId: authorAssigneeId,
      });
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-003',
        name: '設計書C',
        phaseId: testIds.phaseId,
        tantoRev: '   ',
        assigneeId: authorAssigneeId,
      });

      const result = await service.syncForWbs(testIds.wbsId);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);

      const targets = await targetRepo.findByWbs(testIds.wbsId, { isActive: true });
      expect(targets).toHaveLength(1);
      expect(targets[0].taskNo).toBe('W-001');
      expect(targets[0].name).toBe('設計書A');
    });

    it('評価対象taskNoの接頭辞+"-R"にマッチするレビュータスクがレビュアーとして登録される', async () => {
      const authorAssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'author-1');
      const reviewer1AssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'reviewer-1');
      const reviewer2AssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'reviewer-2');

      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-010',
        name: '設計書X',
        phaseId: testIds.phaseId,
        tantoRev: 'gate',
        assigneeId: authorAssigneeId,
      });
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-010-R1',
        name: '設計書X レビュー1',
        phaseId: testIds.phaseId,
        assigneeId: reviewer1AssigneeId,
      });
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-010-R2',
        name: '設計書X レビュー2',
        phaseId: testIds.phaseId,
        assigneeId: reviewer2AssigneeId,
      });

      await service.syncForWbs(testIds.wbsId);

      const target = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-010');
      expect(target).not.toBeNull();
      const reviewers = await reviewerRepo.findByTarget(target!.id!);
      expect(reviewers).toHaveLength(2);
      expect(reviewers.map((r) => r.reviewerUserId).sort()).toEqual(['reviewer-1', 'reviewer-2']);
      expect(reviewers.map((r) => r.reviewTaskNo).sort()).toEqual(['W-010-R1', 'W-010-R2']);
    });

    it('レビュータスクに assignee がない場合はスキップされる', async () => {
      const authorAssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'author-1');

      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-020',
        name: '設計書Y',
        phaseId: testIds.phaseId,
        tantoRev: 'gate',
        assigneeId: authorAssigneeId,
      });
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-020-R',
        name: '設計書Y レビュー',
        phaseId: testIds.phaseId,
        assigneeId: null,
      });

      await service.syncForWbs(testIds.wbsId);

      const target = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-020');
      expect(target).not.toBeNull();
      const reviewers = await reviewerRepo.findByTarget(target!.id!);
      expect(reviewers).toHaveLength(0);
    });

    it('マッチするレビュータスクが無くても評価対象は作成される', async () => {
      const authorAssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'author-1');
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-030',
        name: '設計書Z',
        phaseId: testIds.phaseId,
        tantoRev: 'gate',
        assigneeId: authorAssigneeId,
      });

      const result = await service.syncForWbs(testIds.wbsId);

      expect(result.created).toBe(1);
      const target = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-030');
      expect(target).not.toBeNull();
      const reviewers = await reviewerRepo.findByTarget(target!.id!);
      expect(reviewers).toHaveLength(0);
    });

    it('再同期で tantoRev が外れたタスクは isActive=false 化される', async () => {
      const authorAssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'author-1');

      const firstIds = [
        await createTask(global.prisma, {
          wbsId: testIds.wbsId,
          taskNo: 'W-040',
          name: '設計書P',
          phaseId: testIds.phaseId,
          tantoRev: 'gate',
          assigneeId: authorAssigneeId,
        }),
        await createTask(global.prisma, {
          wbsId: testIds.wbsId,
          taskNo: 'W-041',
          name: '設計書Q',
          phaseId: testIds.phaseId,
          tantoRev: 'gate',
          assigneeId: authorAssigneeId,
        }),
      ];
      await service.syncForWbs(testIds.wbsId);

      // W-041 から tantoRev を外す
      await global.prisma.wbsTask.update({
        where: { id: firstIds[1] },
        data: { tantoRev: null },
      });

      const result = await service.syncForWbs(testIds.wbsId);

      expect(result.deactivated).toBe(1);
      const active = await targetRepo.findByWbs(testIds.wbsId, { isActive: true });
      const inactive = await targetRepo.findByWbs(testIds.wbsId, { isActive: false });
      expect(active.map((t) => t.taskNo)).toEqual(['W-040']);
      expect(inactive.map((t) => t.taskNo)).toEqual(['W-041']);
    });

    it('再同期時は既存の評価対象IDが保持される', async () => {
      const authorAssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'author-1');
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-050',
        name: '設計書R',
        phaseId: testIds.phaseId,
        tantoRev: 'gate',
        assigneeId: authorAssigneeId,
      });

      await service.syncForWbs(testIds.wbsId);
      const before = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-050');

      await service.syncForWbs(testIds.wbsId);
      const after = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-050');

      expect(after).not.toBeNull();
      expect(after!.id).toBe(before!.id);
    });

    it('再同期時にレビュータスクが入れ替わるとレビュアーが洗い替えられる', async () => {
      const authorAssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'author-1');
      const reviewer1AssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'reviewer-1');
      const reviewer2AssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'reviewer-2');

      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-060',
        name: '設計書S',
        phaseId: testIds.phaseId,
        tantoRev: 'gate',
        assigneeId: authorAssigneeId,
      });
      const reviewTaskId = await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-060-R',
        name: '設計書S レビュー',
        phaseId: testIds.phaseId,
        assigneeId: reviewer1AssigneeId,
      });

      await service.syncForWbs(testIds.wbsId);
      const target = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-060');
      const before = await reviewerRepo.findByTarget(target!.id!);
      expect(before.map((r) => r.reviewerUserId)).toEqual(['reviewer-1']);

      await global.prisma.wbsTask.update({
        where: { id: reviewTaskId },
        data: { assigneeId: reviewer2AssigneeId },
      });

      await service.syncForWbs(testIds.wbsId);
      const after = await reviewerRepo.findByTarget(target!.id!);
      expect(after).toHaveLength(1);
      expect(after[0].reviewerUserId).toBe('reviewer-2');
    });

    it('"-R"プレフィックスは"-R"でない接尾辞タスク(例:W-0101)を巻き込まない', async () => {
      const authorAssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'author-1');
      const reviewer1AssigneeId = await ensureAssignee(global.prisma, testIds.wbsId, 'reviewer-1');

      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-070',
        name: '設計書T',
        phaseId: testIds.phaseId,
        tantoRev: 'gate',
        assigneeId: authorAssigneeId,
      });
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-0701',
        name: '隣接タスク',
        phaseId: testIds.phaseId,
        assigneeId: reviewer1AssigneeId,
      });
      await createTask(global.prisma, {
        wbsId: testIds.wbsId,
        taskNo: 'W-070-R',
        name: '設計書T レビュー',
        phaseId: testIds.phaseId,
        assigneeId: reviewer1AssigneeId,
      });

      await service.syncForWbs(testIds.wbsId);

      const target = await targetRepo.findByWbsAndTaskNo(testIds.wbsId, 'W-070');
      const reviewers = await reviewerRepo.findByTarget(target!.id!);
      expect(reviewers).toHaveLength(1);
      expect(reviewers[0].reviewTaskNo).toBe('W-070-R');
    });
  });
});
