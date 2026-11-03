import { ImportScheduleSettings } from '@/domains/import-schedule/import-schedule-settings'

export interface IImportScheduleSettingsRepository {
  /** 未保存の場合は既定値を返す */
  get(): Promise<ImportScheduleSettings>
  update(settings: ImportScheduleSettings): Promise<void>
}
