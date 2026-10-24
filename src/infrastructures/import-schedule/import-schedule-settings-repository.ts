import { injectable } from 'inversify'
import type { IImportScheduleSettingsRepository } from '@/applications/import-schedule/iimport-schedule-settings-repository'
import { ImportScheduleSettings } from '@/domains/import-schedule/import-schedule-settings'
import prisma from '@/lib/prisma/prisma'

@injectable()
export class ImportScheduleSettingsRepository implements IImportScheduleSettingsRepository {
  async get(): Promise<ImportScheduleSettings> {
    const record = await prisma.importScheduleSettings.findUnique({ where: { id: 1 } })
    return record ? ImportScheduleSettings.create(record.isEnabled) : ImportScheduleSettings.createDefault()
  }

  async update(settings: ImportScheduleSettings): Promise<void> {
    await prisma.importScheduleSettings.upsert({
      where: { id: 1 },
      create: { id: 1, isEnabled: settings.isEnabled },
      update: { isEnabled: settings.isEnabled },
    })
  }
}
