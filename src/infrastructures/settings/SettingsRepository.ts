import { injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { GlobalSettings } from '@/domains/settings/global-settings';
import { ProjectSettings } from '@/domains/settings/project-settings';
import { ISettingsRepository } from '@/applications/settings/ISettingsRepository';

@injectable()
export class SettingsRepository implements ISettingsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getGlobalSettings(): Promise<GlobalSettings> {
    let settings = await this.prisma.globalSettings.findUnique({
      where: { id: 1 }
    });

    // 初回アクセス時にデフォルト設定を作成
    if (!settings) {
      settings = await this.prisma.globalSettings.create({
        data: {
          id: 1,
          dailyWorkingHours: 7.5
        }
      });
    }

    return GlobalSettings.fromPrisma(settings);
  }

  async updateGlobalSettings(settings: GlobalSettings): Promise<GlobalSettings> {
    const updated = await this.prisma.globalSettings.update({
      where: { id: settings.getId() },
      data: {
        dailyWorkingHours: settings.getDailyWorkingHours()
      }
    });

    return GlobalSettings.fromPrisma(updated);
  }

  async getProjectSettings(projectId: string): Promise<ProjectSettings | null> {
    const settings = await this.prisma.projectSettings.findUnique({
      where: { projectId }
    });

    return settings ? ProjectSettings.fromPrisma(settings) : null;
  }

  async getAllProjectSettings(): Promise<ProjectSettings[]> {
    const settingsList = await this.prisma.projectSettings.findMany();
    return settingsList.map(settings => ProjectSettings.fromPrisma(settings));
  }

  async createProjectSettings(settings: ProjectSettings): Promise<ProjectSettings> {
    const created = await this.prisma.projectSettings.create({
      data: {
        id: settings.getId(),
        projectId: settings.getProjectId(),
        dailyWorkingHours: settings.getDailyWorkingHours()
      }
    });

    return ProjectSettings.fromPrisma(created);
  }

  async updateProjectSettings(settings: ProjectSettings): Promise<ProjectSettings> {
    const updated = await this.prisma.projectSettings.update({
      where: { id: settings.getId() },
      data: {
        dailyWorkingHours: settings.getDailyWorkingHours()
      }
    });

    return ProjectSettings.fromPrisma(updated);
  }

  async deleteProjectSettings(projectId: string): Promise<void> {
    await this.prisma.projectSettings.delete({
      where: { projectId }
    });
  }
}