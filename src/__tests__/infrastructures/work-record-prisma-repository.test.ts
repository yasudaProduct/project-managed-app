import { WorkRecordPrismaRepository } from "@/infrastructures/work-record/work-record-prisma.repository";
import { WorkRecord } from "@/domains/work-records/work-recoed";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    workRecord: {
      create: jest.fn() as jest.Mock,
      findFirst: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      deleteMany: jest.fn() as jest.Mock,
    },
  },
}));

describe('WorkRecordPrismaRepository', () => {
  let repository: WorkRecordPrismaRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;
  const testDate = new Date('2025-06-15');

  beforeEach(() => {
    repository = new WorkRecordPrismaRepository();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('bulkCreate', () => {
    it('作業実績を一括作成できること', async () => {
      (prismaMock.workRecord.create as jest.Mock).mockResolvedValue({});

      const workRecords = [
        WorkRecord.create({ userId: 'user-1', taskId: 1, startDate: testDate, endDate: testDate, manHours: 8 }),
        WorkRecord.create({ userId: 'user-2', taskId: 2, startDate: testDate, endDate: testDate, manHours: 4 }),
      ];

      await repository.bulkCreate(workRecords);

      expect(prismaMock.workRecord.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.workRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          taskId: 1,
          date: testDate,
          hours_worked: 8,
        },
      });
    });

    it('作成失敗時にエラーをスローすること', async () => {
      (prismaMock.workRecord.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      const workRecords = [
        WorkRecord.create({ userId: 'user-1', taskId: 1, startDate: testDate, endDate: testDate, manHours: 8 }),
      ];

      await expect(repository.bulkCreate(workRecords)).rejects.toThrow('作業実績の一括作成に失敗しました');
    });
  });

  describe('bulkUpsert', () => {
    it('既存レコードがない場合は新規作成すること', async () => {
      (prismaMock.workRecord.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.workRecord.create as jest.Mock).mockResolvedValue({});

      const workRecords = [
        WorkRecord.create({ userId: 'user-1', taskId: 1, startDate: testDate, endDate: testDate, manHours: 8 }),
      ];

      const result = await repository.bulkUpsert(workRecords);

      expect(result).toEqual({ created: 1, updated: 0 });
      expect(prismaMock.workRecord.create).toHaveBeenCalledTimes(1);
    });

    it('既存レコードがある場合は更新すること', async () => {
      (prismaMock.workRecord.findFirst as jest.Mock).mockResolvedValue({ id: 10 });
      (prismaMock.workRecord.update as jest.Mock).mockResolvedValue({});

      const workRecords = [
        WorkRecord.create({ userId: 'user-1', taskId: 1, startDate: testDate, endDate: testDate, manHours: 10 }),
      ];

      const result = await repository.bulkUpsert(workRecords);

      expect(result).toEqual({ created: 0, updated: 1 });
      expect(prismaMock.workRecord.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          hours_worked: 10,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('作成と更新が混在するケース', async () => {
      (prismaMock.workRecord.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 20 });
      (prismaMock.workRecord.create as jest.Mock).mockResolvedValue({});
      (prismaMock.workRecord.update as jest.Mock).mockResolvedValue({});

      const workRecords = [
        WorkRecord.create({ userId: 'user-1', taskId: 1, startDate: testDate, endDate: testDate, manHours: 8 }),
        WorkRecord.create({ userId: 'user-2', taskId: 2, startDate: testDate, endDate: testDate, manHours: 4 }),
      ];

      const result = await repository.bulkUpsert(workRecords);

      expect(result).toEqual({ created: 1, updated: 1 });
    });

    it('Upsert失敗時にエラーをスローすること', async () => {
      (prismaMock.workRecord.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

      const workRecords = [
        WorkRecord.create({ userId: 'user-1', taskId: 1, startDate: testDate, endDate: testDate, manHours: 8 }),
      ];

      await expect(repository.bulkUpsert(workRecords)).rejects.toThrow('作業実績の一括更新に失敗しました');
    });
  });

  describe('deleteByUserAndDateRange', () => {
    it('ユーザーと日付範囲で作業実績を削除できること', async () => {
      (prismaMock.workRecord.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const count = await repository.deleteByUserAndDateRange(['user-1', 'user-2'], startDate, endDate);

      expect(prismaMock.workRecord.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: { in: ['user-1', 'user-2'] },
          date: { gte: startDate, lte: endDate },
        },
      });
      expect(count).toBe(3);
    });

    it('削除失敗時にエラーをスローすること', async () => {
      (prismaMock.workRecord.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        repository.deleteByUserAndDateRange(['user-1'], new Date(), new Date())
      ).rejects.toThrow('作業実績の削除に失敗しました');
    });
  });
});
