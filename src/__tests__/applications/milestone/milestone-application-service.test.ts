import { MilestoneApplicationService } from '@/applications/milestone/milestone-application-service';
import { Milestone } from '@/domains/milestone/milestone';
import type { IMilestoneRepository } from '@/applications/milestone/milestone.interfase';
import 'reflect-metadata';

describe('MilestoneApplicationService', () => {
  let service: MilestoneApplicationService;
  let mockRepository: jest.Mocked<IMilestoneRepository>;

  beforeEach(() => {
    mockRepository = {
      findByWbsId: jest.fn(),
    };
    service = new MilestoneApplicationService(mockRepository);
  });

  describe('getMilestones', () => {
    it('WBS IDに紐づくマイルストーンを返す', async () => {
      const milestones = [
        Milestone.create({ id: 1, name: 'M1', date: new Date('2026-03-01T00:00:00.000Z') }),
        Milestone.create({ id: 2, name: 'M2', date: new Date('2026-06-01T00:00:00.000Z') }),
      ];
      mockRepository.findByWbsId.mockResolvedValue(milestones);

      const result = await service.getMilestones(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'M1',
        date: new Date('2026-03-01T00:00:00.000Z'),
      });
      expect(result[1]).toEqual({
        id: 2,
        name: 'M2',
        date: new Date('2026-06-01T00:00:00.000Z'),
      });
    });

    it('マイルストーンがない場合空配列を返す', async () => {
      mockRepository.findByWbsId.mockResolvedValue([]);

      const result = await service.getMilestones(999);

      expect(result).toHaveLength(0);
    });
  });
});
