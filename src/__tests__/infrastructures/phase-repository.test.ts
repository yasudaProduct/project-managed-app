// filepath: /Users/yuta/Develop/project-managed-app/src/__tests__/infrastructures/phase-repository.test.ts
import { PhaseRepository } from "@/infrastructures/phase-repository";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";
import prisma from "@/lib/prisma/prisma";

// Prismaクライアントのモック化
jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    wbsPhase: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    phaseTemplate: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    wbsTask: {
      findMany: jest.fn(),
    },
    taskPeriod: {
      findMany: jest.fn(),
    },
  },
}));

describe('PhaseRepository', () => {
  let phaseRepository: PhaseRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    phaseRepository = new PhaseRepository();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  describe('findAll', () => {
    it('すべてのフェーズを取得できること', async () => {
      const mockPhasesData = [
        { id: 1, name: '設計', code: 'DESIGN', seq: 1, wbsId: 1, templateId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: '開発', code: 'DEV', seq: 2, wbsId: 1, templateId: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      (prismaMock.wbsPhase.findMany as jest.Mock).mockResolvedValue(mockPhasesData);

      const phases = await phaseRepository.findAll();

      expect(prismaMock.wbsPhase.findMany).toHaveBeenCalledWith({ orderBy: { seq: 'asc' } });
      expect(phases).toHaveLength(2);
      expect(phases[0].name).toBe('設計');
      expect(phases[1].name).toBe('開発');
    });
  });

  describe('findAllTemplates', () => {
    it('すべてのテンプレートを取得できること', async () => {
      const mockTemplates = [
        { id: 1, name: 'テンプレ設計', code: 'TMPLDESIGN', seq: 1, createdAt: new Date(), updatedAt: new Date() },
      ];
      (prismaMock.phaseTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);

      const templates = await phaseRepository.findAllTemplates();

      expect(prismaMock.phaseTemplate.findMany).toHaveBeenCalledWith({ orderBy: { seq: 'asc' } });
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('テンプレ設計');
    });
  });

  describe('findByWbsId', () => {
    it('WBS IDでフェーズ一覧を取得できること', async () => {
      const mockPhaseData = {
        id: 1, name: '設計', code: 'DESIGN', seq: 1, wbsId: 1, templateId: 10,
        createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.wbsPhase.findMany as jest.Mock).mockResolvedValue([mockPhaseData]);
      (prismaMock.wbsTask.findMany as jest.Mock).mockResolvedValue([]);

      const phases = await phaseRepository.findByWbsId(1);

      expect(prismaMock.wbsPhase.findMany).toHaveBeenCalledWith({
        where: { wbsId: 1 },
        orderBy: { seq: 'asc' },
      });
      expect(phases).toHaveLength(1);
    });

    it('タスクの期間からフェーズの期間が計算されること', async () => {
      const mockPhaseData = {
        id: 1, name: '設計', code: 'DESIGN', seq: 1, wbsId: 1, templateId: null,
        createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.wbsPhase.findMany as jest.Mock).mockResolvedValue([mockPhaseData]);
      (prismaMock.wbsTask.findMany as jest.Mock).mockResolvedValue([{ id: 100, phaseId: 1 }]);
      (prismaMock.taskPeriod.findMany as jest.Mock).mockResolvedValue([
        { startDate: new Date('2025-01-01'), endDate: new Date('2025-03-31') },
        { startDate: new Date('2025-02-01'), endDate: new Date('2025-06-30') },
      ]);

      const phases = await phaseRepository.findByWbsId(1);

      expect(phases[0].period).toEqual({
        start: new Date('2025-01-01'),
        end: new Date('2025-06-30'),
      });
    });
  });

  describe('createTemplate', () => {
    it('フェーズテンプレートを作成できること', async () => {
      const mockCreated = { id: 100, name: '新テンプレート', code: 'NEWTMPL', seq: 3, createdAt: new Date(), updatedAt: new Date() };
      (prismaMock.phaseTemplate.create as jest.Mock).mockResolvedValue(mockCreated);

      const phase = Phase.create({ name: '新テンプレート', code: new PhaseCode('NEWTMPL'), seq: 3 });
      const created = await phaseRepository.createTemplate(phase);

      expect(prismaMock.phaseTemplate.create).toHaveBeenCalledWith({
        data: { name: '新テンプレート', code: 'NEWTMPL', seq: 3 },
      });
      expect(created.id).toBe(100);
    });
  });

  describe('updateTemplate', () => {
    it('フェーズテンプレートを更新できること', async () => {
      const mockUpdated = { id: 10, name: '更新テンプレート', code: 'UPDATED', seq: 2, createdAt: new Date(), updatedAt: new Date() };
      (prismaMock.phaseTemplate.update as jest.Mock).mockResolvedValue(mockUpdated);

      const phase = Phase.createFromDb({ id: 10, name: '更新テンプレート', code: new PhaseCode('UPDATED'), seq: 2 });
      const updated = await phaseRepository.updateTemplate(phase);

      expect(prismaMock.phaseTemplate.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { name: '更新テンプレート', code: 'UPDATED', seq: 2 },
      });
      expect(updated.name).toBe('更新テンプレート');
    });
  });

  describe('create', () => {
    it('WBSにフェーズを作成できること', async () => {
      const mockCreated = {
        id: 20, name: '設計', code: 'DESIGN', seq: 1, wbsId: 1, templateId: 10,
        createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.wbsPhase.create as jest.Mock).mockResolvedValue(mockCreated);

      const phase = Phase.create({ name: '設計', code: new PhaseCode('DESIGN'), seq: 1, templateId: 10 });
      const created = await phaseRepository.create(1, phase);

      expect(prismaMock.wbsPhase.create).toHaveBeenCalledWith({
        data: { wbsId: 1, name: '設計', code: 'DESIGN', seq: 1, templateId: 10 },
      });
      expect(created.id).toBe(20);
    });
  });

  describe('update', () => {
    it('フェーズを更新できること', async () => {
      const mockUpdated = {
        id: 1, name: '更新後設計', code: 'DESIGN', seq: 1, wbsId: 1, templateId: 10,
        createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.wbsPhase.update as jest.Mock).mockResolvedValue(mockUpdated);

      const phase = Phase.createFromDb({ id: 1, name: '更新後設計', code: new PhaseCode('DESIGN'), seq: 1, templateId: 10 });
      const updated = await phaseRepository.update(1, '1', phase);

      expect(prismaMock.wbsPhase.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: '更新後設計', code: 'DESIGN', seq: 1, templateId: 10 },
      });
      expect(updated.name).toBe('更新後設計');
    });
  });

  describe('delete', () => {
    it('フェーズを削除できること', async () => {
      (prismaMock.wbsPhase.delete as jest.Mock).mockResolvedValue({});

      await phaseRepository.delete('1');

      expect(prismaMock.wbsPhase.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});