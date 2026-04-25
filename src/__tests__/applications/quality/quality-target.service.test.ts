import { QualityTargetService } from '@/applications/quality/quality-target.service';
import { QualityTarget } from '@/domains/quality/entities/quality-target';
import type { IQualityTargetRepository } from '@/applications/quality/repositories/i-quality-target.repository';

describe('QualityTargetService', () => {
  let service: QualityTargetService;
  let mockTargetRepo: jest.Mocked<IQualityTargetRepository>;

  beforeEach(() => {
    mockTargetRepo = {
      findById: jest.fn(),
      findByWbs: jest.fn(),
      findByWbsAndTaskNo: jest.fn(),
      upsert: jest.fn(),
      deactivateMissing: jest.fn(),
    };
    service = new QualityTargetService(mockTargetRepo);
  });

  describe('listByWbs', () => {
    it('WBS内の評価対象一覧を取得する', async () => {
      const targets = [
        QualityTarget.reconstruct({ id: 1, wbsId: 1, taskNo: 'T-001', name: 'A', isActive: true }),
      ];
      mockTargetRepo.findByWbs.mockResolvedValue(targets);

      const result = await service.listByWbs(1, { isActive: true });

      expect(result).toHaveLength(1);
      expect(mockTargetRepo.findByWbs).toHaveBeenCalledWith(1, { isActive: true });
    });
  });

  describe('upsert', () => {
    it('評価対象を作成/更新する', async () => {
      const target = QualityTarget.create({ wbsId: 1, taskNo: 'T-001', name: 'A' });
      const saved = QualityTarget.reconstruct({ id: 1, wbsId: 1, taskNo: 'T-001', name: 'A', isActive: true });
      mockTargetRepo.upsert.mockResolvedValue(saved);

      const result = await service.upsert(target);

      expect(result.id).toBe(1);
    });
  });

  describe('updateAttributes', () => {
    it('subsystem/featureGroupを更新する', async () => {
      const existing = QualityTarget.reconstruct({
        id: 1, wbsId: 1, taskNo: 'T-001', name: 'A', isActive: true,
      });
      mockTargetRepo.findByWbsAndTaskNo.mockResolvedValue(existing);
      mockTargetRepo.upsert.mockImplementation(async (t) => t);

      await service.updateAttributes(1, 'T-001', {
        subsystem: 'ユーザー管理',
        featureGroup: '認証',
      });

      expect(mockTargetRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ subsystem: 'ユーザー管理', featureGroup: '認証' })
      );
    });

    it('対象が存在しない場合はエラー', async () => {
      mockTargetRepo.findByWbsAndTaskNo.mockResolvedValue(null);

      await expect(
        service.updateAttributes(1, 'T-999', { subsystem: 'x' })
      ).rejects.toThrow();
    });
  });
});
