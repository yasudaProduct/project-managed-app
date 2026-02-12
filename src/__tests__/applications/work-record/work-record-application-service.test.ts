import { WorkRecordApplicationService } from '@/applications/work-record/work-record-application-service';
import { WorkRecord } from '@/domains/work-records/work-recoed';
import type { IWorkRecordRepository } from '@/applications/work-record/repositories/iwork-record.repository';
import 'reflect-metadata';

describe('WorkRecordApplicationService', () => {
  let service: WorkRecordApplicationService;
  let mockRepository: jest.Mocked<IWorkRecordRepository>;

  beforeEach(() => {
    mockRepository = {
      bulkCreate: jest.fn(),
      bulkUpsert: jest.fn(),
      deleteByUserAndDateRange: jest.fn(),
    };
    service = new WorkRecordApplicationService(mockRepository);
  });

  describe('bulkCreate', () => {
    it('レコードが空でない場合リポジトリを呼ぶ', async () => {
      const records = [
        WorkRecord.create({
          userId: 'u1',
          taskId: 1,
          startDate: new Date('2026-01-15T00:00:00.000Z'),
          endDate: new Date('2026-01-15T00:00:00.000Z'),
          manHours: 8,
        }),
      ];
      mockRepository.bulkCreate.mockResolvedValue();

      await service.bulkCreate(records);

      expect(mockRepository.bulkCreate).toHaveBeenCalledWith(records);
    });

    it('レコードが空の場合リポジトリを呼ばない', async () => {
      await service.bulkCreate([]);

      expect(mockRepository.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpsert', () => {
    it('レコードが空でない場合リポジトリを呼ぶ', async () => {
      const records = [
        WorkRecord.create({
          userId: 'u1',
          taskId: 1,
          startDate: new Date('2026-01-15T00:00:00.000Z'),
          endDate: new Date('2026-01-15T00:00:00.000Z'),
          manHours: 8,
        }),
      ];
      mockRepository.bulkUpsert.mockResolvedValue({ created: 1, updated: 0 });

      const result = await service.bulkUpsert(records);

      expect(result).toEqual({ created: 1, updated: 0 });
    });

    it('レコードが空の場合は0件を返す', async () => {
      const result = await service.bulkUpsert([]);

      expect(result).toEqual({ created: 0, updated: 0 });
      expect(mockRepository.bulkUpsert).not.toHaveBeenCalled();
    });
  });

  describe('deleteByUserAndDateRange', () => {
    it('ユーザーIDが空でない場合リポジトリを呼ぶ', async () => {
      mockRepository.deleteByUserAndDateRange.mockResolvedValue(5);

      const result = await service.deleteByUserAndDateRange(
        ['u1', 'u2'],
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-01-31T00:00:00.000Z'),
      );

      expect(result).toBe(5);
    });

    it('ユーザーIDが空の場合は0を返す', async () => {
      const result = await service.deleteByUserAndDateRange(
        [],
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-01-31T00:00:00.000Z'),
      );

      expect(result).toBe(0);
      expect(mockRepository.deleteByUserAndDateRange).not.toHaveBeenCalled();
    });
  });
});
