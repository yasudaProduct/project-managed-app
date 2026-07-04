// filepath: /Users/yuta/Develop/project-managed-app/src/__tests__/infrastructures/phase-repository.test.ts
import { PhaseRepository } from "@/infrastructures/phase-repository";
import prisma from "@/lib/prisma/prisma";

// Prismaクライアントのモック化
jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    wbsPhase: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    phaseTemplate: {
      findUnique: jest.fn(),
      delete: jest.fn(),
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

  describe('findPhasesUsedInWbs', () => {
    it('WBSで使用されているフェーズを取得できること', async () => {
      // モックの設定
      const mockPhasesData = [
        {
          id: 1,
          name: '設計フェーズ',
          code: 'DESIGN',
          seq: 1,
          wbsId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          name: '開発フェーズ',
          code: 'DEV',
          seq: 2,
          wbsId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prismaMock.wbsPhase.findMany.mockResolvedValue(mockPhasesData);

      // メソッド実行
      const phases = await phaseRepository.findPhasesUsedInWbs(1);

      // 検証
      expect(prismaMock.wbsPhase.findMany).toHaveBeenCalledWith({
        where: {
          tasks: {
            some: {
              wbsId: 1
            }
          }
        },
        orderBy: { seq: 'asc' },
      });
      expect(phases).toHaveLength(2);
      expect(phases[0].id).toBe(1);
      expect(phases[0].name).toBe('設計フェーズ');
      expect(phases[1].id).toBe(2);
      expect(phases[1].name).toBe('開発フェーズ');
    });

    it('WBSにタスクが存在しない場合は空配列を返すこと', async () => {
      // 空配列をモック
      prismaMock.wbsPhase.findMany.mockResolvedValue([]);

      // メソッド実行
      const phases = await phaseRepository.findPhasesUsedInWbs(1);

      // 検証
      expect(prismaMock.wbsPhase.findMany).toHaveBeenCalledWith({
        where: {
          tasks: {
            some: {
              wbsId: 1
            }
          }
        },
        orderBy: { seq: 'asc' },
      });
      expect(phases).toHaveLength(0);
    });

    it('エラーが発生した場合は例外をスローすること', async () => {
      // エラーをモック
      const error = new Error('Database connection error');
      prismaMock.wbsPhase.findMany.mockRejectedValue(error);

      // エラーがスローされることを検証
      await expect(phaseRepository.findPhasesUsedInWbs(1)).rejects.toThrow('Database connection error');
      expect(prismaMock.wbsPhase.findMany).toHaveBeenCalledWith({
        where: {
          tasks: {
            some: {
              wbsId: 1
            }
          }
        },
        orderBy: { seq: 'asc' },
      });
    });
  });

  describe('findTemplateById', () => {
    it('存在するIDの工程テンプレートを取得できること', async () => {
      prismaMock.phaseTemplate.findUnique.mockResolvedValue({
        id: 1,
        name: '設計',
        code: 'D1',
        seq: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const phase = await phaseRepository.findTemplateById(1);

      expect(prismaMock.phaseTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(phase?.id).toBe(1);
      expect(phase?.name).toBe('設計');
      expect(phase?.code.value()).toBe('D1');
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      prismaMock.phaseTemplate.findUnique.mockResolvedValue(null);

      const phase = await phaseRepository.findTemplateById(999);

      expect(phase).toBeNull();
    });
  });

  describe('deleteTemplate', () => {
    it('工程テンプレートを削除すること', async () => {
      prismaMock.phaseTemplate.delete.mockResolvedValue({
        id: 1,
        name: '設計',
        code: 'D1',
        seq: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await phaseRepository.deleteTemplate(1);

      expect(prismaMock.phaseTemplate.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});