import { TaskDependencyRepository } from "@/infrastructures/task-dependency-repository";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    taskDependency: {
      create: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      findFirst: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
      deleteMany: jest.fn() as jest.Mock,
    },
  },
}));

describe('TaskDependencyRepository', () => {
  let repository: TaskDependencyRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;
  const now = new Date();

  const mockDepDb = {
    id: 1,
    predecessorTaskId: 10,
    successorTaskId: 20,
    wbsId: 1,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    repository = new TaskDependencyRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('依存関係を作成できること', async () => {
      (prismaMock.taskDependency.create as jest.Mock).mockResolvedValue(mockDepDb);

      const { TaskDependency } = await import('@/domains/task-dependency/task-dependency');
      const dep = TaskDependency.create({ predecessorTaskId: 10, successorTaskId: 20, wbsId: 1 });
      const created = await repository.create(dep);

      expect(prismaMock.taskDependency.create).toHaveBeenCalledWith({
        data: {
          predecessorTaskId: 10,
          successorTaskId: 20,
          wbsId: 1,
        },
      });
      expect(created.id).toBe(1);
      expect(created.predecessorTaskId).toBe(10);
      expect(created.successorTaskId).toBe(20);
    });
  });

  describe('findById', () => {
    it('IDで依存関係を取得できること', async () => {
      (prismaMock.taskDependency.findUnique as jest.Mock).mockResolvedValue(mockDepDb);

      const dep = await repository.findById(1);

      expect(prismaMock.taskDependency.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(dep).not.toBeNull();
      expect(dep?.id).toBe(1);
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      (prismaMock.taskDependency.findUnique as jest.Mock).mockResolvedValue(null);

      const dep = await repository.findById(999);

      expect(dep).toBeNull();
    });
  });

  describe('findByWbsId', () => {
    it('WBS IDで依存関係一覧を取得できること', async () => {
      const mockList = [mockDepDb, { ...mockDepDb, id: 2, predecessorTaskId: 30 }];
      (prismaMock.taskDependency.findMany as jest.Mock).mockResolvedValue(mockList);

      const deps = await repository.findByWbsId(1);

      expect(prismaMock.taskDependency.findMany).toHaveBeenCalledWith({
        where: { wbsId: 1 },
        orderBy: { id: 'asc' },
      });
      expect(deps).toHaveLength(2);
    });
  });

  describe('findPredecessorsByTaskId', () => {
    it('先行タスクの依存関係を取得できること', async () => {
      (prismaMock.taskDependency.findMany as jest.Mock).mockResolvedValue([mockDepDb]);

      const deps = await repository.findPredecessorsByTaskId(20);

      expect(prismaMock.taskDependency.findMany).toHaveBeenCalledWith({
        where: { successorTaskId: 20 },
        orderBy: { id: 'asc' },
      });
      expect(deps).toHaveLength(1);
      expect(deps[0].predecessorTaskId).toBe(10);
    });
  });

  describe('findSuccessorsByTaskId', () => {
    it('後続タスクの依存関係を取得できること', async () => {
      (prismaMock.taskDependency.findMany as jest.Mock).mockResolvedValue([mockDepDb]);

      const deps = await repository.findSuccessorsByTaskId(10);

      expect(prismaMock.taskDependency.findMany).toHaveBeenCalledWith({
        where: { predecessorTaskId: 10 },
        orderBy: { id: 'asc' },
      });
      expect(deps).toHaveLength(1);
      expect(deps[0].successorTaskId).toBe(20);
    });
  });

  describe('delete', () => {
    it('依存関係を削除できること', async () => {
      (prismaMock.taskDependency.delete as jest.Mock).mockResolvedValue({});

      await repository.delete(1);

      expect(prismaMock.taskDependency.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('deleteByTaskId', () => {
    it('タスクIDに関連するすべての依存関係を削除できること', async () => {
      (prismaMock.taskDependency.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      await repository.deleteByTaskId(10);

      expect(prismaMock.taskDependency.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { predecessorTaskId: 10 },
            { successorTaskId: 10 },
          ],
        },
      });
    });
  });

  describe('exists', () => {
    it('依存関係が存在する場合trueを返すこと', async () => {
      (prismaMock.taskDependency.findFirst as jest.Mock).mockResolvedValue(mockDepDb);

      const result = await repository.exists(10, 20);

      expect(prismaMock.taskDependency.findFirst).toHaveBeenCalledWith({
        where: {
          predecessorTaskId: 10,
          successorTaskId: 20,
        },
      });
      expect(result).toBe(true);
    });

    it('依存関係が存在しない場合falseを返すこと', async () => {
      (prismaMock.taskDependency.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.exists(10, 30);

      expect(result).toBe(false);
    });
  });
});
