import { WorkRecord } from '@/domains/work-records/work-recoed'
import type { WorkRecordDetail } from '@/types/work-record'

export interface IWorkRecordRepository {
  findAll(): Promise<WorkRecordDetail[]>
  bulkCreate(workRecords: WorkRecord[]): Promise<void>
  bulkUpsert(workRecords: WorkRecord[]): Promise<{ created: number; updated: number }>
  deleteByUserAndDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date,
    wbsIds: number[]
  ): Promise<number>
}