import { GlobalSettings } from './global-settings';
import { ProjectSettings } from './project-settings';

export interface EffectiveSettings {
  dailyWorkingHours: number;
  source: 'global' | 'project';
}

export class SettingsResolver {
  resolve(
    globalSettings: GlobalSettings,
    projectSettings?: ProjectSettings
  ): EffectiveSettings {
    // プロジェクト設定が存在し、勤務時間が設定されている場合は優先
    if (projectSettings?.hasDailyWorkingHours()) {
      return {
        dailyWorkingHours: projectSettings.getDailyWorkingHours()!,
        source: 'project'
      };
    }

    // それ以外はグローバル設定を使用
    return {
      dailyWorkingHours: globalSettings.getDailyWorkingHours(),
      source: 'global'
    };
  }

  resolveMultiple(
    globalSettings: GlobalSettings,
    projectSettingsList: ProjectSettings[]
  ): Map<string, EffectiveSettings> {
    const result = new Map<string, EffectiveSettings>();

    for (const projectSettings of projectSettingsList) {
      const effective = this.resolve(globalSettings, projectSettings);
      result.set(projectSettings.getProjectId(), effective);
    }

    return result;
  }
}