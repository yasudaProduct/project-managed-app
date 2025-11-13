import 'reflect-metadata';
import { SystemSettingsApplicationService } from '@/applications/system-settings/system-settings-application-service';
import { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import { SystemSettings } from '@/domains/system-settings/system-settings';

describe('SystemSettingsApplicationService', () => {
  let service: SystemSettingsApplicationService;
  let mockRepository: jest.Mocked<ISystemSettingsRepository>;

  beforeEach(() => {
    mockRepository = {
      get: jest.fn(),
      update: jest.fn(),
    };
    service = new SystemSettingsApplicationService(mockRepository);
  });

  describe('getSystemSettings', () => {
    it('システム設定を取得できる', async () => {
      const settings = SystemSettings.create(7.5, 5000);
      mockRepository.get.mockResolvedValue(settings);

      const result = await service.getSystemSettings();

      expect(result).toBe(settings);
      expect(mockRepository.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSystemSettings', () => {
    it('システム設定を更新できる', async () => {
      await service.updateSystemSettings(8.0, 6000);

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      const updatedSettings = mockRepository.update.mock.calls[0][0];
      expect(updatedSettings.standardWorkingHours).toBe(8.0);
      expect(updatedSettings.defaultUserCostPerHour).toBe(6000);
    });

    it('人員原価をnullで更新できる', async () => {
      await service.updateSystemSettings(7.5, null);

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      const updatedSettings = mockRepository.update.mock.calls[0][0];
      expect(updatedSettings.standardWorkingHours).toBe(7.5);
      expect(updatedSettings.defaultUserCostPerHour).toBeNull();
    });

    it('不正な基本稼働時間の場合はエラーになる', async () => {
      await expect(service.updateSystemSettings(0, 5000)).rejects.toThrow(
        'standardWorkingHours must be positive'
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('不正な人員原価の場合はエラーになる', async () => {
      await expect(service.updateSystemSettings(7.5, -1000)).rejects.toThrow(
        'defaultUserCostPerHour must be non-negative'
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});
