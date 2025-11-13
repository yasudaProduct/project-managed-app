import { injectable } from 'inversify';
import prisma from '@/lib/prisma/prisma';
import { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import { SystemSettings } from '@/domains/system-settings/system-settings';

/**
 * システム設定リポジトリの実装
 */
@injectable()
export class SystemSettingsRepository implements ISystemSettingsRepository {
  async get(): Promise<SystemSettings> {
    const record = await prisma.systemSettings.findUnique({
      where: { id: 1 },
    });

    if (!record) {
      // レコードが存在しない場合はデフォルト値を作成して保存
      const defaultSettings = SystemSettings.createDefault();
      await this.update(defaultSettings);
      return defaultSettings;
    }

    return SystemSettings.create(
      record.standardWorkingHours,
      record.defaultUserCostPerHour
    );
  }

  async update(settings: SystemSettings): Promise<void> {
    await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        standardWorkingHours: settings.standardWorkingHours,
        defaultUserCostPerHour: settings.defaultUserCostPerHour,
      },
      create: {
        id: 1,
        standardWorkingHours: settings.standardWorkingHours,
        defaultUserCostPerHour: settings.defaultUserCostPerHour,
      },
    });
  }
}
