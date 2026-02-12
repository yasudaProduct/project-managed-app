import { ImportJobPrismaRepository } from "@/infrastructures/import-job/import-job-prisma.repository";
import { ImportJob } from "@/domains/import-job/import-job";
import { ImportJobStatuses } from "@/domains/import-job/import-job-enums";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    importJob: {
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
    },
    importJobProgress: {
      create: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
    },
  },
}));

describe('ImportJobPrismaRepository', () => {
  let repository: ImportJobPrismaRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;
  const now = new Date();

  const mockJobDb = {
    id: 'job-1',
    type: 'WBS',
    status: 'PENDING',
    createdBy: 'user-1',
    createdAt: now,
    updatedAt: now,
    targetMonth: '2025-01',
    targetProjectIds: ['proj-1'],
    wbsId: 1,
    options: {},
    totalRecords: 0,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    startedAt: null,
    completedAt: null,
    errorDetails: null,
    result: null,
  };

  beforeEach(() => {
    repository = new ImportJobPrismaRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('インポートジョブを作成できること', async () => {
      (prismaMock.importJob.create as jest.Mock).mockResolvedValue(mockJobDb);

      const job = new ImportJob(
        '', 'WBS', ImportJobStatuses.PENDING, 'user-1', now, now,
        '2025-01', ['proj-1'], 1, {}
      );
      const created = await repository.create(job);

      expect(prismaMock.importJob.create).toHaveBeenCalled();
      expect(created.id).toBe('job-1');
      expect(created.type).toBe('WBS');
      expect(created.status).toBe('PENDING');
    });
  });

  describe('update', () => {
    it('インポートジョブを更新できること', async () => {
      const mockUpdated = { ...mockJobDb, status: 'RUNNING', startedAt: now };
      (prismaMock.importJob.update as jest.Mock).mockResolvedValue(mockUpdated);

      const job = new ImportJob(
        'job-1', 'WBS', ImportJobStatuses.RUNNING, 'user-1', now, now,
        '2025-01', ['proj-1'], 1, {}, 100, 50, 45, 5, now
      );
      const updated = await repository.update(job);

      expect(prismaMock.importJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: 'RUNNING',
          totalRecords: 100,
          processedRecords: 50,
        }),
      });
      expect(updated.status).toBe('RUNNING');
    });
  });

  describe('findById', () => {
    it('IDでジョブを取得できること', async () => {
      (prismaMock.importJob.findUnique as jest.Mock).mockResolvedValue(mockJobDb);

      const job = await repository.findById('job-1');

      expect(prismaMock.importJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-1' },
      });
      expect(job).not.toBeNull();
      expect(job?.id).toBe('job-1');
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      (prismaMock.importJob.findUnique as jest.Mock).mockResolvedValue(null);

      const job = await repository.findById('not-exist');

      expect(job).toBeNull();
    });
  });

  describe('findAll', () => {
    it('すべてのジョブを取得できること', async () => {
      (prismaMock.importJob.findMany as jest.Mock).mockResolvedValue([mockJobDb]);

      const jobs = await repository.findAll();

      expect(prismaMock.importJob.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      expect(jobs).toHaveLength(1);
    });

    it('limitを指定できること', async () => {
      (prismaMock.importJob.findMany as jest.Mock).mockResolvedValue([]);

      await repository.findAll(50);

      expect(prismaMock.importJob.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('findByUser', () => {
    it('ユーザーIDでジョブを検索できること', async () => {
      (prismaMock.importJob.findMany as jest.Mock).mockResolvedValue([mockJobDb]);

      const jobs = await repository.findByUser('user-1');

      expect(prismaMock.importJob.findMany).toHaveBeenCalledWith({
        where: { createdBy: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(jobs).toHaveLength(1);
    });
  });

  describe('findByStatus', () => {
    it('ステータスでジョブを検索できること', async () => {
      (prismaMock.importJob.findMany as jest.Mock).mockResolvedValue([mockJobDb]);

      const jobs = await repository.findByStatus(ImportJobStatuses.PENDING);

      expect(prismaMock.importJob.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      expect(jobs).toHaveLength(1);
    });
  });

  describe('findByTypeAndStatus', () => {
    it('タイプとステータスでジョブを検索できること', async () => {
      (prismaMock.importJob.findMany as jest.Mock).mockResolvedValue([mockJobDb]);

      const jobs = await repository.findByTypeAndStatus('WBS', ImportJobStatuses.PENDING);

      expect(prismaMock.importJob.findMany).toHaveBeenCalledWith({
        where: { type: 'WBS', status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      expect(jobs).toHaveLength(1);
    });
  });

  describe('addProgress', () => {
    it('進捗情報を追加できること', async () => {
      (prismaMock.importJobProgress.create as jest.Mock).mockResolvedValue({});

      await repository.addProgress('job-1', {
        message: 'テスト進捗',
        level: 'info',
        recordedAt: now,
        detail: { step: 1 },
      });

      expect(prismaMock.importJobProgress.create).toHaveBeenCalledWith({
        data: {
          jobId: 'job-1',
          message: 'テスト進捗',
          detail: { step: 1 },
          level: 'info',
          recordedAt: now,
        },
      });
    });
  });

  describe('getProgress', () => {
    it('進捗情報一覧を取得できること', async () => {
      const mockProgress = [
        { id: 1, jobId: 'job-1', message: '進捗1', detail: null, level: 'info', recordedAt: now },
        { id: 2, jobId: 'job-1', message: '進捗2', detail: { step: 2 }, level: 'warning', recordedAt: now },
      ];
      (prismaMock.importJobProgress.findMany as jest.Mock).mockResolvedValue(mockProgress);

      const progress = await repository.getProgress('job-1');

      expect(prismaMock.importJobProgress.findMany).toHaveBeenCalledWith({
        where: { jobId: 'job-1' },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      });
      expect(progress).toHaveLength(2);
      expect(progress[0].message).toBe('進捗1');
      expect(progress[1].level).toBe('warning');
    });
  });
});
