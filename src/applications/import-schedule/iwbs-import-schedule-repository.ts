import { WbsImportSchedule } from '@/domains/import-schedule/wbs-import-schedule'

export interface IWbsImportScheduleRepository {
  findByWbsId(wbsId: number): Promise<WbsImportSchedule | null>
  findAll(): Promise<WbsImportSchedule[]>
  /** 有効で、次回実行日時が now 以前の設定 */
  findDue(now: Date): Promise<WbsImportSchedule[]>
  save(schedule: WbsImportSchedule): Promise<void>
  /**
   * 保存済みの次回実行日時が expectedNextRunAt の場合のみ更新する。更新できた場合 true
   * （同じ予定を複数の呼び出しが同時に起動しないよう、次回実行日時を進められた1件だけが起動する）
   */
  updateIfNextRunAt(schedule: WbsImportSchedule, expectedNextRunAt: Date): Promise<boolean>
}
