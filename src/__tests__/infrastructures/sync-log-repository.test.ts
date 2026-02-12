import { SyncLogRepository } from "@/infrastructures/sync/SyncLogRepository";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    syncLog: {
      findFirst: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
    },
  },
}));

describe('SyncLogRepository', () => {
  let repository: SyncLogRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;
  const now = new Date();

  const mockSyncLogDb = {
    id: 1,
    projectId: 'project-1',
    syncStatus: 'SUCCESS',
    syncedAt: now,
    recordCount: 100,
    addedCount: 10,
    updatedCount: 5,
    deletedCount: 2,
    errorDetails: null,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    repository = new SyncLogRepository();
    jest.clearAllMocks();
  });

  describe('getLastSync', () => {
    it('最新の同期ログを取得できること', async () => {
      (prismaMock.syncLog.findFirst as jest.Mock).mockResolvedValue(mockSyncLogDb);

      const log = await repository.getLastSync('project-1');

      expect(prismaMock.syncLog.findFirst).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { syncedAt: 'desc' },
      });
      expect(log).not.toBeNull();
      expect(log?.projectId).toBe('project-1');
      expect(log?.syncStatus).toBe('SUCCESS');
      expect(log?.recordCount).toBe(100);
    });

    it('同期ログが存在しない場合はnullを返すこと', async () => {
      (prismaMock.syncLog.findFirst as jest.Mock).mockResolvedValue(null);

      const log = await repository.getLastSync('project-1');

      expect(log).toBeNull();
    });

    it('errorDetailsがオブジェクトの場合はそのまま返すこと', async () => {
      (prismaMock.syncLog.findFirst as jest.Mock).mockResolvedValue({
        ...mockSyncLogDb,
        errorDetails: { message: 'エラー発生' },
      });

      const log = await repository.getLastSync('project-1');

      expect(log?.errorDetails).toEqual({ message: 'エラー発生' });
    });

    it('errorDetailsが配列の場合はundefinedを返すこと', async () => {
      (prismaMock.syncLog.findFirst as jest.Mock).mockResolvedValue({
        ...mockSyncLogDb,
        errorDetails: ['error1', 'error2'],
      });

      const log = await repository.getLastSync('project-1');

      expect(log?.errorDetails).toBeUndefined();
    });
  });

  describe('recordSync', () => {
    it('同期ログを記録できること', async () => {
      (prismaMock.syncLog.create as jest.Mock).mockResolvedValue({});

      await repository.recordSync({
        projectId: 'project-1',
        syncStatus: 'SUCCESS',
        syncedAt: now,
        recordCount: 100,
        addedCount: 10,
        updatedCount: 5,
        deletedCount: 2,
      });

      expect(prismaMock.syncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'project-1',
          syncStatus: 'SUCCESS',
          recordCount: 100,
        }),
      });
    });
  });

  describe('getHistory', () => {
    it('同期履歴を取得できること', async () => {
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([mockSyncLogDb]);

      const logs = await repository.getHistory('project-1');

      expect(prismaMock.syncLog.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { syncedAt: 'desc' },
        take: 10,
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].syncStatus).toBe('SUCCESS');
    });

    it('limitを指定できること', async () => {
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      await repository.getHistory('project-1', 5);

      expect(prismaMock.syncLog.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { syncedAt: 'desc' },
        take: 5,
      });
    });

    it('履歴が空の場合は空配列を返すこと', async () => {
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      const logs = await repository.getHistory('project-1');

      expect(logs).toEqual([]);
    });
  });
});
