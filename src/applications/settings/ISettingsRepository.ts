import { GlobalSettings } from '@/domains/settings/global-settings';
import { ProjectSettings } from '@/domains/settings/project-settings';

export interface ISettingsRepository {
  // GlobalSettings
  getGlobalSettings(): Promise<GlobalSettings>;
  updateGlobalSettings(settings: GlobalSettings): Promise<GlobalSettings>;
  
  // ProjectSettings
  getProjectSettings(projectId: string): Promise<ProjectSettings | null>;
  getAllProjectSettings(): Promise<ProjectSettings[]>;
  createProjectSettings(settings: ProjectSettings): Promise<ProjectSettings>;
  updateProjectSettings(settings: ProjectSettings): Promise<ProjectSettings>;
  deleteProjectSettings(projectId: string): Promise<void>;
}