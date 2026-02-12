import { MilestoneRepository } from "@/infrastructures/milestone/milestone.repository";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    milestone: {
      findMany: jest.fn() as jest.Mock,
    },
  },
}));

describe('MilestoneRepository', () => {
  let repository: MilestoneRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  const mockMilestoneDb = {
    id: 1,
    name: 'マイルストーン1',
    date: new Date('2025-06-30'),
    wbsId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new MilestoneRepository();
    jest.clearAllMocks();
  });

  describe('findByWbsId', () => {
    it('WBS IDでマイルストーン一覧を取得できること', async () => {
      const mockList = [
        mockMilestoneDb,
        { ...mockMilestoneDb, id: 2, name: 'マイルストーン2', date: new Date('2025-12-31') },
      ];
      (prismaMock.milestone.findMany as jest.Mock).mockResolvedValue(mockList);

      const milestones = await repository.findByWbsId(1);

      expect(prismaMock.milestone.findMany).toHaveBeenCalledWith({
        where: { wbsId: 1 },
      });
      expect(milestones).toHaveLength(2);
      expect(milestones[0].id).toBe(1);
      expect(milestones[0].name).toBe('マイルストーン1');
      expect(milestones[0].date).toEqual(new Date('2025-06-30'));
      expect(milestones[1].id).toBe(2);
      expect(milestones[1].name).toBe('マイルストーン2');
    });

    it('マイルストーンが存在しない場合は空配列を返すこと', async () => {
      (prismaMock.milestone.findMany as jest.Mock).mockResolvedValue([]);

      const milestones = await repository.findByWbsId(999);

      expect(milestones).toEqual([]);
    });
  });
});
