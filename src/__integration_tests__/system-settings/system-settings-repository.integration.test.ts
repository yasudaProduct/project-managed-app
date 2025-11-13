import { PrismaClient } from '@prisma/client';
import { SystemSettingsRepository } from '@/infrastructures/system-settings/system-settings-repository';
import { SystemSettings } from '@/domains/system-settings/system-settings';

const prisma = new PrismaClient();

describe('SystemSettingsRepository Integration Tests', () => {
  let repository: SystemSettingsRepository;

  beforeAll(async () => {
    repository = new SystemSettingsRepository();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('get', () => {
    it('システム設定を取得できる', async () => {
      const settings = await repository.get();

      expect(settings).toBeInstanceOf(SystemSettings);
      expect(settings.standardWorkingHours).toBe(7.5);
      expect(settings.defaultUserCostPerHour).toBeNull();
    });
  });

  describe('update', () => {
    it('システム設定を更新できる', async () => {
      const newSettings = SystemSettings.create(8.0, 6000);
      await repository.update(newSettings);

      const updated = await repository.get();
      expect(updated.standardWorkingHours).toBe(8.0);
      expect(updated.defaultUserCostPerHour).toBe(6000);
    });

    it('人員原価をnullに更新できる', async () => {
      const newSettings = SystemSettings.create(7.5, null);
      await repository.update(newSettings);

      const updated = await repository.get();
      expect(updated.standardWorkingHours).toBe(7.5);
      expect(updated.defaultUserCostPerHour).toBeNull();
    });
  });
});
