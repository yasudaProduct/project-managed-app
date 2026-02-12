import { GeppoPrismaRepository } from "@/infrastructures/geppo/geppo-prisma.repository";

jest.mock('@/lib/prisma/geppo', () => ({
  __esModule: true,
  geppoPrisma: {
    $queryRaw: jest.fn() as jest.Mock,
    geppo: {
      count: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
    },
  },
}));

import { geppoPrisma } from '@/lib/prisma/geppo';

describe('GeppoPrismaRepository', () => {
  let repository: GeppoPrismaRepository;
  const geppoPrismaMock = geppoPrisma as jest.Mocked<typeof geppoPrisma>;

  beforeEach(() => {
    repository = new GeppoPrismaRepository();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('testConnection', () => {
    it('接続成功時にtrueを返すこと', async () => {
      (geppoPrismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      const result = await repository.testConnection();

      expect(result).toBe(true);
    });

    it('接続失敗時にfalseを返すこと', async () => {
      (geppoPrismaMock.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await repository.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('searchWorkEntries', () => {
    const mockGeppoDb = {
      MEMBER_ID: 'M001',
      GEPPO_YYYYMM: '202501',
      ROW_NO: 1,
      COMPANY_NAME: 'テスト会社',
      MEMBER_NAME: 'テストメンバー',
      PROJECT_ID: 'P001',
      PROJECT_SUB_ID: 'PS001',
      WBS_NO: 'W001',
      WBS_NAME: 'テストWBS',
      WORK_NAME: '開発作業',
      WORK_STATUS: '完了',
      DAY01: 8, DAY02: 8, DAY03: 0, DAY04: 0, DAY05: 8,
      DAY06: 0, DAY07: 0, DAY08: 8, DAY09: 8, DAY10: 8,
      DAY11: 0, DAY12: 0, DAY13: 8, DAY14: 8, DAY15: 8,
      DAY16: 0, DAY17: 0, DAY18: 8, DAY19: 8, DAY20: 8,
      DAY21: 0, DAY22: 0, DAY23: 8, DAY24: 8, DAY25: 8,
      DAY26: 0, DAY27: 0, DAY28: 8, DAY29: 8, DAY30: 8,
      DAY31: 0,
    };

    it('フィルターなしで作業実績を取得できること', async () => {
      (geppoPrismaMock.geppo.count as jest.Mock).mockResolvedValue(1);
      (geppoPrismaMock.geppo.findMany as jest.Mock).mockResolvedValue([mockGeppoDb]);

      const result = await repository.searchWorkEntries(
        {},
        { page: 1, limit: 10 }
      );

      expect(result.total).toBe(1);
      expect(result.geppos).toHaveLength(1);
      expect(result.geppos[0].MEMBER_ID).toBe('M001');
      expect(result.geppos[0].PROJECT_ID).toBe('P001');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('PROJECT_IDフィルターで検索できること', async () => {
      (geppoPrismaMock.geppo.count as jest.Mock).mockResolvedValue(1);
      (geppoPrismaMock.geppo.findMany as jest.Mock).mockResolvedValue([mockGeppoDb]);

      await repository.searchWorkEntries(
        { PROJECT_ID: 'P001' },
        { page: 1, limit: 10 }
      );

      expect(geppoPrismaMock.geppo.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ PROJECT_ID: 'P001' }),
      });
    });

    it('MEMBER_IDフィルターで検索できること', async () => {
      (geppoPrismaMock.geppo.count as jest.Mock).mockResolvedValue(1);
      (geppoPrismaMock.geppo.findMany as jest.Mock).mockResolvedValue([mockGeppoDb]);

      await repository.searchWorkEntries(
        { MEMBER_ID: 'M001' },
        { page: 1, limit: 10 }
      );

      expect(geppoPrismaMock.geppo.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ MEMBER_ID: 'M001' }),
      });
    });

    it('ページネーションが正しく計算されること', async () => {
      (geppoPrismaMock.geppo.count as jest.Mock).mockResolvedValue(25);
      (geppoPrismaMock.geppo.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.searchWorkEntries(
        {},
        { page: 2, limit: 10 }
      );

      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
      expect(geppoPrismaMock.geppo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });

    it('最終ページではhasNextPageがfalseになること', async () => {
      (geppoPrismaMock.geppo.count as jest.Mock).mockResolvedValue(20);
      (geppoPrismaMock.geppo.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.searchWorkEntries(
        {},
        { page: 2, limit: 10 }
      );

      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('検索失敗時にエラーをスローすること', async () => {
      (geppoPrismaMock.geppo.count as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        repository.searchWorkEntries({}, { page: 1, limit: 10 })
      ).rejects.toThrow('作業実績の検索に失敗しました');
    });

    it('ソート条件を指定できること', async () => {
      (geppoPrismaMock.geppo.count as jest.Mock).mockResolvedValue(0);
      (geppoPrismaMock.geppo.findMany as jest.Mock).mockResolvedValue([]);

      await repository.searchWorkEntries(
        {},
        { page: 1, limit: 10, sortBy: 'PROJECT_ID', sortOrder: 'asc' }
      );

      expect(geppoPrismaMock.geppo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { PROJECT_ID: 'asc' },
        })
      );
    });
  });
});
