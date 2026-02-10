import prisma from "@/lib/prisma/prisma";
import { injectable} from 'inversify'
import { WorkRecord } from '@/domains/work-records/work-recoed'
import { IWorkRecordRepository } from '@/applications/work-record/repositories/iwork-record.repository'

@injectable()
export class WorkRecordPrismaRepository implements IWorkRecordRepository {
  constructor(
    // @inject(SYMBOL.PrismaClient) private prisma: PrismaClient
  ) { }

  async bulkCreate(workRecords: WorkRecord[]): Promise<void> {
    try {
      const data = workRecords.map(wr => ({
        userId: wr.userId!,
        taskId: wr.taskId,
        date: wr.startDate!,
        hours_worked: wr.manHours!
      }))

      // await prisma.workRecord.createMany({
      //   data,
      //   skipDuplicates: true
      // })
      for (const record of data) {
        await prisma.workRecord.create({
          data: record
        })
      }
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
        const existing = await prisma.workRecord.findFirst({
          where: {
            userId,
            date: wr.startDate!,
            taskId: wr.taskId
          }
        })

        if (existing) {
          await prisma.workRecord.update({
            where: { id: existing.id },
            data: {
              hours_worked: wr.manHours!,
              updatedAt: new Date()
            }
          })
          updated++
        } else {
          await prisma.workRecord.create({
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

  async deleteByUserAndDateRange(userIds: string[], startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await prisma.workRecord.deleteMany({
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