import { SystemSettings } from '@/domains/system-settings/system-settings';

describe('SystemSettings', () => {
  describe('create', () => {
    it('基本稼働時間のみで作成できる', () => {
      const settings = SystemSettings.create(7.5);

      expect(settings.standardWorkingHours).toBe(7.5);
      expect(settings.defaultUserCostPerHour).toBeNull();
    });

    it('基本稼働時間とデフォルト人員原価で作成できる', () => {
      const settings = SystemSettings.create(8.0, 5000);

      expect(settings.standardWorkingHours).toBe(8.0);
      expect(settings.defaultUserCostPerHour).toBe(5000);
    });

    it('基本稼働時間が0以下の場合はエラーになる', () => {
      expect(() => SystemSettings.create(0)).toThrow(
        'standardWorkingHours must be positive'
      );
      expect(() => SystemSettings.create(-1)).toThrow(
        'standardWorkingHours must be positive'
      );
    });

    it('デフォルト人員原価が負の値の場合はエラーになる', () => {
      expect(() => SystemSettings.create(7.5, -1000)).toThrow(
        'defaultUserCostPerHour must be non-negative'
      );
    });

    it('デフォルト人員原価が0の場合は許容される', () => {
      const settings = SystemSettings.create(7.5, 0);
      expect(settings.defaultUserCostPerHour).toBe(0);
    });
  });

  describe('createDefault', () => {
    it('デフォルト値で作成できる', () => {
      const settings = SystemSettings.createDefault();

      expect(settings.standardWorkingHours).toBe(7.5);
      expect(settings.defaultUserCostPerHour).toBeNull();
    });
  });
});
