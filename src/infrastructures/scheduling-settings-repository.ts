import { injectable, inject } from "inversify";
import type { PrismaClient } from "@prisma/client";
import { SYMBOL } from "@/types/symbol";
import type { ISchedulingSettingsRepository } from "@/applications/task-scheduling/ischeduling-settings-repository";
import {
  parseSchedulingSettings,
  type SchedulingSettings,
} from "@/types/scheduling-settings";

@injectable()
export class SchedulingSettingsRepository
  implements ISchedulingSettingsRepository
{
  constructor(
    @inject(SYMBOL.PrismaClient) private readonly prisma: PrismaClient
  ) {}

  async getByProjectId(projectId: string): Promise<SchedulingSettings> {
    const settings = await this.prisma.projectSettings.findUnique({
      where: { projectId },
    });
    return parseSchedulingSettings(settings?.schedulingSettings);
  }
}
