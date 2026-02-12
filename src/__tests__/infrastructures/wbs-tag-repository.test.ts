import { WbsTagRepository } from "@/infrastructures/wbs/wbs-tag-repository";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    wbsTag: {
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
  },
}));

describe('WbsTagRepository', () => {
  let repository: WbsTagRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  const mockTagDb = {
    id: 1,
    wbsId: 1,
    name: 'タグ1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new WbsTagRepository();
    jest.clearAllMocks();
  });

  describe('findByWbsId', () => {
    it('WBS IDでタグ一覧を取得できること', async () => {
      const mockTags = [mockTagDb, { ...mockTagDb, id: 2, name: 'タグ2' }];
      (prismaMock.wbsTag.findMany as jest.Mock).mockResolvedValue(mockTags);

      const tags = await repository.findByWbsId(1);

      expect(prismaMock.wbsTag.findMany).toHaveBeenCalledWith({
        where: { wbsId: 1 },
        orderBy: { name: 'asc' },
      });
      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe('タグ1');
      expect(tags[1].name).toBe('タグ2');
    });

    it('タグが存在しない場合は空配列を返すこと', async () => {
      (prismaMock.wbsTag.findMany as jest.Mock).mockResolvedValue([]);

      const tags = await repository.findByWbsId(999);

      expect(tags).toEqual([]);
    });
  });

  describe('findAllDistinctNames', () => {
    it('重複のないタグ名一覧を取得できること', async () => {
      (prismaMock.wbsTag.findMany as jest.Mock).mockResolvedValue([
        { name: 'フロントエンド' },
        { name: 'バックエンド' },
        { name: 'インフラ' },
      ]);

      const names = await repository.findAllDistinctNames();

      expect(prismaMock.wbsTag.findMany).toHaveBeenCalledWith({
        select: { name: true },
        distinct: ['name'],
        orderBy: { name: 'asc' },
      });
      expect(names).toEqual(['フロントエンド', 'バックエンド', 'インフラ']);
    });
  });

  describe('addTag', () => {
    it('タグを追加できること', async () => {
      (prismaMock.wbsTag.create as jest.Mock).mockResolvedValue(mockTagDb);

      const tag = await repository.addTag(1, 'タグ1');

      expect(prismaMock.wbsTag.create).toHaveBeenCalledWith({
        data: { wbsId: 1, name: 'タグ1' },
      });
      expect(tag.wbsId).toBe(1);
      expect(tag.name).toBe('タグ1');
    });
  });

  describe('removeTag', () => {
    it('タグを削除できること（複合キー使用）', async () => {
      (prismaMock.wbsTag.delete as jest.Mock).mockResolvedValue({});

      await repository.removeTag(1, 'タグ1');

      expect(prismaMock.wbsTag.delete).toHaveBeenCalledWith({
        where: {
          wbsId_name: { wbsId: 1, name: 'タグ1' },
        },
      });
    });
  });

  describe('findWbsIdsByTagNames', () => {
    it('タグ名からWBS IDの一覧を取得できること', async () => {
      (prismaMock.wbsTag.findMany as jest.Mock).mockResolvedValue([
        { wbsId: 1 },
        { wbsId: 3 },
        { wbsId: 5 },
      ]);

      const wbsIds = await repository.findWbsIdsByTagNames(['フロントエンド', 'バックエンド']);

      expect(prismaMock.wbsTag.findMany).toHaveBeenCalledWith({
        where: {
          name: { in: ['フロントエンド', 'バックエンド'] },
        },
        select: { wbsId: true },
        distinct: ['wbsId'],
      });
      expect(wbsIds).toEqual([1, 3, 5]);
    });

    it('該当するタグがない場合は空配列を返すこと', async () => {
      (prismaMock.wbsTag.findMany as jest.Mock).mockResolvedValue([]);

      const wbsIds = await repository.findWbsIdsByTagNames(['存在しないタグ']);

      expect(wbsIds).toEqual([]);
    });
  });
});
