import { WbsRepository } from "@/infrastructures/wbs-repository";
import { Wbs } from "@/domains/wbs/wbs";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    wbs: {
      findUnique: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
  },
}));

describe('WbsRepository', () => {
  let repository: WbsRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  const mockWbsDb = {
    id: 1,
    name: 'テストWBS',
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new WbsRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('IDでWBSを取得できること', async () => {
      (prismaMock.wbs.findUnique as jest.Mock).mockResolvedValue(mockWbsDb);

      const wbs = await repository.findById(1);

      expect(prismaMock.wbs.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(wbs).not.toBeNull();
      expect(wbs?.id).toBe(1);
      expect(wbs?.name).toBe('テストWBS');
      expect(wbs?.projectId).toBe('project-1');
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      (prismaMock.wbs.findUnique as jest.Mock).mockResolvedValue(null);

      const wbs = await repository.findById(999);

      expect(wbs).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('プロジェクトIDでWBS一覧を取得できること', async () => {
      const mockList = [mockWbsDb, { ...mockWbsDb, id: 2, name: 'WBS2' }];
      (prismaMock.wbs.findMany as jest.Mock).mockResolvedValue(mockList);

      const wbsList = await repository.findByProjectId('project-1');

      expect(prismaMock.wbs.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(wbsList).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('すべてのWBSを取得できること', async () => {
      (prismaMock.wbs.findMany as jest.Mock).mockResolvedValue([mockWbsDb]);

      const wbsList = await repository.findAll();

      expect(prismaMock.wbs.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(wbsList).toHaveLength(1);
    });

    it('WBSが存在しない場合は空配列を返すこと', async () => {
      (prismaMock.wbs.findMany as jest.Mock).mockResolvedValue([]);

      const wbsList = await repository.findAll();

      expect(wbsList).toEqual([]);
    });
  });

  describe('create', () => {
    it('WBSを新規作成できること', async () => {
      const mockCreated = { ...mockWbsDb, id: 10 };
      (prismaMock.wbs.create as jest.Mock).mockResolvedValue(mockCreated);

      const newWbs = Wbs.create({ name: 'テストWBS', projectId: 'project-1' });
      const created = await repository.create(newWbs);

      expect(prismaMock.wbs.create).toHaveBeenCalledWith({
        data: { name: 'テストWBS', projectId: 'project-1' },
      });
      expect(created.id).toBe(10);
      expect(created.name).toBe('テストWBS');
    });
  });

  describe('update', () => {
    it('WBSを更新できること', async () => {
      const mockUpdated = { ...mockWbsDb, name: '更新後WBS' };
      (prismaMock.wbs.update as jest.Mock).mockResolvedValue(mockUpdated);

      const wbs = Wbs.createFromDb({ id: 1, name: '更新後WBS', projectId: 'project-1' });
      const updated = await repository.update(wbs);

      expect(prismaMock.wbs.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: '更新後WBS', projectId: 'project-1' },
      });
      expect(updated.name).toBe('更新後WBS');
    });
  });

  describe('save', () => {
    it('IDがある場合はupdateを呼ぶこと', async () => {
      const mockUpdated = { ...mockWbsDb };
      (prismaMock.wbs.update as jest.Mock).mockResolvedValue(mockUpdated);

      const wbs = Wbs.createFromDb({ id: 1, name: 'テストWBS', projectId: 'project-1' });
      await repository.save(wbs);

      expect(prismaMock.wbs.update).toHaveBeenCalled();
      expect(prismaMock.wbs.create).not.toHaveBeenCalled();
    });

    it('IDがない場合はcreateを呼ぶこと', async () => {
      const mockCreated = { ...mockWbsDb, id: 10 };
      (prismaMock.wbs.create as jest.Mock).mockResolvedValue(mockCreated);

      const wbs = Wbs.create({ name: '新規WBS', projectId: 'project-1' });
      await repository.save(wbs);

      expect(prismaMock.wbs.create).toHaveBeenCalled();
      expect(prismaMock.wbs.update).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('存在するIDの場合trueを返すこと', async () => {
      (prismaMock.wbs.findUnique as jest.Mock).mockResolvedValue(mockWbsDb);

      const result = await repository.exists(1);

      expect(result).toBe(true);
    });

    it('存在しないIDの場合falseを返すこと', async () => {
      (prismaMock.wbs.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('WBSを削除できること', async () => {
      (prismaMock.wbs.delete as jest.Mock).mockResolvedValue({});

      await repository.delete(1);

      expect(prismaMock.wbs.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
