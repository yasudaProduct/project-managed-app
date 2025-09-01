import { injectable, inject } from 'inversify';
import { GlobalSettings } from '@/domains/settings/global-settings';
import { ProjectSettings } from '@/domains/settings/project-settings';
import { SettingsResolver, EffectiveSettings } from '@/domains/settings/settings-resolver';
import { ISettingsService } from './ISettingsService';
import type { ISettingsRepository } from './ISettingsRepository';
import { TYPES } from '@/lib/inversify.types';

@injectable()
export class SettingsService implements ISettingsService {
  private settingsResolver: SettingsResolver;

  constructor(
    @inject(TYPES.ISettingsRepository) private settingsRepository: ISettingsRepository
  ) {
    this.settingsResolver = new SettingsResolver();
  }

  async getGlobalSettings(): Promise<GlobalSettings> {
    return await this.settingsRepository.getGlobalSettings();
  }

  async updateGlobalSettings(dailyWorkingHours: number): Promise<GlobalSettings> {
    const current = await this.settingsRepository.getGlobalSettings();
    const updated = current.updateDailyWorkingHours(dailyWorkingHours);
    return await this.settingsRepository.updateGlobalSettings(updated);
  }

  async getProjectSettings(projectId: string): Promise<ProjectSettings | null> {
    return await this.settingsRepository.getProjectSettings(projectId);
  }

  async updateProjectSettings(projectId: string, dailyWorkingHours: number | null): Promise<ProjectSettings> {
    const existing = await this.settingsRepository.getProjectSettings(projectId);
    
    if (existing) {
      const updated = existing.updateDailyWorkingHours(dailyWorkingHours);
      return await this.settingsRepository.updateProjectSettings(updated);
    } else {
      const newSettings = ProjectSettings.create(projectId, dailyWorkingHours ?? undefined);
      return await this.settingsRepository.createProjectSettings(newSettings);
    }
  }

  async getEffectiveSettings(projectId?: string): Promise<EffectiveSettings> {
    const globalSettings = await this.settingsRepository.getGlobalSettings();
    
    if (!projectId) {
      return this.settingsResolver.resolve(globalSettings);
    }

    const projectSettings = await this.settingsRepository.getProjectSettings(projectId);
    return this.settingsResolver.resolve(globalSettings, projectSettings ?? undefined);
  }

  async getEffectiveSettingsForProjects(projectIds: string[]): Promise<Map<string, EffectiveSettings>> {
    const globalSettings = await this.settingsRepository.getGlobalSettings();
    const result = new Map<string, EffectiveSettings>();

    for (const projectId of projectIds) {
      const projectSettings = await this.settingsRepository.getProjectSettings(projectId);
      const effective = this.settingsResolver.resolve(globalSettings, projectSettings ?? undefined);
      result.set(projectId, effective);
    }

    return result;
  }
}