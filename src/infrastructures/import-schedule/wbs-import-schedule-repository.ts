import { injectable } from 'inversify'
import type { WbsImportSchedule as PrismaWbsImportSchedule } from '@prisma/client'
import type { IWbsImportScheduleRepository } from '@/applications/import-schedule/iwbs-import-schedule-repository'
import { WbsImportSchedule } from '@/domains/import-schedule/wbs-import-schedule'
import type { WbsSyncMode } from '@/types/wbs-sync-mode'
import prisma from '@/lib/prisma/prisma'

@injectable()
export class WbsImportScheduleRepository implements IWbsImportScheduleRepository {
  async findByWbsId(wbsId: number): Promise<WbsImportSchedule | null> {
    const record = await prisma.wbsImportSchedule.findUnique({ where: { wbsId } })
    return record ? this.toDomain(record) : null
  }

  async findAll(): Promise<WbsImportSchedule[]> {
    const records = await prisma.wbsImportSchedule.findMany({ orderBy: { wbsId: 'asc' } })
    return records.map((record) => this.toDomain(record))
  }

  async findDue(now: Date): Promise<WbsImportSchedule[]> {
    const records = await prisma.wbsImportSchedule.findMany({
      where: { isEnabled: true, nextRunAt: { lte: now } },
      orderBy: [{ nextRunAt: 'asc' }, { wbsId: 'asc' }],
    })
    return records.map((record) => this.toDomain(record))
  }

  async save(schedule: WbsImportSchedule): Promise<void> {
    const data = this.toData(schedule)
    await prisma.wbsImportSchedule.upsert({
      where: { wbsId: schedule.wbsId },
      create: { wbsId: schedule.wbsId, ...data },
      update: data,
    })
  }

  /**
   * 保存済みの次回実行日時が expectedNextRunAt の場合のみ更新する
   * 条件付きの単一UPDATEで判定するため、同じ予定を同時に進めても成功するのは1件だけ
   */
  async updateIfNextRunAt(schedule: WbsImportSchedule, expectedNextRunAt: Date): Promise<boolean> {
    const { count } = await prisma.wbsImportSchedule.updateMany({
      where: { wbsId: schedule.wbsId, nextRunAt: expectedNextRunAt },
      data: this.toData(schedule),
    })
    return count === 1
  }

  private toData(schedule: WbsImportSchedule) {
    return {
      isEnabled: schedule.isEnabled,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      syncMode: schedule.syncMode,
      includeActuals: schedule.includeActuals,
      nextRunAt: schedule.nextRunAt,
      lastRunAt: schedule.lastRunAt,
    }
  }

  private toDomain(record: PrismaWbsImportSchedule): WbsImportSchedule {
    return WbsImportSchedule.createFromDb({
      wbsId: record.wbsId,
      isEnabled: record.isEnabled,
      cronExpression: record.cronExpression,
      timezone: record.timezone,
      syncMode: (record.syncMode === 'replace' ? 'replace' : 'diff') satisfies WbsSyncMode,
      includeActuals: record.includeActuals,
      nextRunAt: record.nextRunAt,
      lastRunAt: record.lastRunAt,
    })
  }
}
