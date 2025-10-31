import { WorkRecord } from '@/domains/work-records/work-recoed'

export interface IWorkRecordRepository {
  bulkCreate(workRecords: WorkRecord[]): Promise<void>
  bulkUpsert(workRecords: WorkRecord[]): Promise<{ created: number; updated: number }>
  deleteByUserAndDateRange(userIds: string[], startDate: Date, endDate: Date): Promise<number>
}