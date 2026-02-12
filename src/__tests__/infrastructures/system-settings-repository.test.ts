import { SystemSettingsRepository } from "@/infrastructures/system-settings/system-settings-repository";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    systemSettings: {
      findUnique: jest.fn() as jest.Mock,
      upsert: jest.fn() as jest.Mock,
    },
  },
}));

describe('SystemSettingsRepository', () => {
  let repository: SystemSettingsRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new SystemSettingsRepository();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('システム設定を取得できること', async () => {
      const mockRecord = {
        id: 1,
        standardWorkingHours: 8,
        defaultUserCostPerHour: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaMock.systemSettings.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const settings = await repository.get();

      expect(prismaMock.systemSettings.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(settings.standardWorkingHours).toBe(8);
      expect(settings.defaultUserCostPerHour).toBe(5000);
    });

    it('レコードが存在しない場合はデフォルト値を作成して返すこと', async () => {
      (prismaMock.systemSettings.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.systemSettings.upsert as jest.Mock).mockResolvedValue({});

      const settings = await repository.get();

      expect(settings.standardWorkingHours).toBe(7.5);
      expect(settings.defaultUserCostPerHour).toBeNull();
      // updateが呼ばれてデフォルト値が保存されること
      expect(prismaMock.systemSettings.upsert).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('システム設定を更新できること', async () => {
      (prismaMock.systemSettings.upsert as jest.Mock).mockResolvedValue({});

      const { SystemSettings } = await import('@/domains/system-settings/system-settings');
      const settings = SystemSettings.create(8, 6000);
      await repository.update(settings);

      expect(prismaMock.systemSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: {
          standardWorkingHours: 8,
          defaultUserCostPerHour: 6000,
        },
        create: {
          id: 1,
          standardWorkingHours: 8,
          defaultUserCostPerHour: 6000,
        },
      });
    });
  });
});
