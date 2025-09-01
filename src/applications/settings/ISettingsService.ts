import { GlobalSettings } from '@/domains/settings/global-settings';
import { ProjectSettings } from '@/domains/settings/project-settings';
import { EffectiveSettings } from '@/domains/settings/settings-resolver';

export interface ISettingsService {
  // Global Settings
  getGlobalSettings(): Promise<GlobalSettings>;
  updateGlobalSettings(dailyWorkingHours: number): Promise<GlobalSettings>;
  
  // Project Settings
  getProjectSettings(projectId: string): Promise<ProjectSettings | null>;
  updateProjectSettings(projectId: string, dailyWorkingHours: number | null): Promise<ProjectSettings>;
  
  // Effective Settings (with priority resolution)
  getEffectiveSettings(projectId?: string): Promise<EffectiveSettings>;
  getEffectiveSettingsForProjects(projectIds: string[]): Promise<Map<string, EffectiveSettings>>;
}