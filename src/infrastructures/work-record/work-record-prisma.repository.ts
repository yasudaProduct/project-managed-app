import { injectable, inject } from 'inversify'
import { PrismaClient } from '@prisma/client'
import { WorkRecord } from '@/domains/work-records/work-recoed'
import { IWorkRecordRepository } from '@/applications/work-record/repositories/iwork-record.repository'
import { SYMBOL } from '@/types/symbol'

@injectable()
export class WorkRecordPrismaRepository implements IWorkRecordRepository {
  constructor(
    @inject(SYMBOL.PrismaClient) private prisma: PrismaClient
  ) {}

  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<WorkRecord[]> {
    try {
      const records = await this.prisma.workRecord.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      })

      return records.map(record => 
        WorkRecord.createFromDb({
          id: record.id,
          userId: record.userId,
          taskId: record.taskId || undefined,
          startDate: record.date,
          endDate: record.date,
          manHours: record.hours_worked.toNumber()
        })
      )
    } catch (error) {
      console.error('Failed to find work records by date range:', error)
      throw new Error('作業実績の取得に失敗しました')
    }
  }

  async bulkCreate(workRecords: WorkRecord[]): Promise<void> {
    try {
      const data = workRecords.map(wr => ({
        userId: wr.userId!,
        taskId: wr.taskId,
        date: wr.startDate!,
        hours_worked: wr.manHours!
      }))

      await this.prisma.workRecord.createMany({
        data,
        skipDuplicates: true
      })
    } catch (error) {
      console.error('Failed to bulk create work records:', error)
      throw new Error('作業実績の一括作成に失敗しました')
    }
  }

  async bulkUpsert(workRecords: WorkRecord[]): Promise<{ created: number; updated: number }> {
    try {
      let created = 0
      let updated = 0

      // PostgreSQLのON CONFLICT構文を使用したupsert処理
      for (const wr of workRecords) {
        const userId = wr.userId!
        const data = {
          userId,
          taskId: wr.taskId,
          date: wr.startDate!,
          hours_worked: wr.manHours!,
          updatedAt: new Date()
        }

        // 既存レコードの確認
        const existing = await this.prisma.workRecord.findFirst({
          where: {
            userId,
            date: wr.startDate!,
            taskId: wr.taskId
          }
        })

        if (existing) {
          await this.prisma.workRecord.update({
            where: { id: existing.id },
            data: {
              hours_worked: wr.manHours!,
              updatedAt: new Date()
            }
          })
          updated++
        } else {
          await this.prisma.workRecord.create({
            data
          })
          created++
        }
      }

      return { created, updated }
    } catch (error) {
      console.error('Failed to bulk upsert work records:', error)
      throw new Error('作業実績の一括更新に失敗しました')
    }
  }

  async deleteByDateRange(userId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.prisma.workRecord.deleteMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      })
      return result.count
    } catch (error) {
      console.error('Failed to delete work records by date range:', error)
      throw new Error('作業実績の削除に失敗しました')
    }
  }

  async deleteByUserAndDateRange(userIds: string[], startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.prisma.workRecord.deleteMany({
        where: {
          userId: { in: userIds },
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      })
      return result.count
    } catch (error) {
      console.error('Failed to delete work records by user and date range:', error)
      throw new Error('作業実績の削除に失敗しました')
    }
  }

}