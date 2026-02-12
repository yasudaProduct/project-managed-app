import { WbsAssigneeRepository } from "@/infrastructures/wbs-assignee-repository";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    wbsAssignee: {
      findUnique: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
    users: {
      findUnique: jest.fn() as jest.Mock,
    },
  },
}));

describe('WbsAssigneeRepository', () => {
  let repository: WbsAssigneeRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  const mockAssigneeDb = {
    id: 1,
    wbsId: 1,
    assigneeId: 'user-1',
    rate: 0.5,
    costPerHour: 5000,
    seq: 1,
    assignee: {
      id: 'user-1',
      name: 'テストユーザー',
      displayName: '表示名',
      email: 'test@example.com',
      costPerHour: 5000,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new WbsAssigneeRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('IDで担当者を取得できること', async () => {
      (prismaMock.wbsAssignee.findUnique as jest.Mock).mockResolvedValue(mockAssigneeDb);

      const assignee = await repository.findById(1);

      expect(prismaMock.wbsAssignee.findUnique).toHaveBeenCalledWith({
        include: { assignee: true },
        where: { id: 1 },
      });
      expect(assignee).not.toBeNull();
      expect(assignee?.id).toBe(1);
      expect(assignee?.userId).toBe('user-1');
      expect(assignee?.getRate()).toBe(0.5);
      expect(assignee?.getCostPerHour()).toBe(5000);
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      (prismaMock.wbsAssignee.findUnique as jest.Mock).mockResolvedValue(null);

      const assignee = await repository.findById(999);

      expect(assignee).toBeNull();
    });
  });

  describe('findByWbsId', () => {
    it('WBS IDで担当者一覧を取得できること', async () => {
      const mockList = [
        mockAssigneeDb,
        { ...mockAssigneeDb, id: 2, assigneeId: 'user-2', assignee: { ...mockAssigneeDb.assignee, id: 'user-2', displayName: '表示名2' } },
      ];
      (prismaMock.wbsAssignee.findMany as jest.Mock).mockResolvedValue(mockList);

      const assignees = await repository.findByWbsId(1);

      expect(prismaMock.wbsAssignee.findMany).toHaveBeenCalledWith({
        where: { wbsId: 1 },
        orderBy: { createdAt: 'desc' },
        include: { assignee: true },
      });
      expect(assignees).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('すべての担当者を取得できること', async () => {
      (prismaMock.wbsAssignee.findMany as jest.Mock).mockResolvedValue([mockAssigneeDb]);

      const assignees = await repository.findAll();

      expect(prismaMock.wbsAssignee.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { assignee: true },
      });
      expect(assignees).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('担当者を作成できること', async () => {
      const mockCreated = { id: 10, wbsId: 1, assigneeId: 'user-1', rate: 0.8, costPerHour: 6000, seq: 2, createdAt: new Date(), updatedAt: new Date() };
      (prismaMock.wbsAssignee.create as jest.Mock).mockResolvedValue(mockCreated);
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(mockAssigneeDb.assignee);

      const newAssignee = WbsAssignee.create({ wbsId: 1, userId: 'user-1', rate: 0.8, costPerHour: 6000, seq: 2 });
      const created = await repository.create(1, newAssignee);

      expect(prismaMock.wbsAssignee.create).toHaveBeenCalledWith({
        data: {
          wbsId: 1,
          assigneeId: 'user-1',
          rate: 0.8,
          costPerHour: 6000,
        },
      });
      expect(created.id).toBe(10);
    });

    it('ユーザーが見つからない場合はエラーをスローすること', async () => {
      const mockCreated = { id: 10, wbsId: 1, assigneeId: 'user-999', rate: 0.8, costPerHour: 6000, seq: 2, createdAt: new Date(), updatedAt: new Date() };
      (prismaMock.wbsAssignee.create as jest.Mock).mockResolvedValue(mockCreated);
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(null);

      const newAssignee = WbsAssignee.create({ wbsId: 1, userId: 'user-999', rate: 0.8 });
      await expect(repository.create(1, newAssignee)).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    it('担当者を更新できること', async () => {
      const mockUpdated = { id: 1, wbsId: 1, assigneeId: 'user-1', rate: 0.9, costPerHour: 7000, seq: 1, createdAt: new Date(), updatedAt: new Date() };
      (prismaMock.wbsAssignee.update as jest.Mock).mockResolvedValue(mockUpdated);
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(mockAssigneeDb.assignee);

      const assignee = WbsAssignee.createFromDb({ id: 1, wbsId: 1, userId: 'user-1', rate: 0.9, costPerHour: 7000, seq: 1 });
      const updated = await repository.update(assignee);

      expect(prismaMock.wbsAssignee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { rate: 0.9, costPerHour: 7000 },
      });
      expect(updated.getRate()).toBe(0.9);
    });

    it('更新時にユーザーが見つからない場合はエラーをスローすること', async () => {
      const mockUpdated = { id: 1, wbsId: 1, assigneeId: 'user-1', rate: 0.9, costPerHour: 7000, seq: 1, createdAt: new Date(), updatedAt: new Date() };
      (prismaMock.wbsAssignee.update as jest.Mock).mockResolvedValue(mockUpdated);
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(null);

      const assignee = WbsAssignee.createFromDb({ id: 1, wbsId: 1, userId: 'user-1', rate: 0.9, costPerHour: 7000, seq: 1 });
      await expect(repository.update(assignee)).rejects.toThrow('User not found');
    });
  });

  describe('delete', () => {
    it('担当者を削除できること', async () => {
      (prismaMock.wbsAssignee.delete as jest.Mock).mockResolvedValue({});

      await repository.delete(1);

      expect(prismaMock.wbsAssignee.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
