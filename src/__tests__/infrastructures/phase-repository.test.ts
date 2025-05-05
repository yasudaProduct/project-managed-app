// filepath: /Users/yuta/Develop/project-managed-app/src/__tests__/infrastructures/phase-repository.test.ts
import { PhaseRepository } from "@/infrastructures/phase-repository";
import prisma from "@/lib/prisma";

// Prismaクライアントのモック化
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    wbsPhase: {
      findUnique: jest.fn(),
    },
  },
}));

describe('PhaseRepository', () => {
  let phaseRepository: PhaseRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    phaseRepository = new PhaseRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('存在するIDのフェーズを取得できること', async () => {
      // モックの設定
      const mockPhaseData = {
        id: 1,
        name: '設計フェーズ',
        code: 'DESIGN',
        seq: 1,
        wbsId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      prismaMock.wbsPhase.findUnique.mockResolvedValue(mockPhaseData);

      // メソッド実行
      const phase = await phaseRepository.findById(1);

      // 検証
      expect(prismaMock.wbsPhase.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(phase).not.toBeNull();
      expect(phase?.id).toBe(1);
      expect(phase?.name).toBe('設計フェーズ');
      expect(phase?.code.value()).toBe('DESIGN');
      expect(phase?.seq).toBe(1);
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      // 存在しない場合はnullを返す
      prismaMock.wbsPhase.findUnique.mockResolvedValue(null);

      // メソッド実行
      const phase = await phaseRepository.findById(999);

      // 検証
      expect(prismaMock.wbsPhase.findUnique).toHaveBeenCalledWith({
        where: { id: 999 }
      });
      expect(phase).toBeNull();
    });

    it('エラーが発生した場合は例外をスローすること', async () => {
      // エラーをモック
      const error = new Error('Database connection error');
      prismaMock.wbsPhase.findUnique.mockRejectedValue(error);

      // エラーがスローされることを検証
      await expect(phaseRepository.findById(1)).rejects.toThrow('Database connection error');
      expect(prismaMock.wbsPhase.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });
  });
});