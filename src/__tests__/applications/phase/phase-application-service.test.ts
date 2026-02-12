import { PhaseApplicationService } from '@/applications/phase/phase-application-service';
import { Phase } from '@/domains/phase/phase';
import { PhaseCode } from '@/domains/phase/phase-code';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import 'reflect-metadata';

describe('PhaseApplicationService', () => {
  let service: PhaseApplicationService;
  let mockRepository: jest.Mocked<IPhaseRepository>;

  const createPhase = (id: number, name: string, code: string, seq: number) =>
    Phase.createFromDb({ id, name, code: new PhaseCode(code), seq });

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllTemplates: jest.fn(),
      findByWbsId: jest.fn(),
      findPhasesUsedInWbs: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new PhaseApplicationService(mockRepository);
  });

  describe('getAllPhaseTemplates', () => {
    it('工程テンプレート一覧をDTO形式で返す', async () => {
      const phases = [
        createPhase(1, '基本設計', 'BD', 1),
        createPhase(2, '詳細設計', 'DD', 2),
      ];
      mockRepository.findAllTemplates.mockResolvedValue(phases);

      const result = await service.getAllPhaseTemplates();

      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({ id: 1, name: '基本設計', code: 'BD', seq: 1 });
      expect(result![1]).toEqual({ id: 2, name: '詳細設計', code: 'DD', seq: 2 });
    });

    it('テンプレートがない場合nullを返す', async () => {
      mockRepository.findAllTemplates.mockResolvedValue(null as unknown as Phase[]);

      const result = await service.getAllPhaseTemplates();

      expect(result).toBeNull();
    });
  });

  describe('createPhaseTemplate', () => {
    it('新しい工程テンプレートを作成できる', async () => {
      mockRepository.findAllTemplates.mockResolvedValue([]);
      const newPhase = createPhase(3, 'テスト', 'UT', 3);
      mockRepository.createTemplate.mockResolvedValue(newPhase);

      const result = await service.createPhaseTemplate({
        name: 'テスト',
        code: 'UT',
        seq: 3,
      });

      expect(result.success).toBe(true);
      expect(result.phase).toEqual({ id: 3, name: 'テスト', code: 'UT', seq: 3 });
    });

    it('同じ工程名が存在する場合失敗する', async () => {
      const existing = [createPhase(1, '基本設計', 'BD', 1)];
      mockRepository.findAllTemplates.mockResolvedValue(existing);

      const result = await service.createPhaseTemplate({
        name: '基本設計',
        code: 'UT',
        seq: 2,
      });

      expect(result.success).toBe(false);
    });

    it('同じ工程コードが存在する場合失敗する', async () => {
      const existing = [createPhase(1, '基本設計', 'BD', 1)];
      mockRepository.findAllTemplates.mockResolvedValue(existing);

      const result = await service.createPhaseTemplate({
        name: 'テスト',
        code: 'BD',
        seq: 2,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updatePhaseTemplate', () => {
    it('工程テンプレートを更新できる', async () => {
      const existing = [createPhase(1, '基本設計', 'BD', 1)];
      mockRepository.findAllTemplates.mockResolvedValue(existing);
      mockRepository.findById.mockResolvedValue(existing[0]);
      const updated = createPhase(1, '基本設計（改）', 'BD2', 1);
      mockRepository.updateTemplate.mockResolvedValue(updated);

      const result = await service.updatePhaseTemplate({
        id: 1,
        name: '基本設計（改）',
        code: 'BD2',
        seq: 1,
      });

      expect(result.success).toBe(true);
      expect(result.phase!.name).toBe('基本設計（改）');
    });

    it('他の工程と名前が重複する場合失敗する', async () => {
      const existing = [
        createPhase(1, '基本設計', 'BD', 1),
        createPhase(2, '詳細設計', 'DD', 2),
      ];
      mockRepository.findAllTemplates.mockResolvedValue(existing);

      const result = await service.updatePhaseTemplate({
        id: 1,
        name: '詳細設計',
        code: 'BD',
        seq: 1,
      });

      expect(result.success).toBe(false);
    });

    it('工程が見つからない場合失敗する', async () => {
      mockRepository.findAllTemplates.mockResolvedValue([]);
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.updatePhaseTemplate({
        id: 999,
        name: 'テスト',
        code: 'UT',
        seq: 1,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getPhaseById', () => {
    it('フェーズが存在する場合DTOを返す', async () => {
      const phase = createPhase(1, '基本設計', 'BD', 1);
      mockRepository.findById.mockResolvedValue(phase);

      const result = await service.getPhaseById(1);

      expect(result).toEqual({ id: 1, name: '基本設計', code: 'BD', seq: 1 });
    });

    it('フェーズが存在しない場合nullを返す', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getPhaseById(999);

      expect(result).toBeNull();
    });
  });
});
