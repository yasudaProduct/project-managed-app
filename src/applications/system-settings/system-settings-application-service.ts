import { injectable, inject } from 'inversify';
import type { ISystemSettingsRepository } from './isystem-settings-repository';
import { SystemSettings } from '@/domains/system-settings/system-settings';
import { SYMBOL } from '@/types/symbol';

/**
 * システム設定アプリケーションサービスのインターフェース
 */
export interface ISystemSettingsApplicationService {
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(
    standardWorkingHours: number,
    defaultUserCostPerHour: number | null
  ): Promise<void>;
}

/**
 * システム設定アプリケーションサービスの実装
 */
@injectable()
export class SystemSettingsApplicationService
  implements ISystemSettingsApplicationService {
  constructor(
    @inject(SYMBOL.ISystemSettingsRepository)
    private readonly systemSettingsRepository: ISystemSettingsRepository
  ) { }

  async getSystemSettings(): Promise<SystemSettings> {
    return await this.systemSettingsRepository.get();
  }

  async updateSystemSettings(
    standardWorkingHours: number,
    defaultUserCostPerHour: number | null
  ): Promise<void> {
    const settings = SystemSettings.create(
      standardWorkingHours,
      defaultUserCostPerHour
    );
    await this.systemSettingsRepository.update(settings);
  }
}
